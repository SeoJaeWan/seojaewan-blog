import type { BrowserContext, Page } from '@playwright/test';

import type { TouchInput } from './touch-input.ts';

/** 행위 파일을 묶는 화면 영역. 시나리오 케이스 화면의 왼쪽 목록이 이 단위로 묶인다. */
export type BehaviorArea =
  '바탕화면' | '탐색기' | 'Start' | '검색' | 'Chrome' | '창' | '작업 표시줄' | '공통';

/** 케이스가 근거로 삼는 codocs 섹션 링크(`[[문서:섹션]]`). */
export type DocLink = `[[${string}:${string}]]`;

/** 근거 문서 섹션. 하나 이상이다. */
export type DocLinks = readonly [DocLink, ...DocLink[]];

/** 조건 하나. 값 목록은 기능 문서의 규칙에서 빠짐없이 뽑고, 기준값은 그 가운데 하나다. */
export type BehaviorCondition = {
  /** 사람이 읽는 조건 이름(예: '입력 방식', '붙일 자리', '화면 크기') */
  label: string;
  values: readonly string[];
  base: string;
};

type ConditionMap = Record<string, BehaviorCondition>;

type ConditionValue<
  Conditions extends ConditionMap,
  Key extends keyof Conditions,
> = Conditions[Key]['values'][number];

/** 기준에서 바꾼 조건과 값. 없는 조건이나 값은 타입 오류다. */
export type BehaviorChange<Conditions extends ConditionMap> = {
  [Key in keyof Conditions]?: ConditionValue<Conditions, Key>;
};

/** 케이스를 두지 않는 값과 그 이유. */
export type NoCaseReason = {
  /** 케이스가 없는 이유 한 문장 */
  reason: string;
  /** 이유의 근거 문서 섹션 */
  docs: DocLinks;
};

/** 조건 → 값 → 케이스가 없는 이유. 없는 조건이나 값은 타입 오류다. */
export type NoCaseMap<Conditions extends ConditionMap> = {
  [Key in keyof Conditions]?: {
    [Value in ConditionValue<Conditions, Key>]?: NoCaseReason;
  };
};

/**
 * 기대 결과 하나를 확인한다. 이름은 케이스의 `expected` 항목 그대로이고, 안의 `expect`는
 * 그 이름의 `test.step`으로 묶여 실패하면 어느 기대 결과가 깨졌는지 보고서에 나온다.
 */
export type CheckExpected = (expected: string, body: () => Promise<void> | void) => Promise<void>;

/** 케이스 실행 함수가 받는 것. */
export type CaseContext = {
  page: Page;
  context: BrowserContext;
  touch: TouchInput;
  check: CheckExpected;
};

/** 케이스가 쓰는 장치. 없으면 설정의 기본 화면(마우스·키보드)이다. */
export type CaseDevice = 'Pixel 7';

type CaseBase = {
  /** 행위 안에서 겹치지 않는 짧은 이름(영어 kebab-case). */
  id: string;
  /** 사용자가 하는 일 한 문장. */
  scenario: string;
  /** 결과를 짧은 구로(예: '바탕화면으로 옮겨짐'). 시나리오 케이스 표의 결과 칸에 보인다. */
  result: string;
  /** 되어야 하는 결과. `run`이 항목마다 `check`로 확인한다. */
  expected: readonly [string, ...string[]];
  /** 근거 문서 섹션. 하나 이상이다. */
  docs: DocLinks;
  /** 터치 장치에서 돌릴 때 고른다. */
  device?: CaseDevice;
  run: (context: CaseContext) => Promise<void>;
};

/** 1번 케이스. 모든 조건이 기준값이라 바꾼 것이 없다. */
export type BaseCase = CaseBase & { change?: undefined };

/** 일부러 엮은 조합. 케이스가 바꾼 조건에 다른 조건 값을 더 엮고, 엮어야 하는 이유를 적는다. */
export type CaseCombine<Conditions extends ConditionMap> = {
  change: BehaviorChange<Conditions>;
  /** 엮어야만 확인할 수 있는 이유 한 문장 */
  reason: string;
};

/**
 * 기준에서 조건 하나를 바꾼 케이스. `change`에는 조건 하나만 적는다. 그 값을 따라 함께 바뀌는 값은
 * 행위의 `requires`가 채우고, 다른 조건과 일부러 엮을 때만 `combine`에 이유와 함께 적는다.
 */
export type ChangedCase<Conditions extends ConditionMap> = CaseBase & {
  change: BehaviorChange<Conditions>;
  combine?: CaseCombine<Conditions>;
};

/**
 * 조건 사이의 의존. `when`의 값(조건 하나)이면 `then`의 값도 함께 바뀐다(예: 입력 방식이 터치면 화면 크기는 모바일).
 * 표에서 함께 진하게 보이고, `then`의 값 줄은 그 케이스와 같은 케이스로 보인다.
 */
export type ConditionRequirement<Conditions extends ConditionMap> = {
  when: BehaviorChange<Conditions>;
  then: BehaviorChange<Conditions>;
};

/** 행위 하나. 파일 하나가 행위 하나다. */
export type Behavior<Conditions extends ConditionMap = ConditionMap> = {
  name: string;
  area: BehaviorArea;
  /** 행위 제목의 '→' 뒤에 붙는, 확인하는 결과들을 짧게 이은 것(예: '탐색기로·바탕화면으로·길게 눌러 옮김') */
  summary: string;
  conditions: Conditions;
  /** 조건 사이의 의존 */
  requires?: readonly ConditionRequirement<Conditions>[];
  /** 케이스를 두지 않는 값과 이유. 이유도 케이스도 없는 값이 빠진 값이다. */
  noCase?: NoCaseMap<Conditions>;
  cases: readonly [BaseCase, ...ChangedCase<Conditions>[]];
};

/**
 * 행위를 정의한다. 조건 값과 기준값, 케이스가 바꾼 조건·값, 케이스 없는 값을 타입으로 검사한다.
 * @codocs [[테스트 작성 규칙:E2E]]
 * @param behavior 행위 이름, 영역, 조건, 케이스 없는 값, 케이스
 * @returns 받은 행위 그대로
 */
export function defineBehavior<const Conditions extends ConditionMap>(
  behavior: Behavior<Conditions> & { conditions: ValidConditions<Conditions> },
): Behavior<Conditions> {
  return behavior;
}

/** 기준값이 그 조건의 값 목록에 있어야 한다. */
type ValidConditions<Conditions extends ConditionMap> = {
  [Key in keyof Conditions]: Conditions[Key] & { base: Conditions[Key]['values'][number] };
};
