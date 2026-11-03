import { deflateRawSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';

import { pickFrames, readTraceTimeline } from './trace-film.ts';
import { readZip } from './zip.ts';

/**
 * trace 이벤트를 JSON 줄로 쓴다.
 * @param events 이벤트
 * @returns trace 파일 내용
 */
function lines(events: object[]): string {
  return events.map((event) => JSON.stringify(event)).join('\n');
}

/**
 * zip 파일 하나를 만든다(항목마다 deflate).
 * @param entries 이름 → 내용
 * @returns zip 내용
 */
function makeZip(entries: Record<string, string>): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const [name, text] of Object.entries(entries)) {
    const nameBytes = Buffer.from(name);
    const data = deflateRawSync(Buffer.from(text));
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(8, 8);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt16LE(nameBytes.length, 26);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(8, 10);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt16LE(nameBytes.length, 28);
    central.writeUInt32LE(offset, 42);
    locals.push(local, nameBytes, data);
    centrals.push(central, nameBytes);
    offset += 30 + nameBytes.length + data.length;
  }
  const directory = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(Object.keys(entries).length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, directory, end]);
}

const frames = [100, 200, 300, 400, 500, 600].map((timestamp) => ({
  type: 'screencast-frame',
  file: `screencast/f-${String(timestamp)}.jpeg`,
  timestamp,
}));

// @codocs [[테스트 작성 규칙:E2E]]
describe('실행 화면 필름 띠', () => {
  it('trace zip에서 trace 파일을 꺼내 화면 프레임, 시작 시각, 처음 오류 시각을 읽는다', () => {
    const zip = makeZip({
      'test.trace': lines([
        { type: 'before', callId: 'a', startTime: 50 },
        { type: 'after', callId: 'b', endTime: 450, error: { message: '못 찾음' } },
      ]),
      '1-trace.trace': lines([
        ...frames,
        { type: 'after', callId: 'c', endTime: 520, error: { message: '나중 오류' } },
      ]),
      'screencast/f-100.jpeg': 'jpeg',
    });
    const traces = readZip(zip, (name) => name.endsWith('.trace'));
    expect([...traces.keys()]).toEqual(['test.trace', '1-trace.trace']);
    const timeline = readTraceTimeline([...traces.values()].map((data) => data.toString('utf8')));
    expect(timeline).toMatchObject({ start: 50, failAt: 450 });
    expect(timeline.frames).toHaveLength(6);
  });

  it('통과하면 처음부터 끝까지 고르게 고른다', () => {
    const picked = pickFrames(readTraceTimeline([lines(frames)]), 3);
    expect(picked.map((frame) => [frame.timestamp, frame.failed])).toEqual([
      [100, false],
      [400, false],
      [600, false],
    ]);
  });

  it('실패하면 실패 지점 직전 프레임까지 고르고 마지막 장을 실패 지점으로 표시한다', () => {
    const timeline = readTraceTimeline([
      lines([...frames, { type: 'after', endTime: 450, error: { message: 'x' } }]),
    ]);
    const picked = pickFrames(timeline, 4);
    expect(picked.map((frame) => [frame.timestamp, frame.failed])).toEqual([
      [100, false],
      [200, false],
      [300, false],
      [400, true],
    ]);
  });

  it('프레임이 없으면 고르지 않는다', () => {
    expect(pickFrames(readTraceTimeline(['']), 4)).toEqual([]);
  });
});
