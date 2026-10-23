import type { Locator, Page } from '@playwright/test';

// 캡처 표의 세 그림(피그마, 코드, 차이)을 만든다. 피그마 변형 PNG와 코드 캡처를 같은 배율·여백·배경으로 맞추고,
// 둘을 Chromium 캔버스에서 `difference`로 겹쳐 차이 그림을 만든다. 판정하지 않는다. 사람이 PR 댓글에서 본다.

// 캡처 대상(피그마는 변형 노드) 둘레에 두는 가장 작은 여백(CSS px)이다. 그림자가 이보다 넓으면 그만큼 넓힌다.
export const CAPTURE_MARGIN = 24;
// 배경이 투명하면 브라우저가 칠하는 기본 배경이다.
const DEFAULT_BACKGROUND = 'rgb(255, 255, 255)';
const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const PNG_DATA_URL_PREFIX = 'data:image/png;base64,';

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

/** box-shadow 층 하나(CSS px) */
export type ShadowLayer = { x: number; y: number; blur: number; spread: number; inset: boolean };

export const noExtents: Extents = { left: 0, right: 0, top: 0, bottom: 0 };

/**
 * 계산된 `box-shadow` 값을 층으로 나눈다. Chromium은 `rgba(0, 0, 0, 0.14) 0px 8px 16px 0px`처럼
 * 색을 앞에 두고 길이를 px로 쓴다. 색 안의 쉼표로 층을 잘못 나누지 않게 괄호 밖의 쉼표로만 나눈다.
 * @param value 계산된 box-shadow(`none`이면 층이 없다)
 * @returns 그림자 층
 */
