import type { Locator, Page } from '@playwright/test';

import type { ShadowLayer } from './css-values.ts';

// 캡처 표 이미지를 만든다. 피그마 변형 PNG와 코드 캡처를 같은 배율·여백·배경으로 맞춘다.
// 그림을 기계로 비교하지 않는다. 사람이 PR 댓글에서 나란히 본다.

// 비교 요소(피그마는 변형 노드) 둘레에 두는 가장 작은 여백(CSS px)이다. 그림자가 이보다 넓으면 그만큼 넓힌다.
export const CAPTURE_MARGIN = 24;
// 배경이 투명하면 브라우저가 칠하는 기본 배경이다.
const DEFAULT_BACKGROUND = 'rgb(255, 255, 255)';
const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** CSS px 사각형 */
export type Rect = { x: number; y: number; width: number; height: number };

/** CSS px 크기 */
export type Size = { width: number; height: number };

/** 캡처할 영역 */
export type CaptureRegion = {
  /** 여백을 더한 전체 영역의 크기(CSS px, 정수) */
  canvas: Size;
  /** 화면 안에서 실제로 찍을 영역(CSS px, 정수) */
  clip: Rect;
  /** 찍은 영역을 전체 영역 안에 놓을 위치 */
  offset: { x: number; y: number };
};

/** 노드 둘레로 그림자가 나가는 폭(CSS px) */
export type Extents = { left: number; right: number; top: number; bottom: number };

export const noExtents: Extents = { left: 0, right: 0, top: 0, bottom: 0 };

/**
 * 바깥 그림자가 노드 둘레로 나가는 폭을 구한다. 피그마는 변형 PNG를 이만큼 넓혀 내보낸다.
 * @param layers 변형 루트 효과 스타일의 그림자 층
 * @returns 방향마다 나가는 폭
 */
export function shadowExtents(layers: readonly ShadowLayer[]): Extents {
  const extents = { ...noExtents };
  for (const layer of layers.filter((item) => !item.inset)) {
    const reach = layer.blur + layer.spread;
    extents.left = Math.max(extents.left, reach - layer.x);
    extents.right = Math.max(extents.right, reach + layer.x);
    extents.top = Math.max(extents.top, reach - layer.y);
    extents.bottom = Math.max(extents.bottom, reach + layer.y);
  }
  return extents;
}

/**
 * 피그마와 코드에 함께 쓸 여백을 정한다. 그림자가 잘리지 않을 만큼 넓힌다.
 * @param extents 그림자가 나가는 폭
 * @returns 여백(CSS px, 정수)
 */
export function captureMargin(extents: Extents): number {
  return Math.ceil(
    Math.max(CAPTURE_MARGIN, extents.left, extents.right, extents.top, extents.bottom),
  );
}

/**
 * 비교 요소의 테두리 상자에 여백을 더한 영역을 정한다. 화면 밖으로 나가는 부분은 찍지 않고 배경으로 채운다.
 * @codocs [[피그마 일치 검사:캡처 표]]
 * @param box 비교 요소의 테두리 상자
 * @param margin 여백
 * @param viewport 화면 크기
 * @returns 캡처할 영역
 */
export function captureRegion(box: Rect, margin: number, viewport: Size): CaptureRegion {
  const left = Math.floor(box.x - margin);
  const top = Math.floor(box.y - margin);
  const right = Math.ceil(box.x + box.width + margin);
  const bottom = Math.ceil(box.y + box.height + margin);
  const clipLeft = Math.max(0, left);
  const clipTop = Math.max(0, top);
  return {
    canvas: { width: right - left, height: bottom - top },
    clip: {
      x: clipLeft,
      y: clipTop,
      width: Math.max(0, Math.min(viewport.width, right) - clipLeft),
      height: Math.max(0, Math.min(viewport.height, bottom) - clipTop),
    },
    offset: { x: clipLeft - left, y: clipTop - top },
  };
}

/**
 * PNG 머리(IHDR)에서 픽셀 크기를 읽는다.
 * @param png PNG 파일 내용
 * @returns 가로·세로 픽셀
 */
