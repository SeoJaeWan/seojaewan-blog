import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { assetDataPath, figmaAssetsDir, sourceAssetsDir } from '../package-paths.ts';
import { assetDataModule, parseSvgAsset, type SvgAssetData } from './assets-code.ts';

// figma/assets/를 읽어 만들어야 할 코드 자산을 계산한다. generate-assets.ts와 재생성 확인 테스트가 함께 쓴다.

/**
 * figma/assets/에서 만들어야 할 코드 자산 파일과 내용을 계산한다.
 * @codocs [[피그마 일치 검사:자산]]
 * @returns 쓸 파일의 절대 경로 → 내용
 */
export function expectedAssetFiles(): Map<string, Buffer> {
  const outputs = new Map<string, Buffer>();
  const svgs = new Map<string, SvgAssetData>();
  for (const file of listFiles(figmaAssetsDir)) {
    const relative = path.relative(figmaAssetsDir, file).split(path.sep).join('/');
    if (relative.endsWith('.svg')) {
      svgs.set(relative, parseSvgAsset(readFileSync(file, 'utf8'), relative));
    } else if (relative.endsWith('.png')) {
      outputs.set(path.join(sourceAssetsDir, relative), readFileSync(file));
    } else {
      throw new Error(`[assets] ${relative}: 옮기는 방법이 정해지지 않은 자산이다.`);
    }
  }
  outputs.set(assetDataPath, Buffer.from(assetDataModule(svgs), 'utf8'));
  return outputs;
}

/**
 * 폴더 아래 파일을 모두 찾는다.
 * @param dir 폴더
 * @returns 파일 절대 경로 목록(없는 폴더면 빈 목록)
 */
function listFiles(dir: string): string[] {
  if (!existsSync(dir)) {
    return [];
  }
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? listFiles(path.join(dir, entry.name)) : [path.join(dir, entry.name)],
  );
}
