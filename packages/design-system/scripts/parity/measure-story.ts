import type { Locator, Page } from '@playwright/test';

import type { MeasuredElement, VariantMeasurement } from './measured-element.ts';
import { MEASURED_STYLE_PROPERTIES } from './measured-element.ts';
import {
  FIGMA_LAYER_ATTRIBUTE,
  FIGMA_ROOT_ATTRIBUTE,
  FIGMA_STROKE_ATTRIBUTE,
} from './parity-config.ts';

// 측정한 요소에 잠시 다는 번호 속성이다. Chromium DevTools 프로토콜로 같은 요소를 다시 찾을 때 쓴다.
const MEASURE_ATTRIBUTE = 'data-parity-measure';
// 글리프 잉크 영역을 잴 때 캔버스를 키우는 배율이다. 1/8px 단위로 가장자리를 찾는다.
const INK_SCALE = 8;
// 이 불투명도(0~255)보다 진한 픽셀을 잉크로 본다. 가장자리 안티앨리어싱의 절반 지점이 윤곽선이다.
const INK_ALPHA = 127;

type MeasureOptions = {
  properties: readonly string[];
  layerAttribute: string;
  rootAttribute: string;
  strokeAttribute: string;
  measureAttribute: string;
  inkScale: number;
  inkAlpha: number;
};

/**
 * 비교 요소 안의 피그마 루트와 `data-figma` 요소를 브라우저에서 잰다(위치, 계산된 스타일, 글자, 잉크, 이미지 해시, 그린 서체).
 * @codocs [[피그마 일치 검사:값 비교]]
 * @param page 스토리 페이지
 * @param target 비교 요소(data-parity-target 또는 #storybook-root의 첫 요소)
 * @returns 변형 측정값
 */
export async function measureVariant(page: Page, target: Locator): Promise<VariantMeasurement> {
  const options: MeasureOptions = {
    properties: MEASURED_STYLE_PROPERTIES,
    layerAttribute: FIGMA_LAYER_ATTRIBUTE,
    rootAttribute: FIGMA_ROOT_ATTRIBUTE,
    strokeAttribute: FIGMA_STROKE_ATTRIBUTE,
    measureAttribute: MEASURE_ATTRIBUTE,
    inkScale: INK_SCALE,
    inkAlpha: INK_ALPHA,
  };
  const measured = await target.evaluate(measureInBrowser, options);
  const fonts = await platformFonts(page, measured.textIndexes);
  /**
   * 측정값에 실제로 그린 서체를 붙인다.
   * @param element 측정값
   * @param index 측정 번호
   * @returns 서체를 붙인 측정값
   */
  function withFonts(element: MeasuredElement, index: number): MeasuredElement {
    return element.text === null
      ? element
      : { ...element, text: { ...element.text, platformFonts: fonts.get(index) ?? null } };
  }
  await page.evaluate(removeAttribute, MEASURE_ATTRIBUTE);
  return {
    root: withFonts(measured.root, 0),
    elements: measured.elements.map((element, index) => withFonts(element, index + 1)),
  };
}

/**
 * 브라우저에서 실행한다. 모든 요소에서 속성을 지운다.
 * @param attribute 속성 이름
 */
function removeAttribute(attribute: string): void {
  for (const element of document.querySelectorAll(`[${attribute}]`)) {
    element.removeAttribute(attribute);
  }
}

/**
 * Chromium DevTools 프로토콜로 요소의 글자를 실제로 그린 서체 이름을 읽는다.
 * @param page 스토리 페이지
 * @param indexes 측정 번호 목록
 * @returns 측정 번호 → 서체 이름 목록
 */
async function platformFonts(
  page: Page,
  indexes: readonly number[],
): Promise<Map<number, string[]>> {
  const result = new Map<number, string[]>();
  const session = await page.context().newCDPSession(page);
  try {
    await session.send('DOM.enable');
    await session.send('CSS.enable');
    const { root } = await session.send('DOM.getDocument', { depth: -1, pierce: true });
    for (const index of indexes) {
      const { nodeId } = await session.send('DOM.querySelector', {
        nodeId: root.nodeId,
        selector: `[${MEASURE_ATTRIBUTE}="${index}"]`,
      });
      if (nodeId === 0) {
        continue;
      }
      const { fonts } = await session.send('CSS.getPlatformFontsForNode', { nodeId });
      result.set(
        index,
        fonts.filter((font) => font.glyphCount > 0).map((font) => font.familyName),
      );
    }
  } finally {
    await session.detach();
  }
  return result;
}

/**
 * 브라우저에서 실행한다. 루트와 data-figma 요소를 잰다.
 * @param target 비교 요소
 * @param options 읽을 속성과 속성 이름
 * @returns 루트, 요소 측정값, 서체를 읽을 측정 번호
 */
