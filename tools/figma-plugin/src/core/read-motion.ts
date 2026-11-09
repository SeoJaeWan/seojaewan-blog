import { isComponentsPage } from '../component-pages';
import { MOTION_NAME_PATTERN } from '../motion-file';
import { PATTERNS_PAGE_ID } from '../plugin-config';
import { sourceLayerId } from './bindings';
import type {
  EasingData,
  KeyframeData,
  MotionNodeKind,
  MotionNote,
  MotionSampleData,
  MotionSource,
  MotionValue,
  MotionVariable,
  ReadProblem,
  TrackData,
} from './motion-data';
import { annotationData, annotationTexts, assetGroupOf, type NameCache } from './read-node';

// 피그마에서 움직임과 모션 변수를 motion-data.ts의 순수 데이터로 읽는다. 노드를 바꾸지 않는다(읽기 전용).
// 움직임은 움직임이 일어나는 자리(컴포넌트·자산 원본, 조립 흐름이 도착하는 프레임)에서 읽는다([[디자인 기반:모션 견본]]).
// 옛 견본 프레임(`Foundations / Motion`)은 그 자리로 옮기기 전까지 함께 읽는다.
// 플러그인과 피그마 MCP(use_figma) 양쪽에서 같은 코드가 실행된다.

/**
 * UI 목록에 보이는 움직임.
 * - name: 모션 클래스 이름. 이름을 정하지 못한 원본은 `<컴포넌트 이름> (이름 없음)`이다
 * - source: 읽은 자리
 */
export type MotionSampleSummary = { id: string; name: string; source: MotionSource };

/** 견본이 있는 페이지 이름에 든 글자(01 · Foundations) */
const FOUNDATIONS_PAGE_KEYWORD = 'Foundations';
/** 견본을 담는 프레임 이름 */
const MOTION_FRAME_NAME = 'Foundations / Motion';
/** 견본을 담던 옛 섹션 이름. 피그마 파일이 프레임으로 바뀌기 전까지 함께 받는다 */
const LEGACY_MOTION_SECTION_NAME = 'Motion';
/** 견본 프레임 이름 앞부분 */
const MOTION_SAMPLE_PREFIX = 'motion-';
/** 원본의 모션 이름을 적는 주석 카테고리 */
const NAME_NOTE_CATEGORY = 'Development';
/** json에 싣는 주석 카테고리(실행 중 값, 동작 줄이기에서 남김) */
const noteCategories: readonly string[] = ['Development', 'Accessibility'];
/** 모션 변수 이름 앞부분 */
const MOTION_VARIABLE_PREFIX = 'motion/';
// 피그마가 사용자 기능 플래그로 막은 API를 부르면 나오는 오류 문장이다.
const UNSUPPORTED_API_TEXT = 'is not a supported API';
// 원본을 거슬러 올라가는 최대 단계다(인스턴스 안 인스턴스).
const MAX_SOURCE_DEPTH = 8;
// 별칭을 따라가는 최대 단계다.
const MAX_ALIAS_DEPTH = 10;

/**
 * 움직임 목록을 문서 순서대로 찾는다. 같은 이름이면 새 자리(원본, 흐름)를 쓰고 옛 견본은 뺀다.
 * - 컴포넌트·자산 원본: 이름에 `Components`·`Foundations`가 든 페이지의 컴포넌트 가운데, 키프레임을 정의한 것
 * - 조립 흐름: 03 · Patterns 페이지(섹션 안 포함)의 최상위 프레임 가운데 이름이 모션 클래스 이름 꼴이고 키프레임을 가진 것
 * - 옛 견본: 01 · Foundations `Foundations / Motion` 프레임(옛 `Motion` 섹션도) 바로 아래 `motion-` 프레임
 * @codocs [[디자인 기반:모션 견본]]
 * @codocs [[피그마 연동:모션]]
 * @returns 움직임 목록
 */
