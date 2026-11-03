import { readdirSync } from 'node:fs';

import type { Behavior } from './define-behavior.ts';

/** 정의 파일에서 읽은 행위. `id`는 파일 이름에서 `.behavior.ts`를 뺀 것이다. */
export type LoadedBehavior = Behavior & { id: string; file: string };

const BEHAVIOR_FILE_SUFFIX = '.behavior.ts';
const behaviorsDir = new URL('./', import.meta.url);

/**
 * `e2e/behaviors/`의 정의 파일(`*.behavior.ts`)을 모두 읽는다. 파일마다 `behavior`를 내보낸다.
 * Playwright 시험과 행위 표 도구가 같은 함수로 읽어, 둘이 보는 행위가 어긋나지 않는다.
 * @codocs [[테스트 작성 규칙:E2E]]
 * @param dir 정의 파일 폴더
 * @returns 파일 이름 순서의 행위 목록
 */
export async function loadBehaviors(dir: URL = behaviorsDir): Promise<LoadedBehavior[]> {
  const files = readdirSync(dir)
    .filter((name) => name.endsWith(BEHAVIOR_FILE_SUFFIX))
    .sort();
  const loaded: LoadedBehavior[] = [];
  for (const file of files) {
    const definition: unknown = await import(new URL(file, dir).href);
    if (typeof definition !== 'object' || definition === null || !('behavior' in definition)) {
      throw new Error(`${file}가 behavior를 내보내지 않는다`);
    }
    // 정의 파일은 defineBehavior로 타입 검사를 거쳤다.
    const behavior = definition.behavior as Behavior;
    loaded.push({ ...behavior, id: file.slice(0, -BEHAVIOR_FILE_SUFFIX.length), file });
  }
  return loaded;
}
