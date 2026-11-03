import type { BrowserContext, Page } from '@playwright/test';

import type { TouchInput } from './touch-input.ts';

/** 행위 파일을 묶는 화면 영역. 행위 표의 왼쪽 목록이 이 단위로 묶인다. */
export type BehaviorArea =
  '바탕화면' | '탐색기' | 'Start' | '검색' | 'Chrome' | '창' | '작업 표시줄' | '공통';

/** 케이스가 근거로 삼는 codocs 섹션 링크(`[[문서:섹션]]`). */
export type DocLink = `[[${string}:${string}]]`;

/** 조건 하나. 값 목록은 기능 문서의 규칙에서 뽑고, 기준값은 그 가운데 하나다. */
export type BehaviorCondition = {
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

/** 케이스 실행 함수가 받는 것. */
export type CaseContext = {
  page: Page;
  context: BrowserContext;
  touch: TouchInput;
};

/** 케이스가 쓰는 장치. 없으면 설정의 기본 화면(마우스·키보드)이다. */
export type CaseDevice = 'Pixel 7';

type CaseBase = {
  /** 행위 안에서 겹치지 않는 짧은 이름(영어 kebab-case). 시험 제목과 실행해보기가 이 이름으로 케이스를 찾는다. */
  id: string;
  /** 이 케이스로 확인하려는 것 한 문장. */
  purpose: string;
  /** 근거 문서 섹션. 하나 이상이다. */
  docs: readonly [DocLink, ...DocLink[]];
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
  cases: readonly [BaseCase, ...ChangedCase<Conditions>[]];
};

/**
 * 행위를 정의한다. 조건 값과 기준값, 케이스가 바꾼 조건·값을 타입으로 검사한다.
 * @codocs [[테스트 작성 규칙:E2E]]
 * @param behavior 행위 이름, 영역, 조건, 케이스
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
