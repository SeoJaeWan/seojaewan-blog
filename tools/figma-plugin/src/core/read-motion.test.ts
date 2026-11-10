import { afterEach, describe, expect, it, vi } from 'vitest';

import { PATTERNS_PAGE_ID } from '../plugin-config';
import { listMotionSamples, readMotionSample } from './read-motion';

/** 피그마 노드를 흉내 낸 객체 */
type FakeNode = Record<string, unknown>;

/** 주석 카테고리 ID → 이름 */
const categories: Readonly<Record<string, string>> = {
  dev: 'Development',
  a11y: 'Accessibility',
  devKo: '개발',
  a11yKo: ' 접근성 ',
};

/**
 * `animations`에서 읽히는 불투명도 키프레임 노드를 만든다.
 * @param id 노드 ID
 * @param name 레이어 이름
 * @param children 자식
 * @param extra 더할 속성
 * @returns 가짜 노드
 */
function animatedNode(
  id: string,
  name: string,
  children: FakeNode[] = [],
  extra: FakeNode = {},
): FakeNode {
  const keyframes = [
    { timelinePosition: 0, value: { type: 'FLOAT', value: 0 } },
    { timelinePosition: 0.25, value: { type: 'FLOAT', value: 1 } },
  ];
  return withFind({
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
    ...extra,
  });
}

/**
 * 자식에 부모를 잇고 `findOne`을 붙인다.
 * @param node 가짜 노드
 * @returns 같은 노드
 */
function withFind(node: FakeNode): FakeNode {
  if (!('parent' in node)) {
    node.parent = null;
  }
  const children = (node.children ?? []) as FakeNode[];
  for (const child of children) {
    child.parent = node;
  }
  node.findOne = (match: (item: FakeNode) => boolean): FakeNode | null => {
    for (const child of children) {
      if (match(child)) {
        return child;
      }
      const find = child.findOne as ((m: typeof match) => FakeNode | null) | undefined;
      const found = find?.(match) ?? null;
      if (found !== null) {
        return found;
      }
    }
    return null;
  };
  return node;
}

/**
 * 슬롯 노드를 만든다. 피그마 SLOT에는 animations 속성이 없고 읽으면 오류가 난다.
 * @param id 노드 ID
 * @param children 자식
 * @returns 가짜 슬롯 노드
 */
