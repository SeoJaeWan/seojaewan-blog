import type { BrowserContext, Locator, Page } from '@playwright/test';

import type { FigmaLayer } from './figma-layers.ts';

// vector 레이어 비교용으로 코드 요소만 그린 이미지와, 같은 위치에 그린 피그마 SVG 이미지를 찍는다.

// 코드 요소만 남기려고 잠시 다는 속성이다.
const KEEP_ATTRIBUTE = 'data-parity-keep';
const NEUTRALIZE_STYLE_ID = 'parity-vector-neutralize';

export type VectorCapture = { expected: Buffer; actual: Buffer };

/**
 * vector 레이어의 코드 요소만 그린 스크린샷과, 피그마 SVG를 같은 페이지 좌표에 그린 스크린샷을 찍는다.
 * 다른 요소는 칠·선·글자·그림자만 투명하게 하고 그대로 두어, 마우스 hover·pressed 같은 상태가 바뀌지 않게 한다.
 * 두 이미지는 같은 Chromium이 같은 소수 위치와 배율로 그리므로, 차이는 모양과 색의 차이다.
 * @codocs [[피그마 일치 검사:벡터 비교]]
 * @param context 스토리와 같은 배율의 브라우저 컨텍스트
 * @param page 스토리 페이지(상호작용을 마친 상태)
 * @param element 레이어와 짝인 코드 요소
 * @param layer 피그마 vector 레이어
 * @param svg 피그마 SVG 내용
 * @param scale 장치 배율
 * @returns 피그마·코드 이미지(PNG)
 */
export async function captureVector(
  context: BrowserContext,
  page: Page,
  element: Locator,
  layer: FigmaLayer,
  svg: string,
  scale: number,
): Promise<VectorCapture> {
  const bounds = layer.svg ?? { x: 0, y: 0, width: layer.width, height: layer.height };
  const rect = await element.evaluate((node) => {
    const box = node.getBoundingClientRect();
    return { x: box.left + window.scrollX, y: box.top + window.scrollY };
  });
  const left = rect.x + bounds.x;
  const top = rect.y + bounds.y;
  const clip = deviceClip(left, top, bounds.width, bounds.height, scale);

  await element.evaluate(isolate, { keep: KEEP_ATTRIBUTE, styleId: NEUTRALIZE_STYLE_ID });
  let actual: Buffer;
  try {
    actual = await page.screenshot({
      clip,
      omitBackground: true,
      animations: 'disabled',
      caret: 'hide',
      scale: 'device',
    });
  } finally {
    await page.evaluate(restore, { keep: KEEP_ATTRIBUTE, styleId: NEUTRALIZE_STYLE_ID });
  }

  const blank = await context.newPage();
  try {
    const viewport = page.viewportSize();
    if (viewport !== null) {
      await blank.setViewportSize(viewport);
    }
    await blank.setContent(
      `<!doctype html><style>html,body{margin:0;background:transparent}svg{display:block}</style>` +
        `<div style="position:absolute;left:${left}px;top:${top}px;width:${bounds.width}px;height:${bounds.height}px">${prefixIds(svg)}</div>`,
    );
    const expected = await blank.screenshot({
      clip,
      omitBackground: true,
      animations: 'disabled',
      scale: 'device',
    });
    return { expected, actual };
  } finally {
    await blank.close();
  }
}

/**
 * 소수 위치의 영역을 장치 픽셀 경계로 넓힌다. 왼쪽 위는 내리고 오른쪽 아래는 올린다.
 * @param x 왼쪽(CSS px)
 * @param y 위(CSS px)
 * @param width 폭
 * @param height 높이
 * @param scale 장치 배율
 * @returns 스크린샷 영역(CSS px)
 */
export function deviceClip(
  x: number,
  y: number,
  width: number,
  height: number,
  scale: number,
): { x: number; y: number; width: number; height: number } {
  const left = Math.floor(x * scale + 1e-6) / scale;
  const top = Math.floor(y * scale + 1e-6) / scale;
  const right = Math.ceil((x + width) * scale - 1e-6) / scale;
  const bottom = Math.ceil((y + height) * scale - 1e-6) / scale;
  return { x: left, y: top, width: right - left, height: bottom - top };
}

/**
 * SVG 안 id와 그 참조에 접두사를 붙여, 같은 문서에 그려도 다른 SVG와 id가 겹치지 않게 한다.
 * @param svg SVG 문자열
 * @returns 접두사를 붙인 SVG
 */
function prefixIds(svg: string): string {
  return svg
    .replace(/(\sid=")([^"]+")/gu, '$1figma-$2')
    .replace(/url\(#/gu, 'url(#figma-')
    .replace(/(href=")#/gu, '$1#figma-');
}

/**
 * 브라우저에서 실행한다. 대상 요소와 그 자손의 색을 고정하고, 나머지 요소는 칠·선·글자·그림자를 투명하게 한다.
 * @param target 대상 요소
 * @param options 속성 이름과 스타일 id
 * @param options.keep 대상에 다는 속성
 * @param options.styleId 넣을 스타일 요소 id
 */
function isolate(target: Element, options: { keep: string; styleId: string }): void {
  const kept = [target, ...target.querySelectorAll('*')];
  for (const node of kept) {
    if (node instanceof HTMLElement || node instanceof SVGElement) {
      const style = getComputedStyle(node);
      node.setAttribute(options.keep, '');
      node.style.setProperty('color', style.color, 'important');
      node.style.setProperty('fill', style.fill, 'important');
      node.style.setProperty('stroke', style.stroke, 'important');
    }
  }
  const sheet = document.createElement('style');
  sheet.id = options.styleId;
  const others = `:not([${options.keep}])`;
  sheet.textContent = `
    ${others}, ${others}::before, ${others}::after, ${others}::placeholder {
      background: none !important;
      border-color: transparent !important;
      outline-color: transparent !important;
      box-shadow: none !important;
      text-shadow: none !important;
      color: transparent !important;
      -webkit-text-fill-color: transparent !important;
      caret-color: transparent !important;
      fill: transparent !important;
      stroke: transparent !important;
      backdrop-filter: none !important;
    }
  `;
  document.head.append(sheet);
}

/**
 * 브라우저에서 실행한다. isolate가 바꾼 것을 되돌린다.
 * @param options 속성 이름과 스타일 id
 * @param options.keep 대상에 단 속성
 * @param options.styleId 넣은 스타일 요소 id
 */
function restore(options: { keep: string; styleId: string }): void {
  document.getElementById(options.styleId)?.remove();
  for (const node of document.querySelectorAll(`[${options.keep}]`)) {
    node.removeAttribute(options.keep);
    if (node instanceof HTMLElement || node instanceof SVGElement) {
      node.style.removeProperty('color');
      node.style.removeProperty('fill');
      node.style.removeProperty('stroke');
    }
  }
}
