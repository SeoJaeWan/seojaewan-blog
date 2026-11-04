import { afterEach, describe, expect, it, vi } from 'vitest';

import { listMotionSamples, readMotionSample } from './read-motion';

/** 피그마 노드를 흉내 낸 객체 */
type FakeNode = Record<string, unknown>;

/**
 * `animations`에서 읽히는 불투명도 키프레임 노드를 만든다.
 * @param id 노드 ID
 * @param name 레이어 이름
 * @param children 자식
 * @returns 가짜 노드
 */
function animatedNode(id: string, name: string, children: FakeNode[] = []): FakeNode {
  const keyframes = [
    { timelinePosition: 0, value: { type: 'FLOAT', value: 0 } },
    { timelinePosition: 0.25, value: { type: 'FLOAT', value: 1 } },
  ];
  return {
    id,
    name,
    type: 'FRAME',
    visible: true,
    children,
    animations: { OPACITY: { tracks: [{ keyframeOperation: 'SET', keyframes }] } },
    manualKeyframeTracks: {
      OPACITY: {
        keyframes: keyframes.map((item) => ({ ...item, easing: { type: 'EASE_OUT' } })),
      },
    },
  };
}

/**
 * 슬롯 노드를 만든다. 피그마 SLOT에는 animations 속성이 없고 읽으면 오류가 난다.
 * @param id 노드 ID
 * @param children 자식
 * @returns 가짜 슬롯 노드
 */
function slotNode(id: string, children: FakeNode[]): FakeNode {
  const node: FakeNode = { id, name: 'slot', type: 'SLOT', visible: true, children };
  return new Proxy(node, {
    get(target, key) {
      if (key === 'animations') {
        throw new TypeError("node.animations: no such property 'animations' on SLOT node");
      }
      return Reflect.get(target, key) as unknown;
    },
  });
}

/**
 * 견본 프레임을 피그마 전역에 심는다.
 * @param children 견본 프레임의 자식
 */
function stubSample(children: FakeNode[]): void {
  const frame = {
    id: '1:1',
    name: 'motion-sample',
    type: 'FRAME',
    children,
    annotations: [{ label: '@repeat 1' }, { labelMarkdown: '@trigger open' }],
    timelines: [{ id: 't', duration: 0.25 }],
  };
  vi.stubGlobal('figma', { getNodeByIdAsync: () => Promise.resolve(frame) });
}

/**
 * 묶음 노드(프레임 또는 섹션)를 만든다.
 * @param type 노드 종류
 * @param name 노드 이름
 * @param children 자식
 * @returns 가짜 묶음 노드
 */
function container(type: 'FRAME' | 'SECTION', name: string, children: FakeNode[]): FakeNode {
  return { id: `${name}-id`, type, name, children };
}

/**
 * 01 · Foundations 페이지를 피그마 전역에 심는다.
 * @param nodes 페이지 안에서 찾아지는 프레임·섹션
 */
function stubFoundationsPage(nodes: FakeNode[]): void {
  const page = {
    name: '01 · Foundations',
    loadAsync: () => Promise.resolve(),
    findAllWithCriteria: ({ types }: { types: string[] }) =>
      nodes.filter((node) => types.includes(node.type as string)),
  };
  vi.stubGlobal('figma', { root: { children: [page] } });
}

// @codocs [[디자인 기반:모션 견본]]
describe('모션 견본 목록', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('Foundations / Motion 프레임 바로 아래의 motion- 견본 프레임을 찾는다', async () => {
    stubFoundationsPage([
      container('FRAME', 'Foundations / Motion', [
        { id: '1:1', type: 'FRAME', name: 'motion-window-open' },
        { id: '1:2', type: 'FRAME', name: '설명' },
        { id: '1:3', type: 'TEXT', name: 'motion-text' },
      ]),
      container('FRAME', 'Foundations / Assets', [
        { id: '2:1', type: 'FRAME', name: 'motion-other' },
      ]),
    ]);
    expect(await listMotionSamples()).toEqual([{ id: '1:1', name: 'motion-window-open' }]);
  });

  it('옛 Motion 섹션의 견본도 찾는다', async () => {
    stubFoundationsPage([
      container('SECTION', 'Motion', [{ id: '3:1', type: 'FRAME', name: 'motion-menu-open' }]),
    ]);
    expect(await listMotionSamples()).toEqual([{ id: '3:1', name: 'motion-menu-open' }]);
  });

  it('이름이 Motion인 프레임이나 Foundations / Motion 섹션은 묶음으로 보지 않는다', async () => {
    stubFoundationsPage([
      container('FRAME', 'Motion', [{ id: '4:1', type: 'FRAME', name: 'motion-a' }]),
      container('SECTION', 'Foundations / Motion', [
        { id: '4:2', type: 'FRAME', name: 'motion-b' },
      ]),
    ]);
    expect(await listMotionSamples()).toEqual([]);
  });
});

// @codocs [[피그마 연동:모션]]
describe('모션 견본 읽기', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('animations가 없는 슬롯 노드는 트랙이 없는 것으로 보고 안쪽 노드의 트랙을 읽는다', async () => {
    stubSample([slotNode('2:1', [animatedNode('2:2', 'list')])]);
    const sample = await readMotionSample('1:1');
    expect(sample.problems).toEqual([]);
    expect(sample.tracks.map((track) => [track.path, track.property, track.nodeKind])).toEqual([
      ['slot / list', 'OPACITY', 'layer'],
    ]);
  });

  it('animations가 있는 노드는 그대로 읽는다', async () => {
    stubSample([animatedNode('3:1', 'box')]);
    const sample = await readMotionSample('1:1');
    expect(sample.tracks).toHaveLength(1);
    expect(sample.tracks[0]?.keyframes.map((item) => item.time)).toEqual([0, 0.25]);
  });

  it('견본 프레임의 주석과 타임라인 길이를 읽는다', async () => {
    stubSample([animatedNode('3:1', 'box')]);
    const sample = await readMotionSample('1:1');
    expect(sample.annotations).toEqual(['@repeat 1', '@trigger open']);
    expect(sample.lengthMs).toBe(250);
  });
});
