import sharp from 'sharp';
import { describe, expect, it } from 'vitest';

import { ImageUpstreamError } from '../image-errors/image-errors.ts';
import { convertImage } from './image-convert.ts';
import { makeGif, makePng, makeSvg } from './test-images.fixture.ts';

/**
 * 변환 결과에서 폭에 줄 파일을 찾는다.
 * @param converted 변환 결과
 * @param width 폭
 * @returns 파일
 */
function fileFor(
  converted: Awaited<ReturnType<typeof convertImage>>,
  width: 720 | 1440,
): Awaited<ReturnType<typeof convertImage>>['files'][number] | undefined {
  return converted.files.find((file) => file.name === converted.widths[width]);
}

// @codocs [[Notion 이미지 제공:최적화]]
describe('Notion 이미지 제공:최적화', () => {
  it('큰 이미지는 WebP로 폭 720과 1440 두 벌을 만들고 비율을 지킨다', async () => {
    const converted = await convertImage(await makePng(2000, 1000));
    expect(
      converted.files.map(({ name, width, height, contentType }) => [
        name,
        width,
        height,
        contentType,
      ]),
    ).toEqual([
      ['w720.webp', 720, 360, 'image/webp'],
      ['w1440.webp', 1440, 720, 'image/webp'],
    ]);
    const webp = fileFor(converted, 1440);
    expect(webp).toBeDefined();
    expect((await sharp(webp?.data).metadata()).format).toBe('webp');
  });

  it('원본보다 큰 폭은 만들지 않는다. 720과 1440 사이면 1440 자리에 원본 폭을 준다', async () => {
    const converted = await convertImage(await makePng(1000, 500));
    expect(fileFor(converted, 720)).toMatchObject({ width: 720, height: 360 });
    expect(fileFor(converted, 1440)).toMatchObject({
      name: 'w1000.webp',
      width: 1000,
      height: 500,
    });
  });

  it('원본이 720보다 작으면 원본 폭의 WebP 한 벌을 두 폭이 함께 쓴다', async () => {
    const converted = await convertImage(await makePng(500, 250));
    expect(converted.files).toHaveLength(1);
    expect(converted.widths).toEqual({ 720: 'w500.webp', 1440: 'w500.webp' });
    expect(fileFor(converted, 720)).toMatchObject({
      width: 500,
      height: 250,
      contentType: 'image/webp',
    });
  });

  it('GIF는 변환하지 않고 원본 그대로 둔다', async () => {
    const gif = await makeGif(2000, 1000);
    const converted = await convertImage(gif);
    expect(converted.files).toHaveLength(1);
    expect(fileFor(converted, 1440)).toMatchObject({
      contentType: 'image/gif',
      width: 2000,
      height: 1000,
      data: gif,
    });
    expect(converted.widths[720]).toBe(converted.widths[1440]);
  });

  it('SVG는 변환하지 않고 원본 그대로 둔다', async () => {
    const svg = makeSvg(1600, 900);
    const converted = await convertImage(svg);
    expect(converted.files).toHaveLength(1);
    expect(fileFor(converted, 720)).toMatchObject({
      contentType: 'image/svg+xml',
      width: 1600,
      height: 900,
      data: svg,
    });
  });

  it('이미지가 아니면 가져오기 실패로 본다', async () => {
    await expect(convertImage(Buffer.from('<html></html>'))).rejects.toBeInstanceOf(
      ImageUpstreamError,
    );
  });
});