export async function listMotionSamples(): Promise<MotionSampleSummary[]> {
  const legacy: MotionSampleSummary[] = [];
  const current: MotionSampleSummary[] = [];
  for (const page of figma.root.children) {
    const isFoundations = page.name.includes(FOUNDATIONS_PAGE_KEYWORD);
    const isPatterns = page.id === PATTERNS_PAGE_ID;
    if (!isFoundations && !isPatterns && !isComponentsPage(page.name)) {
      continue;
    }
    await page.loadAsync();
    if (isFoundations) {
      legacy.push(...legacySamples(page));
    }
    try {
      current.push(...(isPatterns ? flowFrames(page) : await originalComponents(page)));
    } catch (error) {
      // 모션 API를 쓸 수 없는 계정은 키프레임을 읽지 못해 옛 견본만 보인다(내보낼 때 다시 알린다).
      if (!isMotionApiError(error)) {
        throw error;
      }
    }
  }
  const names = new Set(current.map((item) => item.name));
  return [...current, ...legacy.filter((item) => !names.has(item.name))];
}

/**
 * 옛 견본 프레임을 찾는다.
 * @codocs [[디자인 기반:모션 견본]]
 * @param page 01 · Foundations 페이지
 * @returns 견본 목록
 */
function legacySamples(page: PageNode): MotionSampleSummary[] {
  const samples: MotionSampleSummary[] = [];
  for (const container of page.findAllWithCriteria({ types: ['FRAME', 'SECTION'] })) {
    if (!isMotionContainer(container)) {
      continue;
    }
    for (const child of container.children) {
      if (child.type === 'FRAME' && child.name.startsWith(MOTION_SAMPLE_PREFIX)) {
        samples.push({ id: child.id, name: child.name, source: 'sample' });
      }
    }
  }
  return samples;
}

/**
 * 조립 흐름 프레임을 찾는다. 페이지와 섹션 바로 아래 프레임이 타임라인 하나(재생 설정 Loop 하나)다.
 * @codocs [[디자인 기반:모션 견본]]
 * @param page 03 · Patterns 페이지
 * @returns 흐름 프레임 목록
 */
function flowFrames(page: PageNode): MotionSampleSummary[] {
  const result: MotionSampleSummary[] = [];
  /**
   * 페이지·섹션의 자식에서 흐름 프레임을 찾는다.
   * @param parent 페이지나 섹션
   */
  function walk(parent: PageNode | SectionNode): void {
    for (const child of parent.children) {
      if (child.type === 'SECTION') {
        walk(child);
      } else if (
        child.type === 'FRAME' &&
        MOTION_NAME_PATTERN.test(child.name) &&
        child.findOne(hasOwnKeyframes) !== null
      ) {
        result.push({ id: child.id, name: child.name, source: 'flow' });
      }
    }
  }
  walk(page);
  return result;
}

/**
 * 키프레임을 정의한 컴포넌트·자산 원본을 찾는다. 원본 키프레임은 모든 인스턴스로 이어지므로, 인스턴스 안쪽 레이어의
 * 키프레임은 원본에서 이어진 것이라 보지 않는다. 컴포넌트 세트는 변형마다 타임라인이 있어 변형 하나가 움직임 하나다.
 * @codocs [[디자인 기반:모션 견본]]
 * @param page 컴포넌트·Foundations 페이지
 * @returns 원본 목록
 */
async function originalComponents(page: PageNode): Promise<MotionSampleSummary[]> {
  const result: MotionSampleSummary[] = [];
  const names: NameCache = new Map();
  for (const component of page.findAllWithCriteria({ types: ['COMPONENT'] })) {
    if (isInsideInstance(component) || !hasOriginalKeyframes(component)) {
      continue;
    }
    const name = await originalMotionName(component, names);
    result.push({
      id: component.id,
      name: name ?? `${componentLabel(component)} (이름 없음)`,
      source: 'component',
    });
  }
  return result;
}

/**
 * 원본 컴포넌트(변형)나 그 세트의 Development 주석에서 모션 클래스 이름(`motion-…` 한 줄)을 찾는다.
 * @codocs [[피그마 연동:모션]]
 * @param component 원본 컴포넌트
 * @param names 이름 캐시
 * @returns 모션 이름, 없으면 null
 */
