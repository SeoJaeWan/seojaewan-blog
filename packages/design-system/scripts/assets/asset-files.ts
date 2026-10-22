import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import {
  assetDataPath,
  figmaAssetsDir,
  sourceAssetsDir,
  tokensJsonPath,
} from '../package-paths.ts';
import {
  assetDataModule,
  imageLayerFile,
  parseSvgAsset,
  type SvgAssetData,
} from './assets-code.ts';
import { scalePngAlpha } from './png-alpha.ts';

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
  for (const { asset, opacity } of imageLayers()) {
    const file = imageLayerFile(asset, opacity);
    if (file !== asset) {
      const source = readFileSync(path.join(figmaAssetsDir, asset));
      outputs.set(path.join(sourceAssetsDir, file), scalePngAlpha(source, opacity, asset));
    }
  }
  return outputs;
}

/**
 * tokens.json 칠 스타일의 이미지 층(자산과 불투명도)을 모은다.
 * @returns 이미지 층 목록
 */
function imageLayers(): { asset: string; opacity: number }[] {
  if (!existsSync(tokensJsonPath)) {
    return [];
  }
  const found: { asset: string; opacity: number }[] = [];
  collectImageLayers(JSON.parse(readFileSync(tokensJsonPath, 'utf8')), found);
  return found;
}

/**
 * 토큰 값 안의 이미지 층을 모은다.
 * @param value 토큰 JSON 값
 * @param found 모을 곳
 */
function collectImageLayers(value: unknown, found: { asset: string; opacity: number }[]): void {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectImageLayers(item, found);
    }
    return;
  }
  if (value === null || typeof value !== 'object') {
    return;
  }
  const type: unknown = Reflect.get(value, 'type');
  const asset: unknown = Reflect.get(value, 'asset');
  const opacity: unknown = Reflect.get(value, 'opacity');
  if (type === 'IMAGE' && typeof asset === 'string') {
    found.push({ asset, opacity: typeof opacity === 'number' ? opacity : 1 });
  }
  for (const item of Object.values(value)) {
    collectImageLayers(item, found);
  }
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