async function measureInBrowser(
  target: Element,
  options: MeasureOptions,
): Promise<{ root: MeasuredElement; elements: MeasuredElement[]; textIndexes: number[] }> {
  const rootSelector = `[${options.rootAttribute}]`;
  const root = target.matches(rootSelector)
    ? target
    : (target.querySelector(rootSelector) ?? target);
  const origin = root.getBoundingClientRect();
  const textIndexes: number[] = [];
  const shapeSelector = 'path, circle, rect, ellipse, polygon, polyline, line';

  /**
   * 계산된 스타일에서 필요한 속성만 꺼낸다.
   * @param style 계산된 스타일
   * @returns 속성 → 값
   */
  function pick(style: CSSStyleDeclaration): Record<string, string> {
    return Object.fromEntries(
      options.properties.map((property) => [property, style.getPropertyValue(property)]),
    );
  }

  /**
   * 주소의 바이트를 받아 SHA-1을 계산한다.
   * @param url 이미지 주소
   * @returns 16진수 SHA-1, 받지 못하면 null
   */
  async function sha1(url: string): Promise<string | null> {
    try {
      const response = await fetch(url);
      const digest = await crypto.subtle.digest('SHA-1', await response.arrayBuffer());
      return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
    } catch {
      return null;
    }
  }

  /**
   * 글자 한 줄의 잉크 영역을 캔버스에 키워 그려 찾는다.
   * @param line 글자
   * @param style 글자 요소의 계산된 스타일
   * @param startX 줄 시작 x(페이지 기준)
   * @param baseline 기준선 y(페이지 기준)
   * @returns 잉크 영역(페이지 기준), 잉크가 없으면 null
   */
  function lineInk(
    line: string,
    style: CSSStyleDeclaration,
    startX: number,
    baseline: number,
  ): DOMRect | null {
    const scale = options.inkScale;
    const size = parseFloat(style.fontSize);
    const probe = document.createElement('canvas').getContext('2d');
    if (probe === null) {
      return null;
    }
    const font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    probe.font = font;
    probe.letterSpacing = style.letterSpacing === 'normal' ? '0px' : style.letterSpacing;
    const width = Math.ceil((probe.measureText(line).width + size * 2) * scale);
    const height = Math.ceil(size * 3 * scale);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (context === null) {
      return null;
    }
    context.scale(scale, scale);
    context.font = font;
    context.letterSpacing = probe.letterSpacing;
    context.textBaseline = 'alphabetic';
    context.fillText(line, size, size * 2);
    const data = context.getImageData(0, 0, width, height).data;
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        if ((data[(y * width + x) * 4 + 3] ?? 0) > options.inkAlpha) {
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
        }
      }
    }
    if (maxX < 0) {
      return null;
    }
    const left = startX + minX / scale - size;
    const top = baseline + minY / scale - size * 2;
    return new DOMRect(left, top, (maxX + 1 - minX) / scale, (maxY + 1 - minY) / scale);
  }

  /**
   * 글자 요소의 기준선을 구한다. 글자 조각의 위쪽(내용 영역 위)에 기본 서체의 어센트를 더한다.
   * @param style 계산된 스타일
   * @returns 어센트와 디센트(px)
   */
  function fontMetrics(style: CSSStyleDeclaration): { ascent: number; descent: number } {
    const context = document.createElement('canvas').getContext('2d');
    if (context === null) {
      return { ascent: 0, descent: 0 };
    }
    context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    const metrics = context.measureText('Hg');
    return { ascent: metrics.fontBoundingBoxAscent, descent: metrics.fontBoundingBoxDescent };
  }

  /**
   * 요소 안 글자의 잉크 영역을 줄마다 재서 합친다. 입력창은 내용 상자에서 줄 위치를 계산한다.
   * @param element 글자 요소
   * @param content 보이는 글자
   * @returns 잉크 영역(루트 기준), 잴 수 없으면 null
   */
  function textInk(element: Element, content: string): DOMRect | null {
    const boxes: DOMRect[] = [];
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      const { ascent, descent } = fontMetrics(style);
      const lineHeight = parseFloat(style.lineHeight);
      const contentTop = rect.top + parseFloat(style.borderTopWidth) + parseFloat(style.paddingTop);
      const contentHeight =
        rect.height -
        parseFloat(style.borderTopWidth) -
        parseFloat(style.borderBottomWidth) -
        parseFloat(style.paddingTop) -
        parseFloat(style.paddingBottom);
      const lineTop = contentTop + (contentHeight - lineHeight) / 2;
      const baseline = lineTop + (lineHeight - (ascent + descent)) / 2 + ascent;
      const startX = rect.left + parseFloat(style.borderLeftWidth) + parseFloat(style.paddingLeft);
      const ink = lineInk(content, style, startX, baseline);
      if (ink !== null) {
        boxes.push(ink);
      }
    } else {
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
        const parent = node.parentElement;
        const text = node.textContent ?? '';
        if (parent === null || text.trim() === '') {
          continue;
        }
        const style = getComputedStyle(parent);
        const { ascent } = fontMetrics(style);
        const lines: { text: string; left: number; top: number }[] = [];
        const range = document.createRange();
        for (let index = 0; index < text.length; index += 1) {
          range.setStart(node, index);
          range.setEnd(node, index + 1);
          const rect = range.getClientRects()[0];
          if (rect === undefined) {
            continue;
          }
          const last = lines.at(-1);
          if (last !== undefined && Math.abs(last.top - rect.top) < 1) {
            last.text += text[index] ?? '';
          } else {
            lines.push({ text: text[index] ?? '', left: rect.left, top: rect.top });
          }
        }
        for (const line of lines) {
          const ink = lineInk(line.text, style, line.left, line.top + ascent);
          if (ink !== null) {
            boxes.push(ink);
          }
        }
      }
    }
    if (boxes.length === 0) {
      return null;
    }
    const left = Math.min(...boxes.map((box) => box.left));
    const top = Math.min(...boxes.map((box) => box.top));
    const right = Math.max(...boxes.map((box) => box.right));
    const bottom = Math.max(...boxes.map((box) => box.bottom));
    return new DOMRect(left - origin.left, top - origin.top, right - left, bottom - top);
  }

  /**
   * 요소와 의사 요소가 그리는 이미지를 모으고 바이트 해시를 계산한다.
   * @param element 요소
   * @returns 이미지 목록
   */
  async function images(element: Element): Promise<MeasuredElement['images']> {
    const found: MeasuredElement['images'] = [];
    if (element instanceof HTMLImageElement && element.currentSrc !== '') {
      found.push({
        source: 'img',
        url: element.currentSrc,
        sha1: await sha1(element.currentSrc),
        opacity: Number(getComputedStyle(element).opacity),
        repeat: 'no-repeat',
        size: getComputedStyle(element).objectFit,
      });
    }
    for (const [source, pseudo] of [
      ['background', null],
      ['::before', '::before'],
      ['::after', '::after'],
    ] as const) {
      const style = getComputedStyle(element, pseudo);
      if (pseudo !== null && style.content === 'none') {
        continue;
      }
      for (const match of style.backgroundImage.matchAll(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gu)) {
        const url = match[2] ?? '';
        found.push({
          source,
          url,
          sha1: await sha1(url),
          opacity: Number(style.opacity),
          repeat: style.backgroundRepeat,
          size: style.backgroundSize,
        });
      }
    }
    return found;
  }

  /**
   * 요소 하나를 잰다.
   * @param element 요소
   * @param path data-figma 값(루트는 빈 문자열)
   * @param index 측정 번호
   * @returns 측정값
   */
  async function measure(element: Element, path: string, index: number): Promise<MeasuredElement> {
    element.setAttribute(options.measureAttribute, String(index));
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    const isVisible =
      element.checkVisibility({ visibilityProperty: true }) && rect.width > 0 && rect.height > 0;
    const before = getComputedStyle(element, '::before');
    const after = getComputedStyle(element, '::after');
    const strokeOwner = document.querySelector(
      `[${options.strokeAttribute}="${CSS.escape(path)}"]`,
    );
    const strokeShape =
      strokeOwner === null
        ? null
        : strokeOwner.matches(shapeSelector)
          ? strokeOwner
          : strokeOwner.querySelector(shapeSelector);
    const shapes = [
      ...(element.matches(shapeSelector) ? [element] : []),
      ...element.querySelectorAll(shapeSelector),
    ];
    const shapeFills = shapes
      .map((shape) => getComputedStyle(shape).fill)
      .filter((fill) => fill !== 'none' && fill !== '');

    let text: MeasuredElement['text'] = null;
    const isField = element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement;
    const content = isField
      ? element.value === ''
        ? element.placeholder
        : element.value
      : element instanceof HTMLElement
        ? element.innerText
        : element.textContent;
    if (content.trim() !== '' && isVisible) {
      const isPlaceholder = isField && element.value === '';
      text = {
        content,
        color: isPlaceholder ? getComputedStyle(element, '::placeholder').color : style.color,
        ink: textInk(element, content),
        platformFonts: null,
      };
      textIndexes.push(index);
    }
    return {
      path,
      tag: element.tagName.toLowerCase(),
      visible: isVisible,
      box: {
        x: rect.left - origin.left,
        y: rect.top - origin.top,
        width: rect.width,
        height: rect.height,
      },
      style: pick(style),
      before: before.content === 'none' ? null : pick(before),
      after: after.content === 'none' ? null : pick(after),
      strokeSvg: strokeShape === null ? null : pick(getComputedStyle(strokeShape)),
      shapeFills,
      images: await images(element),
      text,
    };
  }

  const elements: MeasuredElement[] = [];
  let index = 1;
  for (const element of document.querySelectorAll(`[${options.layerAttribute}]`)) {
    elements.push(
      await measure(element, element.getAttribute(options.layerAttribute) ?? '', index),
    );
    index += 1;
  }
  return { root: await measure(root, '', 0), elements, textIndexes };
}
