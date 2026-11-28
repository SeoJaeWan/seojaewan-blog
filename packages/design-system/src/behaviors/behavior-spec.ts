// 동작의 종류가 갖는 규칙을 데이터로 적는 꼴이다. 종류의 구현(React 훅)과 나눠, React 없이 읽을 수 있게 둔다.
// 플러그인(구조 검사: 등록부에 있는 종류인지, 요구하는 레이어가 있는지, 상태 낱말이 표에 있는지)과
// 생성 스크립트(낱말의 조건을 겹친 CSS, 입력 이름, 태그)와 스토리 테스트(상태를 켜는 법, 견주지 않을 값)가 함께 읽는다.
// 이 파일은 아무것도 import하지 않는다. 생성 스크립트를 Node가 바로 실행하기 때문이다.

/**
 * 동작의 종류 하나의 규칙.
 * - name: 종류 이름. WAI-ARIA APG 역할 이름이고 `Interaction` 주석에 적는 낱말이다(`button`, `menuitem`, `scroll-area`)
 * - roles: 동작이 속성을 돌려주는 레이어 역할. 첫 항목은 언제나 루트 역할(`root`)이다
 * - stateWords: 상태 낱말 표. 피그마 `State` 값을 공백으로 쪼갠 낱말마다 옮길 조건이다. 먼저 적은 낱말이 겹칠 때 이긴다
 * - axes: `State` 밖에서 동작이 아는 변형 축(켜짐과 꺼짐, `Filled`처럼 동작이 스스로 아는 축)
 * - event: 이 종류가 바깥에 여는 사건. 사건이 없는 종류(표시만 하는 종류)는 null
 * - runtimeValues: 실행 중에 동작이 덮는 값. 피그마 값은 처음 값으로만 쓰고, 검증은 이 값을 견주지 않는다
 * @codocs [[디자인 시스템:동작의 종류]]
 * @codocs [[디자인 시스템:상태]]
 */
export type BehaviorSpec = {
  name: string;
  roles: readonly RoleSpec[];
  stateWords: readonly StateWordSpec[];
  axes: readonly AxisSpec[];
  event: EventSpec | null;
  runtimeValues: readonly RuntimeValueSpec[];
};

/** 루트 역할의 이름. 변형 루트 레이어에 붙는다 */
export const ROOT_ROLE = 'root';

/**
 * 레이어 역할 하나. 동작은 역할마다 속성(이벤트, aria, data, ref)을 돌려주고, 합친 컴포넌트는 그 역할의 레이어 요소에 펼친다.
 * - role: 역할 이름(`root`, `label`, `indicator`). 동작 결과의 키다
 * - selector: 스키마에서 이 역할의 레이어를 찾는 법
 * - isRequired: 모든 변형에 이 레이어가 있어야 하는지. 없으면 구조 검사가 막는다
 * - isMultiple: 이 역할의 레이어가 여럿일 수 있는지
 * - tag: 이 역할의 레이어를 그릴 태그. null이면 스킨의 기본 태그(`div`, 글자는 `span`)다
 * @codocs [[디자인 시스템:동작의 종류]]
 * @codocs [[디자인 시스템:구조 검사]]
 */
export type RoleSpec = {
  role: string;
  selector: RoleSelector;
  isRequired: boolean;
  isMultiple: boolean;
  tag: BehaviorTag | null;
};

/**
 * 역할의 레이어를 스키마에서 찾는 법. 주석에 적지 않고 변형과 구조에서 읽는다.
 * - root: 변형 루트
 * - text-property: 글자 속성(`TEXT`)에 묶인 글자 레이어(`propertyRefs.characters`가 있음)
 * - swap-property: 인스턴스 교체 속성에 묶인 레이어(`propertyRefs.mainComponent`가 있음)
 * - indicator: 켜짐과 꺼짐 축이 켜진 변형에만 있는 레이어(표시 레이어)
 * - layer-name: 이름이 names 가운데 하나인 레이어. 역할이 되는 레이어끼리 이름이 겹치면 구조 검사가 막는다
 * - nested-behavior: 품은 인스턴스 가운데 원본의 종류가 behavior인 것
 */
export type RoleSelector =
  | { kind: 'root' }
  | { kind: 'text-property' }
  | { kind: 'swap-property' }
  | { kind: 'indicator' }
  | { kind: 'layer-name'; names: readonly string[] }
  | { kind: 'nested-behavior'; behavior: string };

/** 역할이 그릴 수 있는 태그. 종류가 새 태그를 쓰면 더한다 */
export type BehaviorTag =
  | 'a'
  | 'button'
  | 'div'
  | 'span'
  | 'input'
  | 'textarea'
  | 'label'
  | 'ul'
  | 'ol'
  | 'li'
  | 'nav'
  | 'section'
  | 'p'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'h5'
  | 'h6'
  | 'hr'
  | 'img'
  | 'figure'
  | 'figcaption'
  | 'table'
  | 'thead'
  | 'tbody'
  | 'tr'
  | 'th'
  | 'td'
  | 'pre'
  | 'code'
  | 'dialog';