async function originalMotionName(
  component: ComponentNode,
  names: NameCache,
): Promise<string | null> {
  const owners: BaseNode[] = [component];
  if (component.parent?.type === 'COMPONENT_SET') {
    owners.push(component.parent);
  }
  for (const owner of owners) {
    for (const note of await annotationData(owner, names)) {
      if (note.category !== NAME_NOTE_CATEGORY) {
        continue;
      }
      const line = note.text
        .split(/\r?\n/u)
        .map((item) => item.trim())
        .find((item) => MOTION_NAME_PATTERN.test(item));
      if (line !== undefined) {
        return line;
      }
    }
  }
  return null;
}

/**
 * 메시지에 쓰는 원본 이름을 만든다. 세트의 변형은 `세트 / 변형`이다.
 * @param component 원본 컴포넌트
 * @returns 이름
 */
function componentLabel(component: ComponentNode): string {
  return component.parent?.type === 'COMPONENT_SET'
    ? `${component.parent.name} / ${component.name}`
    : component.name;
}

/**
 * 노드가 인스턴스 안에 있는지 본다.
 * @param node 노드
 * @returns 인스턴스 안이면 true
 */
function isInsideInstance(node: BaseNode): boolean {
  for (let current = node.parent; current !== null; current = current.parent) {
    if (current.type === 'INSTANCE') {
      return true;
    }
  }
  return false;
}

/**
 * 컴포넌트 자신이나 안쪽 레이어(인스턴스 안쪽 제외, 놓은 인스턴스 자신은 포함)가 키프레임을 정의했는지 본다.
 * @param component 컴포넌트
 * @returns 정의했으면 true
 */
function hasOriginalKeyframes(component: ComponentNode): boolean {
  return (
    hasOwnKeyframes(component) ||
    component.findOne((node) => !isInsideInstance(node) && hasOwnKeyframes(node)) !== null
  );
}

/**
 * 노드가 자기 키프레임(`manualKeyframeTracks`)을 가졌는지 본다.
 * @param node 노드
 * @returns 키프레임이 하나라도 있으면 true
 */
function hasOwnKeyframes(node: BaseNode): boolean {
  return 'manualKeyframeTracks' in node && containsKeyframes(node.manualKeyframeTracks);
}

/**
 * 수동 키프레임 객체 안에 키프레임이 있는지 찾는다(칠·효과 안쪽 포함).
 * @param value 객체
 * @returns 있으면 true
 */
function containsKeyframes(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const keyframes: unknown = Reflect.get(value, 'keyframes');
  if (Array.isArray(keyframes)) {
    return keyframes.length > 0;
  }
  return Object.keys(value).some((key) => containsKeyframes(Reflect.get(value, key)));
}

/**
 * 견본을 담는 묶음인지 본다. 새 구조는 `Foundations / Motion` 프레임, 옛 구조는 `Motion` 섹션이다.
 * @codocs [[디자인 기반:모션 견본]]
 * @param node 프레임 또는 섹션
 * @returns 견본 묶음이면 true
 */
function isMotionContainer(node: BaseNode): boolean {
  return node.type === 'FRAME'
    ? node.name === MOTION_FRAME_NAME
    : node.type === 'SECTION' && node.name === LEGACY_MOTION_SECTION_NAME;
}

/**
 * 오류가 모션 API를 쓸 수 없는 계정(사용자 기능 플래그)에서 난 것인지 본다.
 * @param error 잡은 오류
 * @returns 모션 API를 쓸 수 없어서 난 오류면 true
 */
export function isMotionApiError(error: unknown): boolean {
  return error instanceof Error && error.message.includes(UNSUPPORTED_API_TEXT);
}

/**
 * 모션 API를 쓸 수 있는지 견본 하나의 타임라인을 읽어 본다.
 * @param sampleId 견본 노드 ID
 * @returns 쓸 수 있으면 true
 */
