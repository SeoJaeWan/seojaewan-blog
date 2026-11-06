import sharp from 'sharp';

/**
 * 정한 크기의 PNG를 만든다.
 * @param width 폭
 * @param height 높이
 * @returns PNG
 */
export function makePng(width: number, height: number): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 3, background: { r: 30, g: 120, b: 200 } },
  })
    .png()
    .toBuffer();
}

/**
 * 정한 크기의 GIF를 만든다.
 * @param width 폭
 * @param height 높이
 * @returns GIF
 */
export function makeGif(width: number, height: number): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 3, background: { r: 200, g: 60, b: 60 } },
  })
    .gif()
    .toBuffer();
}

/**
 * 정한 크기의 SVG를 만든다.
 * @param width 폭
 * @param height 높이
 * @returns SVG
 */
export function makeSvg(width: number, height: number): Buffer {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${String(width)}" height="${String(height)}"><rect width="100%" height="100%" fill="#1e78c8"/></svg>`,
  );
}
