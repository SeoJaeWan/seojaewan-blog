import { afterEach } from 'vitest';
import { commands } from 'vitest/browser';

import { type SvgAssetElement, svgAssets } from '../assets/asset-data';
import { imageAssets } from '../assets/image-data';
import type { ComponentLayout, VariantLayout } from '../figma-export/component-layout';
import { compareLayer, type ExpectedAsset, type Mismatch } from './compare-layout';
import { compareMotion, observeLayer } from './measure-layer';
import type { ParityModule, ParityStory } from './parity-manifest';

// @codocs [[디자인 시스템:생성 결과 검증]]
// 스토리 테스트(vitest.storybook.config.ts)의 설정 파일이다. 생성한 스토리(`*.gen.stories.tsx`)가 그려진 뒤, 같은 폴더의
// 검증 자료(`<이름>.layout.json`)와 짝 표(`<이름>.layers.gen.ts`)로 레이어마다 피그마 값과 브라우저 값을 견준다.
// 하나라도 다르면 그 스토리의 시험이 실패하고 어느 레이어의 어느 값이 다른지 낸다. 컴포넌트마다 손으로 쓰는 시험은 없다.

/** 생성한 스토리 파일의 끝 */
const STORY_SUFFIX = '.gen.stories.tsx';

/** 짝 표 파일의 끝 */
const PAIRS_SUFFIX = '.layers.gen.ts';

/** 검증 자료 파일의 끝 */
const LAYOUT_SUFFIX = '.layout.json';

const parityModules = import.meta.glob<ParityModule>('/src/**/*.layers.gen.ts');
const layoutModules = import.meta.glob<ComponentLayout>('/src/**/*.layout.json', {
  import: 'default',
});

afterEach(
  /**
   * 생성한 스토리 하나를 그린 뒤 피그마 값과 견준다.
   * @param context 시험 문맥
   */
  async (context) => {
    const file = context.task.file.filepath;
    if (!file.endsWith(STORY_SUFFIX)) {
      return;
    }
    const stem = file.slice(0, -STORY_SUFFIX.length);
    const pairsKey = Object.keys(parityModules).find((key) =>
      stem.endsWith(key.slice(0, -PAIRS_SUFFIX.length)),
    );
    const layoutKey = Object.keys(layoutModules).find((key) =>
      stem.endsWith(key.slice(0, -LAYOUT_SUFFIX.length)),
    );
    if (pairsKey === undefined || layoutKey === undefined) {
      throw new Error(
        `[생성 결과 검증] ${file}의 짝 표나 검증 자료(${LAYOUT_SUFFIX})를 찾지 못했다.`,
      );
    }
    const [parity, layout] = await Promise.all([
      parityModules[pairsKey]?.(),
      layoutModules[layoutKey]?.(),
    ]);
    const storyName = exportNameOf(context);
    const story = Object.entries(parity?.parityStories ?? {}).find(
      ([name]) => name === storyName,
    )?.[1];
    const variant = layout?.variants.find((candidate) => candidate.name === story?.variant);
    if (parity === undefined || story === undefined || variant === undefined) {
      throw new Error(
        `[생성 결과 검증] 스토리 \`${storyName}\`의 변형을 짝 표나 검증 자료에서 찾지 못했다.`,
      );
    }
    const mismatches = await verifyVariant(parity, story, variant);
    if (mismatches.length > 0) {
      throw new Error(
        [
          `[생성 결과 검증] ${layout?.name ?? ''} / ${variant.name}: 피그마와 다른 값 ${String(mismatches.length)}개`,
          ...mismatches.map(
            (mismatch) =>
              `  - ${mismatch.layer === '' ? '(루트)' : mismatch.layer} / ${mismatch.field}: 피그마 ${mismatch.expected}, 브라우저 ${mismatch.actual}`,
          ),
        ].join('\n'),
      );
    }
  },
);

/**
 * 시험 문맥에서 스토리 export 이름을 읽는다. addon-vitest가 문맥에 그린 스토리를 둔다.
 * @param context 시험 문맥
 * @returns 스토리 export 이름
 */
function exportNameOf(context: object): string {
  const story: unknown = Reflect.get(context, 'story');
  // 그린 스토리는 함수(composeStory의 결과)이고 이름을 `storyName`에 갖는다.
  const name: unknown =
    (typeof story === 'function' || typeof story === 'object') && story !== null
      ? Reflect.get(story, 'storyName')
      : undefined;
  return typeof name === 'string' ? name : '';
}

/**
 * 그려진 변형 하나를 견준다. 내용에 맞춰지는 글자는 폭을 검증 자료 값으로 고정하고, 상태 변형은 그 상태를 켜고,
 * 움직임 변형은 `data-motion`을 켠 뒤 견준다.
 * @codocs [[디자인 시스템:생성 결과 검증]]
 * @param parity 짝 표와 검증하는 법
 * @param story 이 스토리를 검증하는 법
 * @param variant 검증 자료의 변형
 * @returns 다른 값
 */
