import { existsSync, readFileSync, writeFileSync } from 'node:fs';

import { tokensCssPath, tokensJsonPath } from '../package-paths.ts';
import { tokensJsonToCss } from './tokens-css.ts';

// 사용법: node scripts/tokens/generate-tokens.ts [--check]
// --check는 파일을 쓰지 않고, src/tokens.css가 figma/tokens.json에서 다시 만든 결과와 다르면 실패한다.
const CHECK_FLAG = '--check';
const JSON_NAME = 'figma/tokens.json';
const CSS_NAME = 'src/tokens.css';

if (import.meta.main) {
  main();
}

/**
 * figma/tokens.json에서 src/tokens.css를 만들거나, 만든 결과와 같은지 확인한다.
 * @codocs [[피그마 연동:토큰 생성]]
 */
function main(): void {
  const isCheck = process.argv.includes(CHECK_FLAG);
  const json: unknown = JSON.parse(readFileSync(tokensJsonPath, 'utf8'));
  const css = tokensJsonToCss(json);

  if (isCheck) {
    const current = existsSync(tokensCssPath) ? readFileSync(tokensCssPath, 'utf8') : '';
    if (current !== css) {
      console.error(
        `[tokens] ${CSS_NAME}가 ${JSON_NAME}에서 만든 결과와 다르다. ` +
          '`pnpm --filter @seojaewan/design-system generate:tokens`로 다시 만들어 커밋한다.',
      );
      process.exitCode = 1;
      return;
    }
    console.log(`[tokens] ${CSS_NAME}가 ${JSON_NAME}과 맞다.`);
    return;
  }

  writeFileSync(tokensCssPath, css);
  console.log(`[tokens] ${JSON_NAME}에서 ${CSS_NAME}를 만들었다.`);
}
