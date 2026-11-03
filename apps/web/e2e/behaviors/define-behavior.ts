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

/** 기준에서 조건을 바꾼 케이스. 하나를 바꾸는 것이 기본이고, 둘 이상은 표에 표시된다. */
export type ChangedCase<Conditions extends ConditionMap> = CaseBase & {
  change: BehaviorChange<Conditions>;
};

/** 행위 하나. 파일 하나가 행위 하나다. */
export type Behavior<Conditions extends ConditionMap = ConditionMap> = {
  name: string;
  area: BehaviorArea;
  conditions: Conditions;
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