async function verifyVariant(
  parity: ParityModule,
  story: ParityStory,
  variant: VariantLayout,
): Promise<Mismatch[]> {
  const rootSelector = parity.layerPairs[''];
  const root = rootSelector === undefined ? null : uniqueElement(rootSelector);
  if (root === null) {
    return [
      {
        layer: '',
        field: '요소',
        expected: `${rootSelector ?? '(짝 없음)'} 하나`,
        actual: '없거나 여럿',
      },
    ];
  }
  for (const [key, measure] of Object.entries(variant.layers)) {
    const selector = parity.layerPairs[key];
    const element = selector === undefined ? null : uniqueElement(selector);
    if (measure.text?.autoResize === 'WIDTH_AND_HEIGHT' && element instanceof HTMLElement) {
      element.style.setProperty('width', `${String(measure.width)}px`);
    }
  }
  for (const { selector, name, value } of story.forcedAttributes) {
    uniqueElement(selector)?.setAttribute(name, value);
  }
  for (const { selector, pseudoClasses } of story.forcedStates) {
    await forcePseudoState(selector, pseudoClasses);
  }
  try {
    for (const animation of document.getAnimations()) {
      if (animation instanceof CSSTransition) {
        animation.finish();
      }
    }
    const mismatches = compareLayers(parity, story, variant, root);
    // 움직임은 가만히 있는 모습을 견준 뒤에 켠다. 켠 뒤에는 키프레임이 모습을 바꾸기 때문이다.
    if (story.motion !== null) {
      root.setAttribute('data-motion', story.motion);
      mismatches.push(...compareVariantMotion(parity, variant));
    }
    return mismatches;
  } finally {
    for (const { selector } of story.forcedStates) {
      await forcePseudoState(selector, []);
    }
  }
}

/**
 * 검증 자료의 레이어마다 짝 표의 요소를 찾아 견준다.
 * @param parity 짝 표
 * @param story 이 스토리를 검증하는 법
 * @param variant 검증 자료의 변형
 * @param root 컴포넌트 루트 요소
 * @returns 다른 값
 */
function compareLayers(
  parity: ParityModule,
  story: ParityStory,
  variant: VariantLayout,
  root: Element,
): Mismatch[] {
  const origin = root.getBoundingClientRect();
  const mismatches: Mismatch[] = [];
  for (const [key, measure] of Object.entries(variant.layers)) {
    const selector = parity.layerPairs[key];
    if (selector === undefined) {
      mismatches.push({ layer: key, field: '짝', expected: '짝 표의 선택자', actual: '없음' });
      continue;
    }
    const element = uniqueElement(selector);
    if (element === null) {
      mismatches.push({
        layer: key,
        field: '요소',
        expected: `${selector} 하나`,
        actual: '없거나 여럿',
      });
      continue;
    }
    const ignored = new Set(
      story.ignored.filter((item) => item.key === key).map((item) => item.field),
    );
    mismatches.push(
      ...compareLayer(key, measure, observeLayer(element, origin), {
        ignored,
        assetOf: expectedAsset,
      }),
    );
  }
  return mismatches;
}

/**
 * 움직임 변형의 키프레임을 견준다.
 * @param parity 짝 표
 * @param variant 검증 자료의 변형
 * @returns 다른 값
 */
function compareVariantMotion(parity: ParityModule, variant: VariantLayout): Mismatch[] {
  /**
   * 트랙이 걸린 요소를 찾는다. 자산 안쪽이면 선 그리기 경로다.
   * @param layer 레이어 키
   * @param assetLayer 자산 안쪽 레이어 경로
   * @returns 요소. 없으면 null
   */
  function elementOf(layer: string, assetLayer: string | null): Element | null {
    const selector = parity.layerPairs[layer];
    const element = selector === undefined ? null : uniqueElement(selector);
    return assetLayer === null ? element : (element?.querySelector('[pathLength]') ?? null);
  }
  return compareMotion(variant.motion, elementOf);
}

/**
 * 브라우저에 상태를 강제로 켜는 명령(`vitest.storybook.config.ts`의 `forcePseudoState`, CDP `CSS.forcePseudoState`)을 부른다.
 * 명령은 설정 파일이 더하므로 `commands`의 타입에 없어 이름으로 찾는다.
 * @param selector 요소 선택자
 * @param pseudoClasses 켤 의사 클래스. 빈 목록이면 끈다
 */
async function forcePseudoState(selector: string, pseudoClasses: readonly string[]): Promise<void> {
  const command: unknown = Reflect.get(commands, 'forcePseudoState');
  if (typeof command !== 'function') {
    throw new Error('[생성 결과 검증] 스토리 테스트 설정에 forcePseudoState 명령이 없다.');
  }
  const result: unknown = Reflect.apply(command, commands, [selector, pseudoClasses]);
  await Promise.resolve(result);
}

/**
 * 선택자에 맞는 요소가 하나뿐일 때 그 요소를 찾는다.
 * @param selector 선택자
 * @returns 요소. 없거나 여럿이면 null
 */
function uniqueElement(selector: string): Element | null {
  const found = document.querySelectorAll(selector);
  return found.length === 1 ? (found[0] ?? null) : null;
}

/**
 * 자산 파일 이름에서 기대하는 모양을 찾는다. SVG 자산은 viewBox와 첫 요소의 `d`, 이미지 자산은 주소다.
 * @codocs [[디자인 시스템:자산]]
 * @param file 자산 원본 이름(`icons/ic_fluent_add_20_regular`)
 * @returns 기대하는 모양. 자산 데이터에 없으면 undefined
 */
function expectedAsset(file: string): ExpectedAsset | undefined {
  const svg = Object.entries(svgAssets).find(([name]) => name === `${file}.svg`)?.[1];
  if (svg !== undefined) {
    return { viewBox: svg.viewBox, firstPath: firstPathOf(svg.elements), src: null };
  }
  const image = Object.entries(imageAssets).find(([name]) => name === file)?.[1];
  return image === undefined ? undefined : { viewBox: null, firstPath: null, src: image.src };
}

/**
 * 자산 SVG 첫 요소의 `d`를 읽는다.
 * @param elements 자산 요소
 * @returns `d` 값. 없으면 null
 */
function firstPathOf(elements: readonly SvgAssetElement[]): string | null {
  return elements[0]?.attributes['d'] ?? null;
}
