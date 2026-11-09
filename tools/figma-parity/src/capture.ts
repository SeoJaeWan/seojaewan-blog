import type { Locator, Page } from '@playwright/test';

// 캡처 표의 세 그림(피그마, 코드, 차이)을 만든다. 피그마 변형 PNG와 코드 캡처를 같은 배율·여백·배경으로 맞추고,
// 둘을 Chromium 캔버스에서 `difference`로 겹쳐 차이 그림을 만든다. 판정하지 않는다. 사람이 PR 댓글에서 본다.
// 조립도 피그마 그림과 같은 조건으로 비교하고(참고용), parity-captures의 이전 코드 그림과도 같은 차이 그림을 만든다.

// 캡처 대상(피그마는 변형 노드) 둘레에 두는 가장 작은 여백(CSS px)이다. 그림자가 이보다 넓으면 그만큼 넓힌다.
export const CAPTURE_MARGIN = 24;
// 화면보다 큰 대상을 찍을 때 피그마 PNG 크기에 더하는 화면 여유분(CSS px)이다.
// - 코드 그림은 노드 둘레에 여백(24px 이상)을 두므로 그림자 없는 피그마 PNG보다 방향마다 최대 2 × 24px 크다.
// - Storybook 기본 배치는 스토리 루트에 16px 안쪽 여백을 둔다. padded는 대상을 오른쪽 아래로 16px 밀어 반대쪽 여백과
//   그림자가 그만큼 화면 끝에 가까워지고, centered는 이 여백이 양쪽에 붙는다.
// 대상이 어느 쪽으로 치우쳐도 반대쪽이 잘리지 않게 두 가지를 양쪽 모두 더해 2 × (24 + 16) = 80px를 둔다.
export const VIEWPORT_SLACK = 80;
// 배경이 투명하면 브라우저가 칠하는 기본 배경이다.
const DEFAULT_BACKGROUND = 'rgb(255, 255, 255)';
const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const PNG_DATA_URL_PREFIX = 'data:image/png;base64,';

/** CSS px 사각형 */
export type Rect = { x: number; y: number; width: number; height: number };

/** CSS px 크기 */
export type Size = { width: number; height: number };

/**
 * 캡처할 영역.
 * - canvas: 여백을 더한 전체 영역의 크기(CSS px, 정수)
 * - clip: 화면 안에서 실제로 찍을 영역(CSS px, 정수)
 * - offset: 찍은 영역을 전체 영역 안에 놓을 위치
 */
export type CaptureRegion = {
  canvas: Size;
  clip: Rect;
  offset: { x: number; y: number };
};

/** 노드 둘레로 그림자가 나가는 폭(CSS px) */
export type Extents = { left: number; right: number; top: number; bottom: number };

/** box-shadow 층 하나(CSS px) */
export type ShadowLayer = { x: number; y: number; blur: number; spread: number; isInset: boolean };

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
      return { x, y, blur, spread, isInset: /\binset\b/u.test(withoutColor) };
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
  for (const layer of layers.filter((item) => !item.isInset)) {
    const reach = layer.blur + layer.spread;
    extents.left = Math.max(extents.left, reach - layer.x);
    extents.right = Math.max(extents.right, reach + layer.x);
    extents.top = Math.max(extents.top, reach - layer.y);
    extents.bottom = Math.max(extents.bottom, reach + layer.y);
  }
  return extents;
}

/**
 * 피그마와 코드에 함께 쓸 여백을 정한다. 그림자와 노드 밖으로 나온 자식이 잘리지 않을 만큼 넓힌다.
 * @codocs [[피그마 연동:캡처 표]]
 * @param extents 노드 둘레로 나가는 폭(코드의 그림자, 코드의 노드 밖 자식, 피그마 PNG의 노드 밖 부분 등)
 * @returns 여백(CSS px, 정수)
 */
export function captureMargin(...extents: Extents[]): number {
  return Math.ceil(
    Math.max(
      CAPTURE_MARGIN,
      ...extents.flatMap((item) => [item.left, item.right, item.top, item.bottom]),
    ),
  );
}