export async function isMotionApiAvailable(sampleId: string): Promise<boolean> {
  const node = await figma.getNodeByIdAsync(sampleId);
  if (node === null || (node.type !== 'FRAME' && node.type !== 'COMPONENT')) {
    return true;
  }
  try {
    return Array.isArray(node.timelines);
  } catch (error) {
    if (isMotionApiError(error)) {
      return false;
    }
    throw error;
  }
}

/**
 * `motion/*` 로컬 변수를 읽는다. FLOAT 변수는 컬렉션 기본 모드 값을 별칭까지 풀어 둔다.
 * @codocs [[피그마 연동:모션]]
 * @returns 모션 변수
 */
export async function readMotionVariables(): Promise<MotionVariable[]> {
  const collections = new Map(
    (await figma.variables.getLocalVariableCollectionsAsync()).map((collection) => [
      collection.id,
      collection,
    ]),
  );
  const result: MotionVariable[] = [];
  for (const variable of await figma.variables.getLocalVariablesAsync()) {
    if (!variable.name.startsWith(MOTION_VARIABLE_PREFIX)) {
      continue;
    }
    result.push({
      name: variable.name,
      resolvedType: variable.resolvedType,
      value:
        variable.resolvedType === 'FLOAT' ? await defaultFloatValue(variable, collections) : null,
      curve: easingCurve(variable, collections),
    });
  }
  return result.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
}

/**
 * EASING 변수의 기본 모드 곡선을 읽는다.
 * @param variable 변수
 * @param collections 컬렉션 ID → 컬렉션
 * @returns 곡선 네 점, EASING이 아니거나 곡선이 없으면 null
 */
function easingCurve(
  variable: Variable,
  collections: ReadonlyMap<string, VariableCollection>,
): number[] | null {
  if (variable.resolvedType !== 'EASING') {
    return null;
  }
  const modeId = collections.get(variable.variableCollectionId)?.defaultModeId;
  const value = modeId === undefined ? undefined : variable.valuesByMode[modeId];
  if (typeof value !== 'object' || !('type' in value)) {
    return null;
  }
  if (value.type === 'LINEAR') {
    return [0, 0, 1, 1];
  }
  const curve = 'easingFunctionCubicBezier' in value ? value.easingFunctionCubicBezier : undefined;
  return curve === undefined ? null : [curve.x1, curve.y1, curve.x2, curve.y2];
}

/**
 * 움직임 하나(옛 견본 프레임, 조립 흐름 프레임, 컴포넌트·자산 원본)에서 키프레임이 걸린 노드를 찾아 트랙을 읽는다.
 * 실제로 재생되는 키프레임(`animations`, 인스턴스 안쪽 레이어로 원본에서 이어진 것 포함)의 시간·값을 쓰고,
 * 이징의 변수 연결은 키프레임을 정의한 노드(자신, 원본 컴포넌트, 원본 레이어)의 `manualKeyframeTracks`에서 읽는다.
 * `animations`에서는 이징이 풀린 곡선으로 나오기 때문이다. 숨긴 노드는 재생되지 않아 읽지 않는다.
 * 반복은 재생 설정 Loop로 읽는다. 옛 견본은 Loop가 모두 기본값(켜짐)이라 주석의 `@repeat`로 읽는다.
 * @codocs [[피그마 연동:모션]]
 * @codocs [[디자인 기반:모션 견본]]
 * @param sampleId 움직임 자리 노드 ID(프레임이나 컴포넌트)
 * @returns 움직임 데이터
 */
export async function readMotionSample(sampleId: string): Promise<MotionSampleData> {
  const root = await figma.getNodeByIdAsync(sampleId);
  if (root === null || (root.type !== 'FRAME' && root.type !== 'COMPONENT')) {
    throw new Error(`움직임 자리 ${sampleId}를 찾을 수 없다.`);
  }
  const names: NameCache = new Map();
  const source = motionSource(root);
  const sample: MotionSampleData = {
    name: root.type === 'COMPONENT' ? await originalMotionName(root, names) : root.name,
    label: root.type === 'COMPONENT' ? componentLabel(root) : root.name,
    source,
    nodeId: root.id,
    tracks: [],
    problems: [],
    annotations: source === 'sample' ? annotationTexts(root) : [],
    notes: [],
    description: root.type === 'COMPONENT' ? componentDescription(root) : '',
    isLooping: source === 'sample' ? null : loopOf(root),
    lengthMs: timelineLength(root),
  };
  await collectNotes(root, '', sample, names);
  if (root.type === 'COMPONENT') {
    await readTracks(root, root.name, sample, names);
  } else {
    for (const child of root.children) {
      await readTracks(child, child.name, sample, names);
    }
  }
  return sample;
}

