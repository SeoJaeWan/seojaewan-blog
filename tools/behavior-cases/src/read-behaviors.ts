import { pathToFileURL } from 'node:url';

import type { BehaviorSource } from './build-table.ts';
import { BEHAVIORS_DIR, fromRepo } from './paths.ts';

type LoadedBehavior = Omit<BehaviorSource, 'file'> & { file: string };

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
  return behaviors.map((behavior) => ({ ...behavior, file: `${BEHAVIORS_DIR}/${behavior.file}` }));
}