export function parseBoxShadow(value: string): ShadowLayer[] {
  if (value.trim() === '' || value.trim() === 'none') {
    return [];
  }
  const layers: string[] = [];
  let depth = 0;
  let current = '';
  for (const char of value) {
    if (char === '(') {
      depth += 1;
    } else if (char === ')') {
      depth -= 1;
    }
    if (char === ',' && depth === 0) {
      layers.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  layers.push(current);
  return layers.map(
    /**
     * 층 하나에서 색을 빼고 길이(x, y, 흐림, 퍼짐)와 inset을 읽는다.
     * @param layer 층 글자
     * @returns 그림자 층
     */
    (layer) => {
      const withoutColor = layer.replace(/[a-z-]+\([^)]*\)|#[0-9a-f]+/giu, ' ');
      const lengths = [...withoutColor.matchAll(/-?[\d.]+px|\b0\b/gu)].map((match) =>
        Number.parseFloat(match[0]),
      );
      const [x = 0, y = 0, blur = 0, spread = 0] = lengths;
      return { x, y, blur, spread, inset: /\binset\b/u.test(withoutColor) };
    },
  );
}

/**
 * 바깥 그림자가 노드 둘레로 나가는 폭을 구한다. 피그마는 변형 PNG를 이만큼 넓혀 내보낸다.
 * @param layers 캡처 대상의 그림자 층
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
 * @codocs [[피그마 연동:캡처 표]]
 * @param extents 그림자가 나가는 폭
 * @returns 여백(CSS px, 정수)
 */
export function captureMargin(extents: Extents): number {
  return Math.ceil(
    Math.max(CAPTURE_MARGIN, extents.left, extents.right, extents.top, extents.bottom),
  );
}

/**
 * 캡처 대상의 테두리 상자에 여백을 더한 영역을 정한다. 화면 밖으로 나가는 부분은 찍지 않고 배경으로 채운다.
 * @codocs [[피그마 연동:캡처 표]]
 * @param box 캡처 대상의 테두리 상자
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
export function pngSize(png: Buffer): Size {
  if (png.length < 24 || !png.subarray(0, 8).equals(pngSignature)) {
    throw new Error('PNG 파일이 아니다.');
  }
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

/**
 * 바깥 윤곽선(outline)이 노드 둘레로 나가는 폭을 구한다. 피그마의 바깥 선(포커스 고리 등)처럼 변형 PNG를 넓힌다.
 * @param outline 계산된 outline-style, outline-width, outline-offset
 * @param outline.style outline-style
 * @param outline.width outline-width
 * @param outline.offset outline-offset
 * @returns 방향마다 나가는 폭
 */
export function outlineExtents(outline: { style: string; width: string; offset: string }): Extents {
  if (outline.style === 'none') {
    return noExtents;
  }
  const reach = Math.max(0, Number.parseFloat(outline.width) + Number.parseFloat(outline.offset));
  return Number.isFinite(reach)
    ? { left: reach, right: reach, top: reach, bottom: reach }
    : noExtents;
}

/**
 * 캡처 대상의 그림자(box-shadow)와 바깥 윤곽선(outline)이 나가는 폭을 읽는다. 코드는 피그마 효과 스타일·선과
 * 같은 토큰으로 그리므로, 피그마 PNG가 그만큼 넓어진 폭도 이 값과 같다.
 * @codocs [[피그마 연동:캡처 표]]
 * @param target 캡처 대상
 * @returns 방향마다 나가는 폭
 */
export async function readRenderExtents(target: Locator): Promise<Extents> {
  const style = await target.evaluate(
    /**
     * 브라우저에서 계산된 그림자와 윤곽선 값을 읽는다.
     * @param element 캡처 대상
     * @returns 그림자와 윤곽선 값
     */
    (element) => {
      const computed = getComputedStyle(element);
      return {
        shadow: computed.boxShadow,
        outline: {
          style: computed.outlineStyle,
          width: computed.outlineWidth,
          offset: computed.outlineOffset,
        },
      };
    },
  );
  const shadow = shadowExtents(parseBoxShadow(style.shadow));
  const outline = outlineExtents(style.outline);
  return {
    left: Math.max(shadow.left, outline.left),
    right: Math.max(shadow.right, outline.right),
    top: Math.max(shadow.top, outline.top),
    bottom: Math.max(shadow.bottom, outline.bottom),
  };
}

/**
 * 피그마 변형 PNG를 여백을 둔 배경 위에 놓는다. PNG는 `scale` 배율로, 그림자가 나가는 만큼 넓혀 내보냈으므로
 * 그 폭을 빼 변형 노드가 코드 캡처의 캡처 대상과 같은 자리(여백만큼 안쪽)에 오게 한다.
 * @codocs [[피그마 연동:캡처 표]]
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
 * 스토리 화면에서 캡처 대상의 테두리 상자와 여백을 찍는다. 상태는 부르는 쪽이 재현해 둔다.
 * @codocs [[피그마 연동:캡처 표]]
 * @param page 스토리 페이지
 * @param target 캡처 대상
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
    throw new Error('캡처 대상이 화면에 보이지 않는다.');
  }
  const region = captureRegion(box, margin, page.viewportSize() ?? { width: 0, height: 0 });
  // 애니메이션은 끝난 상태로, 입력 커서는 숨겨 찍는다(Playwright 기본값 caret: 'hide').
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
 * 피그마 그림과 코드 그림의 차이 그림을 만든다. 두 그림을 같은 크기(큰 쪽)의 배경색 캔버스에 왼쪽 위를 맞춰 놓고,
 * 캔버스 `globalCompositeOperation = 'difference'`로 겹친다. 같은 곳은 검정, 다른 곳은 밝게 보인다.
 * 두 그림은 이미 같은 배율·여백·배경으로 맞춰 왼쪽 위가 캡처 대상의 같은 자리다.
 * @codocs [[피그마 연동:캡처 표]]
 * @param page 브라우저 맥락을 가져올 페이지
 * @param figma 피그마 그림(captureFigma 결과)
 * @param code 코드 그림(captureCode 결과)
 * @param background 두 그림의 배경색
 * @returns 차이 그림 PNG
 */
export async function diffImage(
  page: Page,
  figma: Buffer,
  code: Buffer,
  background: string,
): Promise<Buffer> {
  const figmaSize = pngSize(figma);
  const codeSize = pngSize(code);
  const size = {
    width: Math.max(figmaSize.width, codeSize.width),
    height: Math.max(figmaSize.height, codeSize.height),
  };
  const composer = await page.context().newPage();
  try {
    const dataUrl = await composer.evaluate(
      /**
       * 브라우저에서 두 그림을 배경색 캔버스에 놓고 difference로 겹친다.
       * @param input 그림 두 장(data URL), 캔버스 크기(기기 픽셀), 배경색
       * @param input.figma 피그마 그림
       * @param input.code 코드 그림
       * @param input.width 캔버스 너비
       * @param input.height 캔버스 높이
       * @param input.background 배경색
       * @returns 차이 그림 data URL
       */
      async (input: {
        figma: string;
        code: string;
        width: number;
        height: number;
        background: string;
      }) => {
        /**
         * data URL 그림을 풀어 둔다.
         * @param source data URL
         * @returns 다 풀린 그림
         */
        async function load(source: string): Promise<HTMLImageElement> {
          const image = new Image();
          image.src = source;
          await image.decode();
          return image;
        }
        /**
         * 그림을 배경색 캔버스(캔버스 크기)에 놓는다. 작은 그림의 빈 곳도 배경색이 된다.
         * @param image 그림
         * @returns 캔버스
         */
        function onBackground(image: HTMLImageElement): HTMLCanvasElement {
          const canvas = document.createElement('canvas');
          canvas.width = input.width;
          canvas.height = input.height;
          const context = canvas.getContext('2d');
          if (context === null) {
            throw new Error('캔버스 2D 맥락을 만들 수 없다.');
          }
          context.fillStyle = input.background;
          context.fillRect(0, 0, input.width, input.height);
          context.drawImage(image, 0, 0);
          return canvas;
        }
        const [figmaImage, codeImage] = await Promise.all([load(input.figma), load(input.code)]);
        const result = onBackground(figmaImage);
        const context = result.getContext('2d');
        if (context === null) {
          throw new Error('캔버스 2D 맥락을 만들 수 없다.');
        }
        context.globalCompositeOperation = 'difference';
        context.drawImage(onBackground(codeImage), 0, 0);
        return result.toDataURL('image/png');
      },
      {
        figma: `${PNG_DATA_URL_PREFIX}${figma.toString('base64')}`,
        code: `${PNG_DATA_URL_PREFIX}${code.toString('base64')}`,
        width: size.width,
        height: size.height,
        background,
      },
    );
    return Buffer.from(dataUrl.slice(PNG_DATA_URL_PREFIX.length), 'base64');
  } finally {
    await composer.close();
  }
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
        `<img id="image" alt="" style="${positionStyle(placed)}" src="${PNG_DATA_URL_PREFIX}${png.toString('base64')}"></div></body>`,
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