/**
 * 움직임 자리의 종류를 정한다.
 * @param root 프레임이나 컴포넌트
 * @returns 컴포넌트는 원본, 견본 묶음 바로 아래 프레임은 옛 견본, 나머지 프레임은 조립 흐름
 */
function motionSource(root: FrameNode | ComponentNode): MotionSource {
  if (root.type === 'COMPONENT') {
    return 'component';
  }
  return root.parent !== null && isMotionContainer(root.parent) ? 'sample' : 'flow';
}

/**
 * 원본 컴포넌트의 description을 읽는다. 세트의 변형은 세트와 변형의 description을 잇는다.
 * @param component 원본 컴포넌트
 * @returns description
 */
function componentDescription(component: ComponentNode): string {
  return component.parent?.type === 'COMPONENT_SET'
    ? [component.parent.description, component.description].join('\n')
    : component.description;
}

/**
 * 재생 설정 Loop를 읽는다. 켜면 무한 반복, 끄면 한 번이다. `playbackSettings`는 플러그인 타입 정의에 없어 값의 꼴을 확인한다.
 * @codocs [[피그마 연동:구조 검사]]
 * @param node 움직임을 담은 프레임이나 컴포넌트
 * @returns Loop, 읽지 못하면 null
 */
function loopOf(node: BaseNode): boolean | null {
  const settings: unknown = Reflect.get(node, 'playbackSettings');
  if (typeof settings !== 'object' || settings === null) {
    return null;
  }
  const loop: unknown = Reflect.get(settings, 'loop');
  return typeof loop === 'boolean' ? loop : null;
}

/**
 * 타임라인 길이를 읽는다. 자리 안 컴포넌트의 트랙이 더 길면 이 길이에서 잘려 재생된다.
 * @codocs [[피그마 연동:모션]]
 * @param node 움직임을 담은 프레임이나 컴포넌트
 * @returns 길이(ms), 읽지 못했으면 null
 */
function timelineLength(node: FrameNode | ComponentNode): number | null {
  const [timeline] = node.timelines;
  return timeline === undefined ? null : timeline.duration * 1000;
}

/**
 * 노드의 Development·Accessibility 주석을 움직임 데이터에 더한다.
 * @codocs [[피그마 연동:모션]]
 * @param node 노드
 * @param path 움직임 기준 레이어 경로
 * @param sample 주석을 더할 움직임 데이터
 * @param names 이름 캐시
 */
async function collectNotes(
  node: BaseNode,
  path: string,
  sample: MotionSampleData,
  names: NameCache,
): Promise<void> {
  for (const note of await annotationData(node, names)) {
    if (note.category !== null && noteCategories.includes(note.category)) {
      const item: MotionNote = { path, category: note.category, text: note.text };
      sample.notes.push(item);
    }
  }
}

/**
 * 노드 하나의 트랙과 주석을 읽고 보이는 자식으로 내려간다. 컴포넌트 원본은 원본 루트도 읽는다.
 * @param node 노드
 * @param path 움직임 기준 레이어 경로
 * @param sample 트랙과 문제를 더할 움직임 데이터
 * @param names 이름 캐시
 */