/**
 * 피그마 PNG 안에서 변형 노드가 놓인 자리를 정한다. 플러그인이 적은 노드 위치가 있으면 그대로 쓴다.
 * 없는 예전 내보내기는 코드 루트 그림자의 폭만큼 PNG가 넓다고 보고 짐작한다. 짐작한 폭이 PNG보다 크면 PNG 전체를 노드로 본다.
 * @codocs [[피그마 연동:캡처 표]]
 * @param png 피그마 PNG의 크기(CSS px, 배율로 나눈 값)
 * @param node export.json의 PNG 안 노드 위치(배율 1의 px)
 * @param fallback 노드 위치가 없을 때 쓸 코드 루트 그림자의 폭
 * @returns PNG 안 노드 둘레로 나간 폭과 노드 크기
 */
export function figmaNodeLayout(
  png: Size,
  node: Rect | null,
  fallback: Extents,
): { extents: Extents; size: Size } {
  if (node !== null) {
    return {
      extents: {
        left: node.x,
        top: node.y,
        right: png.width - node.x - node.width,
        bottom: png.height - node.y - node.height,
      },
      size: { width: node.width, height: node.height },
    };
  }
  const canFit =
    png.width - fallback.left - fallback.right > 0 &&
    png.height - fallback.top - fallback.bottom > 0;
  const extents = canFit ? fallback : noExtents;
  return {
    extents,
    size: {
      width: png.width - extents.left - extents.right,
      height: png.height - extents.top - extents.bottom,
    },
  };
}

/**
 * 피그마 그림과 코드 그림을 같은 크기로 만들 캔버스 크기를 정한다. 노드 크기가 다르면 큰 쪽에 맞춘다.
 * @codocs [[피그마 연동:캡처 표]]
 * @param sizes 그림 크기(CSS px)
 * @returns 캔버스 크기(CSS px, 정수)
 */
export function commonCanvas(...sizes: Size[]): Size {
  return {
    width: Math.ceil(Math.max(...sizes.map((size) => size.width))),
    height: Math.ceil(Math.max(...sizes.map((size) => size.height))),
  };
}

/**
 * 스토리를 열 화면 크기를 정한다. 기본 화면(Playwright 기기 설정)에 대상(컴포넌트는 피그마 PNG, 조립은 코드 대상)과 여유분이
 * 들어가면 그대로 두고, 들어가지 않는 방향만 대상 크기에 여유분을 더한 만큼 키운다. 작은 대상은 화면이 그대로라 캡처가 바뀌지 않는다.
 * @codocs [[피그마 연동:캡처 표]]
 * @param content 대상 크기(CSS px, 배율로 나눈 값. 노드와 그 둘레로 나간 부분)
 * @param viewport 기본 화면 크기
 * @returns 스토리를 열 화면 크기(CSS px, 정수)
 */
export function captureViewport(content: Size, viewport: Size): Size {
  return {
    width: Math.max(viewport.width, Math.ceil(content.width + VIEWPORT_SLACK)),
    height: Math.max(viewport.height, Math.ceil(content.height + VIEWPORT_SLACK)),
  };
}

/**
 * 상자의 왼쪽 위 모서리를 가장 가까운 정수 픽셀에 놓으려면 옮겨야 하는 거리를 구한다. 컴포넌트 스토리는 대상이 화면 가운데라
 * 위치가 소수(예: 757.84)이고, `captureRegion`은 좌표를 내림해 자르므로 그대로 찍으면 코드 그림 안에서 대상이 그만큼 밀린다.
 * 피그마 그림은 노드가 정수 위치에 있다.
 * @codocs [[피그마 연동:캡처 표]]
 * @param box 캡처 대상의 테두리 상자
 * @returns 가로·세로로 옮길 거리(CSS px, 절댓값 0.5 이하)
 */
export function integerShift(box: Rect): { x: number; y: number } {
  return { x: Math.round(box.x) - box.x, y: Math.round(box.y) - box.y };
}

