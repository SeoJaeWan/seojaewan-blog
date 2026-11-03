import { inflateRawSync } from 'node:zlib';

const END_OF_CENTRAL_DIRECTORY = 0x06054b50;
const CENTRAL_FILE_HEADER = 0x02014b50;
const LOCAL_FILE_HEADER = 0x04034b50;
const STORED = 0;
const DEFLATED = 8;
/** 끝 레코드(22바이트)와 주석(최대 65535바이트)을 찾는 범위 */
const END_SEARCH = 65_557;

/**
 * zip 파일의 항목을 읽는다. Playwright trace zip(저장·deflate, zip64 아님)만 읽으면 되므로
 * 중앙 디렉터리를 따라 이름과 내용을 꺼낸다.
 * @param data zip 파일 내용
 * @param pick 꺼낼 항목을 고른다. 없으면 모두
 * @returns 항목 이름 → 내용
 */
export function readZip(data: Buffer, pick?: (name: string) => boolean): Map<string, Buffer> {
  let end = -1;
  for (
    let offset = data.length - 22;
    offset >= Math.max(0, data.length - END_SEARCH);
    offset -= 1
  ) {
    if (data.readUInt32LE(offset) === END_OF_CENTRAL_DIRECTORY) {
      end = offset;
      break;
    }
  }
  if (end === -1) {
    throw new Error('zip 끝 레코드를 찾지 못했다');
  }
  const count = data.readUInt16LE(end + 10);
  let offset = data.readUInt32LE(end + 16);
  const entries = new Map<string, Buffer>();
  for (let index = 0; index < count; index += 1) {
    if (data.readUInt32LE(offset) !== CENTRAL_FILE_HEADER) {
      throw new Error('zip 중앙 디렉터리가 깨졌다');
    }
    const method = data.readUInt16LE(offset + 10);
    const compressedSize = data.readUInt32LE(offset + 20);
    const nameLength = data.readUInt16LE(offset + 28);
    const extraLength = data.readUInt16LE(offset + 30);
    const commentLength = data.readUInt16LE(offset + 32);
    const localOffset = data.readUInt32LE(offset + 42);
    const name = data.toString('utf8', offset + 46, offset + 46 + nameLength);
    offset += 46 + nameLength + extraLength + commentLength;
    if (pick !== undefined && !pick(name)) {
      continue;
    }
    if (data.readUInt32LE(localOffset) !== LOCAL_FILE_HEADER) {
      throw new Error(`zip 항목 머리가 깨졌다: ${name}`);
    }
    const start =
      localOffset + 30 + data.readUInt16LE(localOffset + 26) + data.readUInt16LE(localOffset + 28);
    const raw = data.subarray(start, start + compressedSize);
    if (method === STORED) {
      entries.set(name, Buffer.from(raw));
    } else if (method === DEFLATED) {
      entries.set(name, inflateRawSync(raw));
    } else {
      throw new Error(`읽을 수 없는 압축 방식 ${String(method)}: ${name}`);
    }
  }
  return entries;
}