/**
 * 상태 낱말 하나.
 * - word: 피그마 상태 낱말(`Hover`, `Selected`, `unfocused`). 대소문자를 가리지 않고 견준다
 * - condition: 옮길 조건. null은 기본 상태 낱말(`Rest`)이라 조건이 없다
 * - target: 조건을 거는 역할. 보통 `root`다
 * - codeName: 앱이나 쓰는 곳이 켜는 낱말의 코드 입력 이름(`isCut`, `isRenaming`, `isDisabled`). 브라우저나 동작이 스스로 켜는 낱말은 null이다.
 *   null이 아닌 낱말은 생성한 스토리가 이 입력으로 켜고, null인 의사 클래스 낱말은 테스트가 브라우저에 그 상태를 강제로 켠다
 * @codocs [[디자인 시스템:상태]]
 * @codocs [[디자인 시스템:컴포넌트 입력]]
 */
export type StateWordSpec = {
  word: string;
  condition: StateCondition | null;
  target: string;
  codeName: string | null;
};

/**
 * 상태 조건. CSS에 준비된 말이나 aria 속성을 먼저 쓰고, 둘 다 없을 때만 data 속성을 쓴다.
 * - pseudo-class: CSS 의사 클래스. `hover`는 생성기가 `@media (hover: hover)` 안에 낸다
 * - aria: aria 속성이 value와 같을 때
 * - data: data 속성이 있을 때(value가 null) 또는 value와 같을 때
 * - not: 조건이 아닐 때
 * @codocs [[디자인 시스템:상태]]
 */
export type StateCondition =
  | {
      kind: 'pseudo-class';
      name: 'hover' | 'active' | 'focus-visible' | 'disabled' | 'focus-within';
    }
  | { kind: 'aria'; attribute: `aria-${string}`; value: string }
  | { kind: 'data'; attribute: `data-${string}`; value: string | null }
  | { kind: 'not'; condition: StateCondition };

/**
 * `State` 밖에서 동작이 아는 변형 축.
 * - on-off: 값이 둘뿐인 켜짐과 꺼짐 축(`ON_OFF_VALUE_PAIRS`). 켜진 값이 condition으로 옮겨지고 꺼진 값이 기본이다
 * - named: 이름으로 정한 축(`Filled`). values는 값마다의 조건이고, null은 기본 값이다
 * - codeName: 이 축을 켜는 코드 입력 이름(`isChecked`). 동작이 스스로 아는 축은 null이고 입력으로 내지 않는다
 * - target: 조건을 거는 역할
 * @codocs [[디자인 시스템:동작의 종류]]
 * @codocs [[디자인 시스템:컴포넌트 입력]]
 */
export type AxisSpec =
  | {
      kind: 'on-off';
      codeName: string | null;
      target: string;
      condition: StateCondition;
    }
  | {
      kind: 'named';
      axis: string;
      codeName: string | null;
      target: string;
      values: readonly { value: string; condition: StateCondition | null }[];
    };

/** 켜짐과 꺼짐 축으로 읽는 값 쌍(켜짐, 꺼짐). 대소문자를 가리지 않는다 */
export const ON_OFF_VALUE_PAIRS = [
  ['On', 'Off'],
  ['True', 'False'],
] as const;

/**
 * 이 종류가 바깥에 여는 사건.
 * - inputName: 합친 컴포넌트가 이 사건을 받는 입력 이름(`onClick`, `onChange`)
 * - nestedSuffix: 이 종류의 부품이 다른 컴포넌트 안에 박혀 있을 때 바깥 입력 이름 끝에 붙는 사건 이름.
 *   바깥 입력은 `on` + 레이어 이름 + 이 값이다. 버튼은 빈 문자열이라 `close button` → `onClose`, 입력란은 `Change`라 `rename field` → `onRenameChange`다
 * @codocs [[디자인 시스템:컴포넌트 입력]]
 */
export type EventSpec = {
  inputName: string;
  nestedSuffix: string;
};

/**
 * 실행 중에 동작이 덮는 값 하나(스크롤 막대의 손잡이 길이 등). 생성기는 피그마 값을 처음 값으로 내고,
 * 스토리 테스트는 이 역할의 이 값을 견주지 않는다.
 * @codocs [[디자인 시스템:크기 변수]]
 * @codocs [[디자인 시스템:생성 결과 검증]]
 */
export type RuntimeValueSpec = {
  role: string;
  field: 'x' | 'y' | 'width' | 'height';
};

/**
 * 피그마 상태 값을 낱말로 쪼갠다(`Selected unfocused current` → `Selected`, `unfocused`, `current`).
 * @codocs [[디자인 시스템:상태]]
 * @param stateValue `State` 축의 값
 * @returns 공백으로 쪼갠 낱말
 */
export function stateWordsOf(stateValue: string): string[] {
  return stateValue.split(/\s+/u).filter((word) => word !== '');
}

/**
 * 종류의 낱말 표에서 낱말을 찾는다. 대소문자를 가리지 않는다.
 * @codocs [[디자인 시스템:상태]]
 * @param spec 동작의 종류
 * @param word 피그마 상태 낱말
 * @returns 낱말 규칙. 표에 없으면 undefined(구조 검사가 막는다)
 */
export function findStateWord(spec: BehaviorSpec, word: string): StateWordSpec | undefined {
  const lower = word.toLowerCase();
  return spec.stateWords.find((entry) => entry.word.toLowerCase() === lower);
}
