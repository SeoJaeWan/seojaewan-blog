import { existsSync, readFileSync, writeFileSync } from 'node:fs';

import { tokensCssPath, tokensJsonPath } from '../package-paths.ts';
import { tokensToCss } from './tokens-css.ts';

// 사용법: node scripts/tokens/generate-tokens.ts [--check]
// --check는 파일을 쓰지 않고, src/tokens.css가 figma/tokens.json과 다르면 실패한다.
const CHECK_FLAG = '--check';

main();

/**
 * figma/tokens.json에서 src/tokens.css를 만들거나, 만든 결과와 같은지 확인한다.
 * @codocs [[피그마 일치 검사:토큰 작성]]
 */
function main(): void {
  const isCheck = process.argv.includes(CHECK_FLAG);
  const jsonPath = 'figma/tokens.json';
  const cssPath = 'src/tokens.css';

  if (!existsSync(tokensJsonPath)) {
    console.log(`[tokens] ${jsonPath}이 아직 없어 건너뛴다. 커밋된 ${cssPath}를 그대로 쓴다.`);
    return;
  }

  const tokens: unknown = JSON.parse(readFileSync(tokensJsonPath, 'utf8'));
  const css = tokensToCss(tokens);

  if (isCheck) {
    const current = existsSync(tokensCssPath) ? readFileSync(tokensCssPath, 'utf8') : '';
    if (current !== css) {
      console.error(
        `[tokens] ${cssPath}가 ${jsonPath}과 맞지 않는다. ` +
          '`pnpm --filter @seojaewan/design-system generate:tokens`로 다시 만들어 커밋한다.',
      );
      process.exitCode = 1;
      return;
    }
    console.log(`[tokens] ${cssPath}가 ${jsonPath}과 맞다.`);
    return;
  }

  writeFileSync(tokensCssPath, css);
  console.log(`[tokens] ${jsonPath}에서 ${cssPath}를 만들었다.`);
}
