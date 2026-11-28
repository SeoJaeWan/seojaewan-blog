import type { LayerPairTable } from '../figma-export/component-layout';
import type { LayerKey } from '../figma-export/layer-key';

// 생성기가 컴포넌트마다 내는 검증 안내(`<이름>.layers.gen.ts`)의 꼴이다. 스토리 테스트의 생성 결과 검증만 읽는다.
// 생성 스크립트(Node가 바로 실행)도 이 꼴로 쓰므로 타입만 둔다.

/** CDP `CSS.forcePseudoState`로 켤 수 있는 의사 클래스 */
export type ForcedPseudoClass = 'hover' | 'active' | 'focus' | 'focus-visible' | 'focus-within';

/**
 * 생성한 스토리 하나를 검증하는 법.
 * - variant: 이 스토리가 그리는 피그마 변형 이름(`VariantSchema.name`). 검증 자료의 변형과 이 이름으로 짝짓는다
 * - forcedStates: 브라우저에 강제로 켤 상태. 선택자는 스토리 루트 기준이다
 * - forcedAttributes: 동작이 스스로 붙이는 상태 속성(aria, data)이라 스토리가 켤 수 없는 것. 테스트가 그 요소에 붙인다
 * - motion: 켤 `data-motion` 값. 움직임 변형이 아니면 null
 * - ignored: 견주지 않는 레이어의 값. 자리·크기는 실행 중에 동작이 덮는 값이다. look(칠·선·모서리·그림자)은
 *   `motion` 레이어를 루트와 한 요소로 합쳐 그 요소의 모습을 다른 쪽 레이어에서 가져왔을 때다
 * @codocs [[디자인 시스템:생성 결과 검증]]
 * @codocs [[디자인 시스템:스토리 규칙]]
 */
export type ParityStory = {
  variant: string;
  forcedStates: readonly { selector: string; pseudoClasses: readonly ForcedPseudoClass[] }[];
  forcedAttributes: readonly { selector: string; name: string; value: string }[];
  motion: string | null;
  ignored: readonly { key: LayerKey; field: 'x' | 'y' | 'width' | 'height' | 'look' }[];
};

/** 스토리 export 이름 → 검증하는 법 */
export type ParityStories = Readonly<Record<string, ParityStory>>;

/**
 * `<이름>.layers.gen.ts` 모듈의 꼴.
 * - layerPairs: 레이어 짝 표
 * - parityStories: 스토리마다 검증하는 법
 */
export type ParityModule = {
  layerPairs: LayerPairTable;
  parityStories: ParityStories;
};