/**
 * 캡처 대상의 왼쪽 위 모서리를 정수 픽셀 위치에 놓고 그 테두리 상자를 돌려준다. 문서 루트(`<html>`)를 상대 위치(`position: relative`와
 * `left`·`top`)로 옮겨 페이지 전체의 레이아웃 좌표를 옮긴다. 대상의 크기와 안쪽 배치는 그대로고, 포털로 그린 팝업(문서 루트를
 * 기준으로 놓이는 절대 위치)도 대상과 함께 움직여 서로의 위치가 유지된다.
 * `translate`로 옮기지 않는다. Chromium은 소수 위치의 상자를 그릴 때 이미 가까운 정수 픽셀로 맞춰 그리므로, 그 위에 소수 `translate`를
 * 더하면 맞춰 그린 선이 다시 소수 위치로 밀려 두 픽셀에 번진다(0.5px이면 두 줄이 같은 진하기가 된다).
 * @codocs [[피그마 연동:캡처 표]]
 * @param page 스토리 페이지
 * @param target 캡처 대상
 * @param box 옮기기 전 대상의 테두리 상자
 * @returns 정수 위치에 놓은 테두리 상자
 */
async function snapToPixel(page: Page, target: Locator, box: Rect): Promise<Rect> {
  const shift = integerShift(box);
  if (shift.x === 0 && shift.y === 0) {
    return box;
  }
  await page.evaluate(
    /**
     * 브라우저에서 문서 루트를 옮긴다.
     * @param offset 옮길 거리
     * @param offset.x 가로
     * @param offset.y 세로
     */
    (offset) => {
      const { style } = document.documentElement;
      style.position = 'relative';
      style.left = `${String(offset.x)}px`;
      style.top = `${String(offset.y)}px`;
    },
    shift,
  );
  const moved = await target.boundingBox();
  if (moved === null) {
    throw new Error('캡처 대상이 화면에 보이지 않는다.');
  }
  // 옮긴 뒤 좌표의 부동소수점 오차로 내림이 한 칸 더 내려가지 않게 모서리를 정수로 못 박는다.
  return { ...moved, x: Math.round(moved.x), y: Math.round(moved.y) };
}

/**
 * 캡처 대상의 테두리 상자에 여백을 더한 영역을 정한다. 화면 밖으로 나가는 부분은 찍지 않고 배경으로 채운다.
 * 화면보다 큰 대상은 스토리를 열기 전에 화면을 키워 두므로(captureViewport) 화면 밖으로 나가는 곳은 페이지 왼쪽·위 바깥뿐이다.
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
 * 캡처 대상의 자식이 테두리 상자 밖으로 나가는 폭을 읽는다(절대 위치로 위에 겹친 꼬리 등). 여백이 이것을 자르지 않게 하는 데 쓴다.
 * @codocs [[피그마 연동:캡처 표]]
 * @param target 캡처 대상
 * @returns 방향마다 나가는 폭
 */
export async function readOverflowExtents(target: Locator): Promise<Extents> {
  const measured = await target.evaluate(
    /**
     * 브라우저에서 대상과 자손들의 테두리 상자, 자손을 잘라 내는 `<svg>` 상자를 모은다.
     * @param element 캡처 대상
     * @returns 대상의 상자와 자손들
     */
    (element) => {
      /**
       * 상자를 네 변 위치로 바꾼다.
       * @param rect 테두리 상자
       * @returns 네 변 위치
       */
      function edges(rect: DOMRect): Edges {
        return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
      }
      const descendants: DescendantBox[] = [];
      for (const child of element.querySelectorAll('*')) {
        const clips: ClipBox[] = [];
        for (
          let ancestor = child.parentElement;
          ancestor !== null && ancestor !== element.parentElement;
          ancestor = ancestor.parentElement
        ) {
          if (ancestor instanceof SVGSVGElement) {
            const style = getComputedStyle(ancestor);
            clips.push({
              ...edges(ancestor.getBoundingClientRect()),
              isClippedX: style.overflowX !== 'visible',
              isClippedY: style.overflowY !== 'visible',
            });
          }
        }
        descendants.push({ box: edges(child.getBoundingClientRect()), clips });
      }
      return { root: edges(element.getBoundingClientRect()), descendants };
    },
  );
  return overflowExtents(measured.root, measured.descendants);
}

/** 상자의 네 변 위치(CSS px) */
export type Edges = { left: number; right: number; top: number; bottom: number };

/** 안쪽 그림을 잘라 내는 `<svg>` 상자. `x`·`y`는 그 방향의 `overflow`가 `visible`이 아니라 잘라 낸다는 뜻이다 */
export type ClipBox = Edges & { isClippedX: boolean; isClippedY: boolean };