export function pngSize(png: Buffer): { width: number; height: number } {
  if (png.length < 24 || !png.subarray(0, 8).equals(pngSignature)) {
    throw new Error('PNG 파일이 아니다.');
  }
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

/**
 * 피그마 변형 PNG를 여백을 둔 배경 위에 놓는다. PNG는 `scale` 배율로, 그림자가 나가는 만큼 넓혀 내보냈으므로
 * 그 폭을 빼 변형 노드가 코드 캡처의 비교 요소와 같은 자리(여백만큼 안쪽)에 오게 한다.
 * @codocs [[피그마 일치 검사:캡처 표]]
 * @param page 같은 배율로 연 페이지(이 페이지의 브라우저 맥락에서 합성한다)
 * @param png 피그마 변형 PNG(배경 투명)
 * @param options 배율, 배경색, 그림자가 나가는 폭, 여백
 * @param options.scale figma.json의 배율
 * @param options.background 배경색
 * @param options.extents 그림자가 나가는 폭
 * @param options.margin 여백
 * @returns 합성한 PNG
 */
export async function captureFigma(
  page: Page,
  png: Buffer,
  options: { scale: number; background: string; extents: Extents; margin: number },
): Promise<Buffer> {
  const size = pngSize(png);
  const width = size.width / options.scale;
  const height = size.height / options.scale;
  const canFit =
    width - options.extents.left - options.extents.right > 0 &&
    height - options.extents.top - options.extents.bottom > 0;
  const extents = canFit ? options.extents : noExtents;
  const nodeWidth = width - extents.left - extents.right;
  const nodeHeight = height - extents.top - extents.bottom;
  return compose(
    page,
    png,
    { x: options.margin - extents.left, y: options.margin - extents.top, width, height },
    {
      width: Math.ceil(nodeWidth + options.margin * 2),
      height: Math.ceil(nodeHeight + options.margin * 2),
    },
    options.background,
  );
}

/**
 * 스토리 화면에서 비교 요소의 테두리 상자와 여백을 찍는다. 상태는 부르는 쪽이 판정과 같은 방법으로 재현해 둔다.
 * @codocs [[피그마 일치 검사:캡처 표]]
 * @param page 스토리 페이지
 * @param target 비교 요소
 * @param margin 여백
 * @returns 찍은 PNG와 피그마 PNG에 깔 배경색
 */
export async function captureCode(
  page: Page,
  target: Locator,
  margin: number,
): Promise<{ png: Buffer; background: string }> {
  const background = await pageBackground(page);
  const box = await target.boundingBox();
  if (box === null) {
    throw new Error('비교 요소가 화면에 보이지 않는다.');
  }
  const region = captureRegion(box, margin, page.viewportSize() ?? { width: 0, height: 0 });
  const shot = await page.screenshot({ clip: region.clip, animations: 'disabled' });
  const isWhole =
    region.clip.width === region.canvas.width && region.clip.height === region.canvas.height;
  if (isWhole) {
    return { png: shot, background };
  }
  const placed = { ...region.offset, width: region.clip.width, height: region.clip.height };
  return { png: await compose(page, shot, placed, region.canvas, background), background };
}

/**
 * 스토리 화면의 배경색을 읽는다. 문서 배경이 투명하면 브라우저 기본 배경(흰색)이다.
 * @param page 스토리 페이지
 * @returns CSS 색
 */
async function pageBackground(page: Page): Promise<string> {
  return page.evaluate(
    /**
     * 브라우저에서 body, html 순서로 투명하지 않은 배경색을 찾는다.
     * @param fallback 둘 다 투명할 때의 색
     * @returns CSS 색
     */
    (fallback) => {
      for (const element of [document.body, document.documentElement]) {
        const color = getComputedStyle(element).backgroundColor;
        if (color !== 'transparent' && color !== 'rgba(0, 0, 0, 0)') {
          return color;
        }
      }
      return fallback;
    },
    DEFAULT_BACKGROUND,
  );
}

/**
 * 이미지 하나를 배경색 캔버스 위 정한 자리에 놓고 찍는다. 같은 배율의 새 탭에서 합성해, 새 그림 도구 없이
 * Playwright만으로 두 이미지의 배경을 맞춘다.
 * @param page 배율을 가져올 페이지
 * @param png 놓을 이미지
 * @param placed 놓을 자리(CSS px)
 * @param canvas 캔버스 크기(CSS px)
 * @param background 배경색
 * @returns 합성한 PNG
 */
async function compose(
  page: Page,
  png: Buffer,
  placed: Rect,
  canvas: Size,
  background: string,
): Promise<Buffer> {
  const composer = await page.context().newPage();
  try {
    await composer.setViewportSize({
      width: Math.max(1, canvas.width),
      height: Math.max(1, canvas.height),
    });
    await composer.setContent(
      `<body style="margin:0"><div id="canvas" style="position:relative;overflow:hidden;width:${String(canvas.width)}px;height:${String(canvas.height)}px;background:${background}">` +
        `<img id="image" alt="" style="${positionStyle(placed)}" src="data:image/png;base64,${png.toString('base64')}"></div></body>`,
    );
    await composer.locator('#image').evaluate(
      /**
       * 브라우저에서 이미지를 다 풀 때까지 기다린다.
       * @param image 이미지 요소
       */
      async (image) => {
        if (image instanceof HTMLImageElement) {
          await image.decode();
        }
      },
    );
    return await composer.locator('#canvas').screenshot({ animations: 'disabled' });
  } finally {
    await composer.close();
  }
}

/**
 * 절대 위치 스타일을 만든다.
 * @param rect 자리(CSS px)
 * @returns 인라인 스타일
 */
function positionStyle(rect: Rect): string {
  return `position:absolute;left:${String(rect.x)}px;top:${String(rect.y)}px;width:${String(rect.width)}px;height:${String(rect.height)}px`;
}