async function readTracks(
  node: SceneNode,
  path: string,
  sample: MotionSampleData,
  names: NameCache,
): Promise<void> {
  if (!node.visible) {
    return;
  }
  if (node.id !== sample.nodeId) {
    await collectNotes(node, path, sample, names);
  }
  // 슬롯(SLOT) 노드처럼 animations 속성이 없는 노드는 트랙이 없는 것으로 보고 자식으로만 내려간다.
  const fields = 'animations' in node ? animatedFields(node.animations) : [];
  if (fields.length > 0) {
    const identity = await nodeIdentity(node);
    for (const field of fields) {
      const label = `${path} / ${field.property}`;
      if (field.binding === null) {
        sample.problems.push({
          path: label,
          nodeId: node.id,
          reason: '컴포넌트 속성에 묶인 칠·효과 키프레임은 내보낼 수 없다',
          fix: '키프레임을 칠·효과 항목에 직접 건다.',
        });
        continue;
      }
      const manual = await manualBinding(node, field.keys);
      for (const track of field.binding.tracks) {
        if (track.keyframes.length === 0) {
          continue;
        }
        const data: TrackData = {
          ...identity,
          nodeId: node.id,
          path,
          property: field.property,
          operation: track.keyframeOperation,
          keyframes: await keyframesOf(
            track.keyframes,
            manual,
            { path: label, nodeId: node.id },
            sample.problems,
          ),
        };
        sample.tracks.push(data);
      }
    }
  }
  if ('children' in node) {
    for (const child of node.children) {
      await readTracks(child, `${path} / ${child.name}`, sample, names);
    }
  }
}

/**
 * 키프레임이 걸린 항목 하나.
 * - keys: `manualKeyframeTracks`에서 같은 항목을 찾는 키 경로(`['fills', '0']`)
 * - property: 항목 이름(`ROTATION`, `fills[0]`, `effects[0].RADIUS`)
 * - binding: 키프레임. 컴포넌트 속성에 묶인 칠·효과처럼 읽을 수 없으면 null
 */
type AnimatedField = {
  keys: string[];
  property: string;
  binding: KeyframeBinding | null;
};

/**
 * `animations`에서 키프레임이 있는 항목을 모은다. 칠·선은 칠 순서, 효과는 효과 순서와 항목으로 나뉜다.
 * @param animations 노드의 animations
 * @returns 키프레임이 있는 항목
 */
function animatedFields(animations: Animations): AnimatedField[] {
  const fields: AnimatedField[] = [];
  for (const [key, value] of entriesOf(animations)) {
    if (key === 'fills' || key === 'strokes' || key === 'effects') {
      for (const [index, item] of entriesOf(value)) {
        if (isKeyframeBinding(item)) {
          fields.push({ keys: [key, index], property: `${key}[${index}]`, binding: item });
          continue;
        }
        for (const [name, nested] of entriesOf(item)) {
          if (name === 'properties') {
            fields.push({ keys: [key, index, name], property: `${key}[${index}]`, binding: null });
          } else if (isKeyframeBinding(nested)) {
            fields.push({
              keys: [key, index, name],
              property: `${key}[${index}].${name}`,
              binding: nested,
            });
          }
        }
      }
      continue;
    }
    if (isKeyframeBinding(value)) {
      fields.push({ keys: [key], property: key, binding: value });
    }
  }
  return fields.filter(
    (field) =>
      field.binding === null || field.binding.tracks.some((track) => track.keyframes.length > 0),
  );
}

/**
 * 재생되는 키프레임을 순수 데이터로 옮긴다. 이징은 정의한 노드의 같은 키프레임(같은 순서, 아니면 같은 시간)에서 읽는다.
 * @param keyframes 재생되는 키프레임
 * @param manual 정의한 노드의 키프레임. 찾지 못했으면 null
 * @param at 문제 위치(견본 기준 경로와 항목, 노드 ID)
 * @param problems 문제 목록
 * @returns 시간순 키프레임
 */
