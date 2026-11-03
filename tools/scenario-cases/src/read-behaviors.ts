import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

import type { BehaviorSource, CaseSource } from './build-table.ts';
import { BEHAVIORS_DIR, fromRepo } from './paths.ts';

type LoadedCase = Omit<CaseSource, 'line'> & { run: () => Promise<void> };
type LoadedBehavior = Omit<BehaviorSource, 'cases'> & { cases: LoadedCase[] };

/**
 * 정의 파일에서 케이스가 시작하는 줄을 찾는다(`id: '케이스id'`가 있는 줄).
 * @param text 정의 파일 내용
 * @param id 케이스 id
 * @returns 1부터 센 줄. 못 찾으면 null
 */
export function findCaseLine(text: string, id: string): number | null {
  const index = text
    .split(/\r?\n/u)
    .findIndex((line) => line.includes(`id: '${id}'`) || line.includes(`id: "${id}"`));
  return index === -1 ? null : index + 1;
}

/**
 * 앱의 행위 정의를 읽는다. Playwright 시험과 같은 읽기 함수(`load-behaviors.ts`)를 Node가 타입을 지우며 바로 import한다.
 * @codocs [[테스트 작성 규칙:E2E]]
 * @returns 표를 만들 행위 정의(정의 파일 경로는 저장소 기준)
 */
export async function readBehaviors(): Promise<BehaviorSource[]> {
  const loaderUrl = pathToFileURL(fromRepo(`${BEHAVIORS_DIR}/load-behaviors.ts`)).href;
  // 앱의 읽기 함수는 이 패키지가 타입으로 알지 못하는 모듈이라 모양을 여기서 정한다.
  const loader = (await import(loaderUrl)) as {
    loadBehaviors: () => Promise<LoadedBehavior[]>;
  };
  const behaviors = await loader.loadBehaviors();
  return behaviors.map(
    /**
     * 행위 하나의 정의 파일 경로를 저장소 기준으로 바꾸고, 케이스마다 줄을 붙인다.
     * @param behavior 읽은 행위
     * @returns 표를 만들 행위 정의
     */
    (behavior) => {
      const file = `${BEHAVIORS_DIR}/${behavior.file}`;
      const text = readFileSync(fromRepo(file), 'utf8');
      return {
        ...behavior,
        file,
        cases: behavior.cases.map(
          /**
           * 케이스 하나에 정의 파일의 줄을 붙이고 실행 함수는 뺀다.
           * @param loaded 읽은 케이스
           * @returns 표를 만들 케이스 정의
           */
          (loaded) => {
            const rest: Omit<LoadedCase, 'run'> & { run?: unknown } = { ...loaded };
            delete rest.run;
            return { ...rest, line: findCaseLine(text, rest.id) };
          },
        ),
      };
    },
  );
}
