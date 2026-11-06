import sharp, { type Metadata } from 'sharp';

import type { ImageWidth } from '../image-address/image-address.ts';
import { ImageUpstreamError } from '../image-errors/image-errors.ts';

/** 저장할 파일 하나 */
export type ImageFile = {
  name: string;
  data: Buffer;
  contentType: string;
  width: number;
  height: number;
};

/** 변환한 이미지. 폭(720·1440)마다 어느 파일을 줄지 정한다. 같은 파일을 여러 폭이 가리킬 수 있다 */
export type ConvertedImage = {
  files: ImageFile[];
  widths: Record<ImageWidth, string>;
};

// 변환하지 않고 원본 그대로 두는 형식과 그 Content-Type
const ORIGINAL_FORMATS = {
  gif: 'image/gif',
  svg: 'image/svg+xml',
} as const;

/**
 * 내려받은 이미지를 저장할 파일로 바꾼다. WebP로 폭 720과 1440을 만들고, 원본보다 큰 폭은 만들지 않는다.
 * 원본이 정한 폭보다 작으면 그 폭에는 원본 폭의 WebP를 준다. GIF·SVG는 변환하지 않고 원본 그대로 둔다.
 * 원본은 따로 남기지 않는다.
 * @codocs [[Notion 이미지 제공:최적화]]
 * @param input 내려받은 이미지
 * @returns 저장할 파일과 폭마다 줄 파일
 */
export async function convertImage(input: Buffer): Promise<ConvertedImage> {
  let metadata: Metadata;
  try {
    metadata = await sharp(input).metadata();
  } catch (error) {
    throw new ImageUpstreamError(`이미지를 읽지 못했다: ${describe(error)}`);
  }
  const format = metadata.format;
  if (format === 'gif' || format === 'svg') {
    const name = `original.${format}`;
    return {
      files: [
        {
          name,
          data: input,
          contentType: ORIGINAL_FORMATS[format],
          width: metadata.width,
          height: metadata.height,
        },
      ],
      widths: { 720: name, 1440: name },
    };
  }

  const small = await toWebp(input, 720);
  const large = await toWebp(input, 1440);
  return {
    files: small.name === large.name ? [large] : [small, large],
    widths: { 720: small.name, 1440: large.name },
  };
}

/**
 * 이미지를 정한 폭의 WebP로 바꾼다. 원본보다 크게 늘리지 않고, 사진의 방향(EXIF)을 반영한다.
 * @param input 원본 이미지
 * @param width 폭
 * @returns WebP 파일. 이름에 실제 폭이 들어간다
 */
async function toWebp(input: Buffer, width: ImageWidth): Promise<ImageFile> {
  try {
    const { data, info } = await sharp(input)
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp()
      .toBuffer({ resolveWithObject: true });
    return {
      name: `w${String(info.width)}.webp`,
      data,
      contentType: 'image/webp',
      width: info.width,
      height: info.height,
    };
  } catch (error) {
    throw new ImageUpstreamError(`이미지를 WebP로 바꾸지 못했다: ${describe(error)}`);
  }
}

/**
 * 오류를 한 줄로 바꾼다.
 * @param error 오류
 * @returns 오류 메시지
 */
function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