async function keyframesOf(
  keyframes: readonly ManualKeyframe[],
  manual: ManualKeyframeBinding | null,
  at: Pick<ReadProblem, 'path' | 'nodeId'>,
  problems: ReadProblem[],
): Promise<KeyframeData[]> {
  const sorted = [...keyframes].sort((a, b) => a.timelinePosition - b.timelinePosition);
  const defined =
    manual === null
      ? []
      : [...manual.keyframes].sort((a, b) => a.timelinePosition - b.timelinePosition);
  const result: KeyframeData[] = [];
  for (const [index, keyframe] of sorted.entries()) {
    const value = motionValue(keyframe.value);
    if (value === null) {
      problems.push({
        ...at,
        reason: `${keyframe.value.type} 값 키프레임은 내보낼 수 없다`,
        fix: '숫자·벡터·색 항목의 키프레임만 쓴다.',
      });
      continue;
    }
    const source =
      defined.length === sorted.length
        ? defined[index]
        : defined.find((item) => item.timelinePosition === keyframe.timelinePosition);
    result.push({
      time: keyframe.timelinePosition,
      value,
      easing: source === undefined ? { kind: 'unknown' } : await easingData(source.easing),
    });
  }
  return result;
}

/**
 * 키프레임 이징을 읽는다. 변수에 연결했으면 변수 이름과 종류를 찾는다.
 * @param easing 정의한 노드의 키프레임 이징
 * @returns 이징 데이터
 */
async function easingData(easing: MotionEasing | VariableAlias): Promise<EasingData> {
  if (easing.type === 'VARIABLE_ALIAS') {
    const variable = await figma.variables.getVariableByIdAsync(easing.id);
    return variable === null
      ? { kind: 'missing-variable', id: easing.id }
      : { kind: 'variable', name: variable.name, resolvedType: variable.resolvedType };
  }
  const curve = easing.easingFunctionCubicBezier;
  return {
    kind: 'unbound',
    description:
      curve === undefined
        ? easing.type
        : `${easing.type} ${String(curve.x1)}, ${String(curve.y1)}, ${String(curve.x2)}, ${String(curve.y2)}`,
  };
}

/**
 * 키프레임을 정의한 노드의 수동 키프레임을 찾는다. 자신에게 없으면 인스턴스의 원본 컴포넌트,
 * 인스턴스 안쪽 레이어면 원본 컴포넌트 안의 같은 레이어로 거슬러 올라간다.
 * @param node 키프레임이 재생되는 노드
 * @param keys 항목 키 경로
 * @returns 수동 키프레임, 찾지 못했으면 null
 */
async function manualBinding(
  node: SceneNode,
  keys: readonly string[],
): Promise<ManualKeyframeBinding | null> {
  let current: BaseNode | null = node;
  for (let depth = 0; depth < MAX_SOURCE_DEPTH && current !== null; depth += 1) {
    if ('manualKeyframeTracks' in current) {
      const found = lookup(current.manualKeyframeTracks, keys);
      if (found !== null) {
        return found;
      }
    }
    current = await sourceNode(current);
  }
  return null;
}

/**
 * 키프레임을 물려준 노드를 찾는다. 인스턴스는 원본 컴포넌트, 인스턴스 안쪽 레이어는 원본 레이어다.
 * @param node 노드
 * @returns 원본 노드, 없으면 null
 */
async function sourceNode(node: BaseNode): Promise<BaseNode | null> {
  if (node.type === 'INSTANCE') {
    return node.getMainComponentAsync();
  }
  const sourceId = sourceLayerId(node.id);
  return sourceId === null ? null : figma.getNodeByIdAsync(sourceId);
}

/**
 * 수동 키프레임 객체에서 키 경로의 키프레임을 꺼낸다.
 * @param tracks manualKeyframeTracks
 * @param keys 키 경로
 * @returns 키프레임이 있는 항목, 없으면 null
 */
function lookup(
  tracks: ManualKeyframeTracks,
  keys: readonly string[],
): ManualKeyframeBinding | null {
  let value: unknown = tracks;
  for (const key of keys) {
    if (typeof value !== 'object' || value === null) {
      return null;
    }
    value = Reflect.get(value, key);
  }
  return isManualBinding(value) && value.keyframes.length > 0 ? value : null;
}

/**
 * 키프레임이 걸린 노드의 이름과 종류를 정한다. 인스턴스면 컴포넌트(세트) 이름, 원본이 자산이면 자산 이름이다.
 * 컴포넌트 원본 루트 자신에 건 키프레임도 같은 규칙으로 컴포넌트(세트)·자산 이름이다.
 * @codocs [[피그마 연동:모션]]
 * @param node 노드
 * @returns 노드 이름과 종류
 */