/** 대상 자손 하나의 테두리 상자와, 그것을 잘라 내는 바깥 `<svg>` 상자들 */
export type DescendantBox = { box: Edges; clips: readonly ClipBox[] };

// 가로·세로가 모두 이 크기(CSS px) 이하인 상자는 눈에 보이게 나온 것으로 치지 않는다.
const NEGLIGIBLE_BOX_SIZE = 1;

/**
 * 자손의 상자 중 실제로 그려지는 부분을 구한다. `<svg>` 안 도형은 `overflow`가 `visible`이 아닌 바깥 `<svg>` 상자 밖이
 * 잘려 그려지지 않는다. KaTeX 근호는 가로로 아주 긴 `<path>`를 `overflow: hidden`인 `<svg>`가 잘라 보여 주므로,
 * 잘리기 전 상자를 재면 여백이 수천 px로 커진다. HTML 요소의 `overflow`는 따지지 않는다(스크롤 영역 안 내용 등 기존 캡처 크기를 그대로 둔다).
 * 가로·세로가 모두 1px 이하인 상자도 버린다. 화면 읽기 전용 요소와 Base UI 메뉴의 포커스 가드(`position: fixed`, 뷰포트 (0,0)의
 * 1×1 SPAN)가 이런 상자이고, 이것들이 대상 밖에 있다고 여백을 키우면 캡처가 뷰포트 크기만큼 커진다.
 * 속성(fixed, aria-hidden, 라이브러리 전용 속성)으로 거르면 너무 좁거나 정당한 팝업까지 빠져 크기로 판단한다.
 * @codocs [[피그마 연동:캡처 표]]
 * @param descendant 자손의 상자와 그것을 잘라 내는 `<svg>` 상자
 * @returns 그려지는 상자. 보이지 않거나 모두 잘렸으면 undefined
 */
export function paintedBox(descendant: DescendantBox): Edges | undefined {
  let { left, right, top, bottom } = descendant.box;
  for (const clip of descendant.clips) {
    if (clip.isClippedX) {
      left = Math.max(left, clip.left);
      right = Math.min(right, clip.right);
    }
    if (clip.isClippedY) {
      top = Math.max(top, clip.top);
      bottom = Math.min(bottom, clip.bottom);
    }
  }
  if (left > right || top > bottom) {
    return undefined;
  }
  if (right - left <= NEGLIGIBLE_BOX_SIZE && bottom - top <= NEGLIGIBLE_BOX_SIZE) {
    return undefined;
  }
  return { left, right, top, bottom };
}

/**
 * 자손들이 대상 상자 밖으로 나간 폭을 구한다.
 * @codocs [[피그마 연동:캡처 표]]
 * @param root 캡처 대상의 테두리 상자
 * @param descendants 자손들의 상자
 * @returns 방향마다 나간 폭
 */
export function overflowExtents(root: Edges, descendants: readonly DescendantBox[]): Extents {
  const extents = { ...noExtents };
  for (const descendant of descendants) {
    const painted = paintedBox(descendant);
    if (painted === undefined) {
      continue;
    }
    extents.left = Math.max(extents.left, root.left - painted.left);
    extents.right = Math.max(extents.right, painted.right - root.right);
    extents.top = Math.max(extents.top, root.top - painted.top);
    extents.bottom = Math.max(extents.bottom, painted.bottom - root.bottom);
  }
  return extents;
}

/**
 * 피그마 변형 PNG를 여백을 둔 배경 위에 놓는다. PNG는 `scale` 배율로, 그림자와 노드 밖 자식만큼 넓혀 내보냈으므로
 * 그 폭(PNG 안 노드 위치)을 빼 변형 노드가 코드 캡처의 캡처 대상과 같은 자리(여백만큼 안쪽)에 오게 한다.
 * @codocs [[피그마 연동:캡처 표]]
 * @param page 같은 배율로 연 페이지(이 페이지의 브라우저 맥락에서 합성한다)
 * @param png 피그마 변형 PNG(배경 투명)
 * @param options 배율, 배경색, PNG 안 노드 둘레로 나간 폭, 여백, 캔버스 크기
 * @param options.scale figma.json의 배율
 * @param options.background 배경색
 * @param options.extents PNG 안 노드 둘레로 나간 폭(figmaNodeLayout 결과)
 * @param options.margin 여백
 * @param options.canvas 캔버스 크기(코드 그림과 같은 크기)
 * @returns 합성한 PNG
 */
