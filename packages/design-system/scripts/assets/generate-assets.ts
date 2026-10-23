import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { sourceAssetsDir } from '../package-paths.ts';
import { expectedAssetFiles } from './asset-files.ts';

// 사용법: node scripts/assets/generate-assets.ts [--check]
// figma/assets/의 SVG는 src/assets/asset-data.ts로, PNG는 src/assets/ 아래 같은 경로로 옮긴다.
// --check는 파일을 쓰지 않고, 만든 결과가 저장소와 다르면 실패한다.
const CHECK_FLAG = '--check';

main();

/**
 * 피그마 자산에서 코드 자산을 만들거나, 만든 결과와 같은지 확인한다.
 * @codocs [[피그마 연동:자산]]
 */
function main(): void {
  const isCheck = process.argv.includes(CHECK_FLAG);
  const outputs = expectedAssetFiles();
  const mismatches = [...outputs].filter(
    ([file, bytes]) => !existsSync(file) || !readFileSync(file).equals(bytes),
  );
  if (isCheck) {
    if (mismatches.length > 0) {
      console.error(
        `[assets] 생성 결과와 다른 파일: ${mismatches.map(([file]) => path.relative(sourceAssetsDir, file)).join(', ')}. ` +
          '`pnpm --filter @seojaewan/design-system generate:assets`로 다시 만들어 커밋한다.',
      );
      process.exitCode = 1;
      return;
    }
    console.log('[assets] src/assets가 figma/assets와 맞다.');
    return;
  }
  for (const [file, bytes] of mismatches) {
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, bytes);
  }
  console.log(`[assets] ${String(mismatches.length)}개 파일을 다시 만들었다.`);
}
