import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

import { assetDataPath, figmaAssetsDir, sourceAssetsDir } from '../package-paths.ts';
import { assetDataModule, parseSvgAsset, type SvgAssetData } from './assets-code.ts';
import { rasterFormat, webpEncoding } from './raster-code.ts';

// figma/assets/를 읽어 만들어야 할 코드 자산을 계산한다. generate-assets.ts와 재생성 확인 테스트가 함께 쓴다.

/**
 * figma/assets/에서 만들어야 할 코드 자산 파일과 내용을 계산한다.
 * SVG는 데이터 모듈로, 래스터 원본(PNG·JPEG 등)은 같은 이름의 WebP(`src/assets/<묶음>/<자산>.webp`)로 만든다.
 * @codocs [[피그마 연동:자산]]
 * @returns 쓸 파일의 절대 경로 → 내용
 */
export async function expectedAssetFiles(): Promise<Map<string, Buffer>> {
  const outputs = new Map<string, Buffer>();
  const svgs = new Map<string, SvgAssetData>();
  for (const file of listFiles(figmaAssetsDir)) {
    const relative = path.relative(figmaAssetsDir, file).split(path.sep).join('/');
    const extension = path.posix.extname(relative);
    if (extension === '.svg') {
      svgs.set(relative, parseSvgAsset(readFileSync(file, 'utf8'), relative));
      continue;
    }
    const output = path.join(sourceAssetsDir, `${relative.slice(0, -extension.length)}.webp`);
    if (outputs.has(output)) {
      throw new Error(
        `[assets] ${relative}: 확장자만 다른 원본이 둘 이상이다. 남길 원본 하나만 둔다.`,
      );
    }
    outputs.set(output, await rasterToWebp(readFileSync(file), relative, extension));
  }
  outputs.set(assetDataPath, Buffer.from(assetDataModule(svgs), 'utf8'));
  return outputs;
}

/**
 * src/assets/에 있지만 만들 파일에 없는 파일을 찾는다(원본이 사라졌거나 이름이 바뀐 자산).
 * @param outputs 만들 파일의 절대 경로
 * @returns 지울 파일의 절대 경로
 */
export function staleAssetFiles(outputs: ReadonlyMap<string, Buffer>): string[] {
  return listFiles(sourceAssetsDir).filter((file) => !outputs.has(file));
}

/**
 * 래스터 원본을 WebP로 바꾼다. 확장자는 바이트로 알아낸 실제 형식과 같아야 한다.
 * @codocs [[피그마 연동:자산]]
 * @param bytes 원본 내용
 * @param relative 오류 메시지에 쓸 자산 경로
 * @param extension 원본 확장자(`.png` 등)
 * @returns WebP 내용
 */
async function rasterToWebp(bytes: Buffer, relative: string, extension: string): Promise<Buffer> {
  const format = rasterFormat(bytes);
  if (format === undefined) {
    throw new Error(`[assets] ${relative}: 옮기는 방법이 정해지지 않은 자산이다.`);
  }
  if (extension !== `.${format}`) {
    throw new Error(
      `[assets] ${relative}: 확장자가 실제 형식(${format})과 다르다. 파일 이름을 .${format}으로 바꾼다.`,
    );
  }
  const encoding = webpEncoding(format);
  if (encoding === null) {
    return bytes;
  }
  const image = sharp(bytes);
  const { pages = 1 } = await image.metadata();
  if (pages > 1) {
    throw new Error(`[assets] ${relative}: 움직이는 이미지는 옮기지 않는다.`);
  }
  return image.webp(encoding).toBuffer();
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
