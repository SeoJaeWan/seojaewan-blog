// Node로 바로 돌리는 스크립트가 앱 코드(`src/`)를 그대로 불러올 수 있게 import 이름을 푸는 Node 모듈 훅이다.
// `node --import ./scripts/app-alias-hooks.ts <스크립트>`로 먼저 불러 둔다.
// - `@/…`(tsconfig `paths`)를 `src/…`로 바꾼다.
// - 앱 코드 안의 확장자 없는 import(`@/content/x/x`, `./x`)에 `.ts`를 붙인다. Next.js와 Vitest는 이 둘을 스스로 풀지만 Node는 풀지 못한다.
// Node 공식 기능(`module.registerHooks`)만 쓴다. tsconfig `paths`를 읽는 실행기(tsx 등)를 새로 설치하지 않으려는 것이다.
import { existsSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { fileURLToPath } from 'node:url';

/** 앱 코드 폴더 */
const sourceUrl = new URL('../src/', import.meta.url);

// 확장자 없는 import에 붙여 볼 확장자
const SOURCE_EXTENSIONS = ['.ts', '.tsx'] as const;

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('@/')) {
      return nextResolve(withExtension(new URL(specifier.slice(2), sourceUrl)).href, context);
    }
    const isRelative = specifier.startsWith('./') || specifier.startsWith('../');
    if (isRelative && context.parentURL?.startsWith(sourceUrl.href) === true) {
      return nextResolve(withExtension(new URL(specifier, context.parentURL)).href, context);
    }
    return nextResolve(specifier, context);
  },
});

/**
 * 파일이 없으면 `.ts`·`.tsx`를 붙여 있는 파일을 찾는다. 이미 있는 파일(확장자를 적은 import)은 그대로 둔다.
 * @param url 파일 주소
 * @returns 있는 파일의 주소. 찾지 못하면 받은 주소 그대로(Node가 찾을 수 없다는 오류를 낸다)
 */
function withExtension(url: URL): URL {
  if (existsSync(fileURLToPath(url))) {
    return url;
  }
  for (const extension of SOURCE_EXTENSIONS) {
    const candidate = new URL(`${url.href}${extension}`);
    if (existsSync(fileURLToPath(candidate))) {
      return candidate;
    }
  }
  return url;
}