async function nodeIdentity(node: SceneNode): Promise<{ node: string; nodeKind: MotionNodeKind }> {
  if (node.type === 'COMPONENT') {
    if (assetGroupOf(node) !== null) {
      return { node: node.name, nodeKind: 'asset' };
    }
    return {
      node: node.parent?.type === 'COMPONENT_SET' ? node.parent.name : node.name,
      nodeKind: 'component',
    };
  }
  if (node.type !== 'INSTANCE') {
    return { node: node.name, nodeKind: 'layer' };
  }
  const main = await node.getMainComponentAsync();
  if (main === null) {
    return { node: node.name, nodeKind: 'layer' };
  }
  if (assetGroupOf(main) !== null) {
    return { node: main.name, nodeKind: 'asset' };
  }
  return {
    node: main.parent?.type === 'COMPONENT_SET' ? main.parent.name : main.name,
    nodeKind: 'component',
  };
}

/**
 * 키프레임 값을 순수 데이터로 옮긴다.
 * @param value 피그마 키프레임 값
 * @returns 값, 옮길 수 없으면 null
 */
function motionValue(value: KeyframeValue): MotionValue | null {
  switch (value.type) {
    case 'FLOAT':
    case 'BOOL':
    case 'TEXT_DATA':
      return value.value;
    case 'VECTOR':
      return { x: value.value.x, y: value.value.y };
    case 'COLOR':
      return { r: value.value.r, g: value.value.g, b: value.value.b, a: value.value.a };
    case 'CIRCLE':
    case 'LINE':
    case 'CIRCLE_POINT':
      return { ...value.value };
    default:
      return null;
  }
}

/**
 * FLOAT 변수의 기본 모드 값을 별칭까지 풀어 읽는다. 모션 변수와 크기 변수(구조 검사)가 함께 쓴다.
 * @param variable 변수
 * @param collections 컬렉션 ID → 컬렉션
 * @returns 값, 풀지 못하면 null
 */
export async function defaultFloatValue(
  variable: Variable,
  collections: ReadonlyMap<string, VariableCollection>,
): Promise<number | null> {
  let current: Variable | null = variable;
  for (let depth = 0; depth < MAX_ALIAS_DEPTH && current !== null; depth += 1) {
    const collection = collections.get(current.variableCollectionId);
    const modeId = collection?.defaultModeId ?? Object.keys(current.valuesByMode)[0];
    const value = modeId === undefined ? undefined : current.valuesByMode[modeId];
    if (typeof value === 'number') {
      return value;
    }
    if (typeof value !== 'object' || !('type' in value) || value.type !== 'VARIABLE_ALIAS') {
      return null;
    }
    current = await figma.variables.getVariableByIdAsync(value.id);
  }
  return null;
}

/**
 * 객체의 값이 있는 항목을 꺼낸다. 객체가 아니면 비어 있다.
 * @param value 객체
 * @returns `[키, 값]` 목록(값이 undefined인 항목 제외)
 */
function entriesOf(value: unknown): [string, unknown][] {
  if (typeof value !== 'object' || value === null) {
    return [];
  }
  return Object.keys(value)
    .map((key): [string, unknown] => [key, Reflect.get(value, key)])
    .filter(([, item]) => item !== undefined);
}

/**
 * 값이 재생되는 키프레임 묶음인지 확인한다.
 * @param value 확인할 값
 * @returns KeyframeBinding이면 true
 */
function isKeyframeBinding(value: unknown): value is KeyframeBinding {
  return typeof value === 'object' && value !== null && Array.isArray(Reflect.get(value, 'tracks'));
}

/**
 * 값이 수동 키프레임 묶음인지 확인한다.
 * @param value 확인할 값
 * @returns ManualKeyframeBinding이면 true
 */
function isManualBinding(value: unknown): value is ManualKeyframeBinding {
  return (
    typeof value === 'object' && value !== null && Array.isArray(Reflect.get(value, 'keyframes'))
  );
}