export async function captureFigma(
  page: Page,
  png: Buffer,
  options: { scale: number; background: string; extents: Extents; margin: number; canvas: Size },
): Promise<Buffer> {
  const size = pngSize(png);
  const width = size.width / options.scale;
  const height = size.height / options.scale;
  return compose(
    page,
    png,
    {
      x: options.margin - options.extents.left,
      y: options.margin - options.extents.top,
      width,
      height,
    },
    options.canvas,
    options.background,
  );
}

/**
 * 그림을 같은 크기의 캔버스로 넓힌다. 왼쪽 위(노드 자리)는 그대로 두고 남는 곳을 배경색으로 채운다.
 * @codocs [[피그마 연동:캡처 표]]
 * @param page 같은 배율로 연 페이지
 * @param png 그림
 * @param scale 배율
 * @param canvas 캔버스 크기(CSS px)
 * @param background 배경색
 * @returns 넓힌 PNG. 이미 같은 크기면 그대로다
 */
export async function fitCanvas(
  page: Page,
  png: Buffer,
  scale: number,
  canvas: Size,
  background: string,
): Promise<Buffer> {
  const size = pngSize(png);
  const width = size.width / scale;
  const height = size.height / scale;
  if (width === canvas.width && height === canvas.height) {
    return png;
  }
  return compose(page, png, { x: 0, y: 0, width, height }, canvas, background);
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
  const first = await target.boundingBox();
  if (first === null) {
    throw new Error('캡처 대상이 화면에 보이지 않는다.');
  }
  const box = await snapToPixel(page, target, first);
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
 * 기준 그림(피그마 그림, 조립은 이전 코드 그림도)과 코드 그림의 차이 그림을 만든다. 두 그림을 같은 크기(큰 쪽)의
 * 배경색 캔버스에 왼쪽 위를 맞춰 놓고, 캔버스 `globalCompositeOperation = 'difference'`로 겹친다. 같은 곳은 검정, 다른 곳은
 * 밝게 보인다. 두 그림은 같은 배율·여백·배경으로 맞춰 왼쪽 위가 캡처 대상의 같은 자리다.
 * @codocs [[피그마 연동:캡처 표]]
 * @param page 브라우저 맥락을 가져올 페이지
 * @param reference 기준 그림(captureFigma 결과나 parity-captures의 이전 코드 그림)
 * @param code 코드 그림(captureCode 결과)
 * @param background 두 그림의 배경색
 * @returns 차이 그림 PNG
 */
export async function diffImage(
  page: Page,
  reference: Buffer,
  code: Buffer,
  background: string,
): Promise<Buffer> {
  const referenceSize = pngSize(reference);
  const codeSize = pngSize(code);
  const size = {
    width: Math.max(referenceSize.width, codeSize.width),
    height: Math.max(referenceSize.height, codeSize.height),
  };
  const composer = await page.context().newPage();
  try {
    const dataUrl = await composer.evaluate(
      /**
       * 브라우저에서 두 그림을 배경색 캔버스에 놓고 difference로 겹친다.
       * @param input 그림 두 장(data URL), 캔버스 크기(기기 픽셀), 배경색
       * @param input.reference 기준 그림
       * @param input.code 코드 그림
       * @param input.width 캔버스 너비
       * @param input.height 캔버스 높이
       * @param input.background 배경색
       * @returns 차이 그림 data URL
       */
      async (input: {
        reference: string;
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
        const [referenceImage, codeImage] = await Promise.all([
          load(input.reference),
          load(input.code),
        ]);
        const result = onBackground(referenceImage);
        const context = result.getContext('2d');
        if (context === null) {
          throw new Error('캔버스 2D 맥락을 만들 수 없다.');
        }
        context.globalCompositeOperation = 'difference';
        context.drawImage(onBackground(codeImage), 0, 0);
        return result.toDataURL('image/png');
      },
      {
        reference: `${PNG_DATA_URL_PREFIX}${reference.toString('base64')}`,
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