function slotNode(id: string, children: FakeNode[]): FakeNode {
  const node: FakeNode = withFind({ id, name: 'slot', type: 'SLOT', visible: true, children });
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
 * 피그마 전역을 심는다. 노드 ID로 찾을 노드와 페이지, 주석 카테고리를 준다.
 * @param nodes ID → 노드
 * @param pages 페이지
 */
function stubFigma(nodes: FakeNode[], pages: FakeNode[] = []): void {
  vi.stubGlobal('figma', {
    root: { children: pages },
    getNodeByIdAsync: (id: string) => Promise.resolve(nodes.find((node) => node.id === id) ?? null),
    annotations: {
      getAnnotationCategoryByIdAsync: (id: string) =>
        Promise.resolve(categories[id] === undefined ? null : { label: categories[id] }),
    },
  });
}

/**
 * 옛 견본 프레임을 만든다.
 * @param children 견본 프레임의 자식
 * @returns 견본 프레임
 */
function legacySample(children: FakeNode[]): FakeNode {
  return withFind({
    id: '1:1',
    name: 'motion-sample',
    type: 'FRAME',
    parent: { type: 'FRAME', name: 'Foundations / Motion' },
    children,
    annotations: [{ label: '@repeat 1' }, { labelMarkdown: '@trigger open' }],
    playbackSettings: { autoplay: true, loop: true },
    timelines: [{ id: 't', duration: 0.25 }],
  });
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
 * 페이지를 만든다.
 * @param name 페이지 이름
 * @param nodes 페이지 안에서 찾아지는 노드(findAllWithCriteria)
 * @param children 페이지 바로 아래 노드
 * @param id 페이지 ID
 * @returns 가짜 페이지
 */
function page(name: string, nodes: FakeNode[], children: FakeNode[] = [], id = name): FakeNode {
  return {
    id,
    name,
    type: 'PAGE',
    children,
    loadAsync: () => Promise.resolve(),
    findAllWithCriteria: ({ types }: { types: string[] }) =>
      nodes.filter((node) => types.includes(node.type as string)),
  };
}

// @codocs [[디자인 기반:모션 견본]]
describe('모션 목록', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('Foundations / Motion 프레임 바로 아래의 motion- 견본 프레임을 찾는다', async () => {
    stubFigma(
      [],
      [
        page('01 · Foundations', [
          container('FRAME', 'Foundations / Motion', [
            { id: '1:1', type: 'FRAME', name: 'motion-window-open' },
            { id: '1:2', type: 'FRAME', name: '설명' },
            { id: '1:3', type: 'TEXT', name: 'motion-text' },
          ]),
          container('FRAME', 'Foundations / Assets', [
            { id: '2:1', type: 'FRAME', name: 'motion-other' },
          ]),
        ]),
      ],
    );
    expect(await listMotionSamples()).toEqual([
      { id: '1:1', name: 'motion-window-open', source: 'sample' },
    ]);
  });

  it('옛 Motion 섹션의 견본도 찾고, 이름이 Motion인 프레임은 묶음으로 보지 않는다', async () => {
    stubFigma(
      [],
      [
        page('01 · Foundations', [
          container('SECTION', 'Motion', [{ id: '3:1', type: 'FRAME', name: 'motion-menu-open' }]),
          container('FRAME', 'Motion', [{ id: '4:1', type: 'FRAME', name: 'motion-a' }]),
        ]),
      ],
    );
    expect(await listMotionSamples()).toEqual([
      { id: '3:1', name: 'motion-menu-open', source: 'sample' },
    ]);
  });

  it('조립 흐름 프레임(이름이 모션 클래스 이름이고 키프레임을 가진 최상위 프레임)을 섹션 안까지 찾는다', async () => {
    const instance = animatedNode('5:2', 'WindowFrame', [], { type: 'INSTANCE' });
    const flow = withFind({
      id: '5:1',
      type: 'FRAME',
      name: 'motion-window-open',
      children: [instance],
    });
    const still = withFind({ id: '5:3', type: 'FRAME', name: 'motion-still', children: [] });
    const other = withFind({
      id: '5:4',
      type: 'FRAME',
      name: 'Window open',
      children: [animatedNode('5:5', 'a')],
    });
    const section = { id: '5:9', type: 'SECTION', name: 'Window', children: [flow, still] };
    stubFigma([], [page('03 · Patterns', [], [section, other], PATTERNS_PAGE_ID)]);
    expect(await listMotionSamples()).toEqual([
      { id: '5:1', name: 'motion-window-open', source: 'flow' },
    ]);
  });

  it('키프레임을 정의한 원본 컴포넌트를 Development 주석의 이름으로 찾고, 같은 이름의 옛 견본은 뺀다', async () => {
    const shimmer = animatedNode('6:2', 'shimmer', [], { type: 'RECTANGLE' });
    const loading = withFind({
      id: '6:1',
      type: 'COMPONENT',
      name: 'State=Loading',
      parent: { type: 'COMPONENT_SET', name: 'Figure', annotations: [], parent: null },
      children: [shimmer],
      annotations: [{ label: '받는 동안 반짝인다\nmotion-image-skeleton', categoryId: 'dev' }],
    });
    const unnamed = withFind({
      id: '7:1',
      type: 'COMPONENT',
      name: 'Spinner',
      children: [animatedNode('7:2', 'dot', [], { type: 'ELLIPSE' })],
      annotations: [],
    });
    const plain = withFind({ id: '8:1', type: 'COMPONENT', name: 'Button', children: [] });
    stubFigma(
      [],
      [
        page('02 · Components', [loading, unnamed, plain]),
        page('01 · Foundations', [
          container('FRAME', 'Foundations / Motion', [
            { id: '1:1', type: 'FRAME', name: 'motion-image-skeleton' },
            { id: '1:2', type: 'FRAME', name: 'motion-window-open' },
          ]),
        ]),
      ],
    );
    expect(await listMotionSamples()).toEqual([
      { id: '6:1', name: 'motion-image-skeleton', source: 'component' },
      { id: '7:1', name: 'Spinner (이름 없음)', source: 'component' },
      { id: '1:2', name: 'motion-window-open', source: 'sample' },
    ]);
  });
});

// @codocs [[피그마 연동:모션]]
describe('모션 읽기', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('animations가 없는 슬롯 노드는 트랙이 없는 것으로 보고 안쪽 노드의 트랙을 읽는다', async () => {
    stubFigma([legacySample([slotNode('2:1', [animatedNode('2:2', 'list')])])]);
    const sample = await readMotionSample('1:1');
    expect(sample.problems).toEqual([]);
    expect(sample.tracks.map((track) => [track.path, track.property, track.nodeKind])).toEqual([
      ['slot / list', 'OPACITY', 'layer'],
    ]);
  });

  it('옛 견본은 주석의 @ 줄과 타임라인 길이를 읽고 Loop는 읽지 않는다', async () => {
    stubFigma([legacySample([animatedNode('3:1', 'box')])]);
    const sample = await readMotionSample('1:1');
    expect(sample.source).toBe('sample');
    expect(sample.annotations).toEqual(['@repeat 1', '@trigger open']);
    expect(sample.isLooping).toBeNull();
    expect(sample.lengthMs).toBe(250);
    expect(sample.tracks[0]?.keyframes.map((item) => item.time)).toEqual([0, 0.25]);
  });

  it('조립 흐름 프레임은 이름, 재생 설정 Loop, Development·Accessibility 주석을 읽는다', async () => {
    const window = animatedNode('5:2', 'WindowFrame', [], {
      annotations: [
        { label: '도착 위치는 작업 표시줄 버튼', categoryId: 'dev' },
        { label: '설명', categoryId: 'other' },
      ],
    });
    const flow = withFind({
      id: '5:1',
      type: 'FRAME',
      name: 'motion-window-minimize',
      parent: { type: 'PAGE' },
      children: [window],
      annotations: [{ label: '동작 줄이기에서 바로 바뀐다', categoryId: 'a11y' }],
      playbackSettings: { autoplay: true, loop: false },
      timelines: [{ id: 't', duration: 2 }],
    });
    stubFigma([flow]);
    const sample = await readMotionSample('5:1');
    expect(sample).toMatchObject({
      name: 'motion-window-minimize',
      source: 'flow',
      isLooping: false,
      annotations: [],
      lengthMs: 2000,
      notes: [
        { path: '', category: 'Accessibility', text: '동작 줄이기에서 바로 바뀐다' },
        { path: 'WindowFrame', category: 'Development', text: '도착 위치는 작업 표시줄 버튼' },
      ],
    });
  });

  it('원본 컴포넌트는 주석의 이름, description, Loop를 읽고 원본 안쪽 레이어의 트랙을 읽는다', async () => {
    const shimmer = animatedNode('6:2', 'shimmer', [], { type: 'RECTANGLE' });
    const loading = withFind({
      id: '6:1',
      type: 'COMPONENT',
      name: 'State=Loading',
      visible: true,
      parent: {
        type: 'COMPONENT_SET',
        name: 'Figure',
        description: '@direction alternate',
        parent: null,
      },
      description: '',
      children: [shimmer],
      annotations: [{ label: 'motion-image-skeleton', categoryId: 'dev' }],
      playbackSettings: { autoplay: true, loop: true },
      timelines: [{ id: 't', duration: 2 }],
    });
    stubFigma([loading]);
    const sample = await readMotionSample('6:1');
    expect(sample).toMatchObject({
      name: 'motion-image-skeleton',
      label: 'Figure / State=Loading',
      source: 'component',
      isLooping: true,
      description: '@direction alternate\n',
      notes: [{ path: '', category: 'Development', text: 'motion-image-skeleton' }],
    });
    expect(sample.tracks.map((track) => [track.path, track.node, track.nodeKind])).toEqual([
      ['State=Loading / shimmer', 'shimmer', 'layer'],
    ]);
  });

  it('한국어 화면의 카테고리 이름(개발·접근성)도 이름·주석으로 읽는다', async () => {
    const loading = withFind({
      id: '6:1',
      type: 'COMPONENT',
      name: 'State=Loading',
      visible: true,
      parent: { type: 'COMPONENT_SET', name: 'Figure', description: '', parent: null },
      description: '',
      children: [animatedNode('6:2', 'shimmer', [], { type: 'RECTANGLE' })],
      annotations: [
        { label: 'motion-image-skeleton', categoryId: 'devKo' },
        { label: '동작 줄이기에서도 돈다', categoryId: 'a11yKo' },
      ],
      playbackSettings: { autoplay: true, loop: true },
      timelines: [{ id: 't', duration: 2 }],
    });
    stubFigma([loading], [page('02 · Components', [loading])]);
    const sample = await readMotionSample('6:1');
    expect(sample.name).toBe('motion-image-skeleton');
    expect(sample.notes).toEqual([
      { path: '', category: 'Development', text: 'motion-image-skeleton' },
      { path: '', category: 'Accessibility', text: '동작 줄이기에서도 돈다' },
    ]);
    expect(await listMotionSamples()).toEqual([
      { id: '6:1', name: 'motion-image-skeleton', source: 'component' },
    ]);
  });
});
