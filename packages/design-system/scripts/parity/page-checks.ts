/**
 * 브라우저 안에서 확인 항목(layer-checks.ts)의 요소를 찾고 계산값을 모은다.
 * 짝짓기, 숨김, 글자 내용은 여기서 바로 판정하고, 이름·값 비교는 모은 값으로 parity-runner.ts가 한다.
 * collectVariant는 page.evaluate로 넘기는 함수라 바깥 변수나 import를 쓰지 않는다.
 * 규칙은 [[피그마 일치 검사:판정 항목]], [[피그마 일치 검사:짝짓기]], [[피그마 일치 검사:글자]]에 있다.
 */

import type { VariantChecks } from './layer-checks.ts';

/** 브라우저로 넘기는 입력 */
export type CollectInput = {
  checks: VariantChecks;
  /** 레이어 이름 속성(data-figma) */
  layerAttribute: string;
  /** 루트 표시 속성(data-figma-root) */
  rootAttribute: string;
  /** 루트 표시 값(피그마 컴포넌트 이름). 슬롯에 넣은 다른 컴포넌트의 루트와 구별한다 */
  rootName: string;
  /** 요소 번호 속성. CDP로 요소를 찾을 때 쓴다 */
  nodeAttribute: string;
  /** 글자 번호 속성. 서체를 CDP로 읽을 때 쓴다 */
  charAttribute: string;
};

/** 실패 하나 */
export type InspectFailure = { layer: string; message: string };

/** 요소 하나에서 읽은 값. 요소가 없으면 node가 -1이다 */
export type ReadValue = { node: number; computed: string };

/** 서체를 확인할 글자 하나 */
export type FontProbe = {
  layer: string;
  /** 감싼 요소 번호. 입력 요소(input)면 -1 */
  index: number;
  character: string;
  /** 피그마 구간 서체 */
  expected: string;
};

/** 글자 구간을 그린 요소 하나 */
export type SegmentOwner = {
  text: number;
  segment: number;
  /** 요소 번호 */
  node: number;
  /** 입력 요소의 placeholder면 `::placeholder` */
  pseudo: string | null;
  /** 구간 확인 항목 순서대로 계산값 */
  computed: string[];
};

/** 전환 하나의 속성 하나 */
export type TransitionRead = {
  transition: number;
  property: string;
  /** 전환하는 요소를 찾았으면 그 시간·이징 계산값 */
  owner: { duration: string; timing: string } | null;
  /** 레이어 요소의 transition-property 계산값(메시지용) */
  listed: string;
};

/** 표시 없는 요소 하나 */
export type UnmarkedElement = {
  node: number;
  /** 가장 가까운 표시 있는 조상의 레이어 경로 */
  owner: string;
  /** 메시지용 태그와 클래스 */
  label: string;
};

export type CollectResult = {
  failures: InspectFailure[];
  /** checks.checks 순서대로 */
  checks: ReadValue[];
  /** checks.assets 순서대로. file은 data-asset 값 */
  assets: (ReadValue & { file: string | null })[];
  segments: SegmentOwner[];
  transitions: TransitionRead[];
  unmarked: UnmarkedElement[];
  fonts: FontProbe[];
};

/**
 * 변형 하나의 요소를 찾고 값을 모은다. 브라우저에서 실행된다(page.evaluate).
 * 마지막에 글자 서체를 확인하려고 글자마다 span으로 감싸므로, 호출한 뒤에는 화면을 다시 쓰지 않는다.
 * @codocs [[피그마 일치 검사:판정 항목]]
 * @param input 확인 항목과 이름 규칙
 * @returns 바로 판정한 실패와 모은 값
 */
export function collectVariant(input: CollectInput): CollectResult {
  const { checks, layerAttribute, rootAttribute, nodeAttribute } = input;
  const result: CollectResult = {
    failures: [],
    checks: [],
    assets: [],
    segments: [],
    transitions: [],
    unmarked: [],
    fonts: [],
  };
  /**
   * 실패를 "<레이어> <역할>: 피그마 <이름> → 코드 <값>" 형식으로 더한다.
   * @param layer 레이어 경로(루트는 빈 문자열)
   * @param role 역할
   * @param figma 피그마 쪽 이름
   * @param code 코드 쪽 값
   */
  function fail(layer: string, role: string, figma: string, code: string): void {
    const label = layer === '' ? '(루트)' : layer;
    result.failures.push({ layer, message: `${label} ${role}: 피그마 ${figma} → 코드 ${code}` });
  }

  let nextNode = 0;
  /**
   * 요소에 번호를 붙인다(이미 있으면 그 번호).
   * @param element 요소
   * @returns 번호
   */
  function nodeOf(element: Element): number {
    const existing = element.getAttribute(nodeAttribute);
    if (existing !== null) {
      return Number(existing);
    }
    const id = nextNode;
    nextNode += 1;
    element.setAttribute(nodeAttribute, String(id));
    return id;
  }

  const rootSelector = `[${rootAttribute}="${CSS.escape(input.rootName)}"]`;
  const roots = [...document.querySelectorAll(rootSelector)];
  const [root] = roots;
  if (roots.length !== 1 || !(root instanceof HTMLElement || root instanceof SVGElement)) {
    fail('', '짝', `${rootSelector} 요소 1개`, `${String(roots.length)}개`);
    return result;
  }

  // 슬롯 안쪽 내용은 쓰는 쪽이 정하므로 짝짓기와 표시 검사에서 뺀다.
  const slotElements = checks.slots
    .map((path) =>
      path === '' ? root : root.querySelector(`[${layerAttribute}="${CSS.escape(path)}"]`),
    )
    .filter((element): element is Element => element !== null);
  /**
   * 슬롯 안쪽 요소인지 본다.
   * @param element 요소
   * @returns 슬롯 안이면 true
   */
  function isInsideSlot(element: Element): boolean {
    return slotElements.some((slot) => slot !== element && slot.contains(element));
  }

  const elementsByPath = new Map<string, Element[]>();
  elementsByPath.set('', [root]);
  for (const element of root.querySelectorAll(`[${layerAttribute}]`)) {
    if (isInsideSlot(element)) {
      continue;
    }
    const path = element.getAttribute(layerAttribute) ?? '';
    elementsByPath.set(path, [...(elementsByPath.get(path) ?? []), element]);
  }

  // 짝짓기: 레이어마다 요소 하나, 피그마에 없는 표시는 실패
  const known = new Set([...checks.layers, ...checks.hidden]);
  for (const [path, elements] of elementsByPath) {
    if (!known.has(path)) {
      fail(path, '짝', '없음', `${layerAttribute}="${path}"`);
    } else if (elements.length > 1) {
      fail(
        path,
        '짝',
        '레이어 1개',
        `${layerAttribute}="${path}" 요소 ${String(elements.length)}개`,
      );
    }
  }
  /**
   * 레이어 경로에 짝지은 첫 요소를 찾는다.
   * @param path 레이어 경로
   * @returns 요소(없으면 undefined)
   */
  function elementOf(path: string): Element | undefined {
    return elementsByPath.get(path)?.[0];
  }
  for (const path of checks.layers) {
    if (elementOf(path) === undefined) {
      fail(path, '짝', '레이어', `${layerAttribute}="${path}" 요소 없음`);
    }
  }

  // 숨긴 레이어가 보이면 실패
  for (const path of checks.hidden) {
    const element = elementOf(path);
    if (element !== undefined && isShown(element)) {
      fail(path, '숨김', '숨김', '보임');
    }
  }

  // 확인 항목마다 요소와 계산값
  for (const check of checks.checks) {
    const element = elementOf(check.layer);
    result.checks.push(
      element === undefined
        ? { node: -1, computed: '' }
        : { node: nodeOf(element), computed: computedValue(element, check.property, check.pseudo) },
    );
  }

  // 자산: data-asset과 색
  for (const asset of checks.assets) {
    const element = elementOf(asset.layer);
    result.assets.push(
      element === undefined
        ? { node: -1, computed: '', file: null }
        : {
            node: nodeOf(element),
            computed: asset.color === null ? '' : computedValue(element, asset.color.property),
            file: element.getAttribute('data-asset'),
          },
    );
  }

  // 글자: 내용, 구간마다 그린 요소와 계산값
  const textElements: Element[] = [];
  for (const [textIndex, text] of checks.texts.entries()) {
    const element = elementOf(text.layer);
    if (element === undefined) {
      continue;
    }
    textElements.push(element);
    const isField = element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement;
    const fieldValue = isField ? element.value : '';
    const isPlaceholder = isField && fieldValue === '';
    const characters = isField
      ? isPlaceholder
        ? element.placeholder
        : fieldValue
      : element.textContent;
    if (characters !== text.characters) {
      fail(text.layer, '글자 내용', JSON.stringify(text.characters), JSON.stringify(characters));
      continue;
    }
    const owners: Element[] = [];
    if (!isField) {
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
        const owner = node.parentElement ?? element;
        for (let index = 0; index < (node.textContent ?? '').length; index += 1) {
          owners.push(owner);
        }
      }
    }
    for (const [segmentIndex, segment] of text.segments.entries()) {
      const segmentOwners = isField
        ? [element]
        : [...new Set(owners.slice(segment.start, segment.end))];
      for (const owner of segmentOwners) {
        // placeholder 글자의 색과 꾸밈은 의사 요소가, 크기·굵기·줄 높이는 입력 요소 자신이 정한다.
        const pseudo = isPlaceholder ? '::placeholder' : null;
        result.segments.push({
          text: textIndex,
          segment: segmentIndex,
          node: nodeOf(owner),
          pseudo,
          computed: segment.checks.map((check) => segmentValue(owner, check.property, pseudo)),
        });
      }
    }
  }

  // 상태 전환: 바뀌는 속성을 전환하는 요소(글자 색은 조상까지)의 시간·이징
  for (const [transitionIndex, transition] of checks.transitions.entries()) {
    const element = elementOf(transition.layer);
    if (element === undefined) {
      continue;
    }
    for (const [property, names] of Object.entries(transitionNamesOf(transition.properties))) {
      result.transitions.push({
        transition: transitionIndex,
        property,
        owner: transitionOwner(element, names, property === 'color'),
        listed: getComputedStyle(element).transitionProperty,
      });
    }
  }

  // 표시 없는 요소: 글자 안의 구간 요소(<strong> 등)와 자산 안쪽은 빼고 모은다
  for (const element of root.querySelectorAll('*')) {
    if (element.hasAttribute(layerAttribute) || isInsideSlot(element)) {
      continue;
    }
    if (textElements.some((text) => text.contains(element))) {
      continue;
    }
    if (element.closest('[data-asset]') !== null) {
      continue;
    }
    const owner = element.parentElement?.closest(`[${layerAttribute}], [${rootAttribute}]`);
    result.unmarked.push({
      node: nodeOf(element),
      owner: owner?.getAttribute(layerAttribute) ?? '',
      label: `<${element.tagName.toLowerCase()} class="${element.getAttribute('class') ?? ''}">`,
    });
  }

  // 서체 확인 준비: 글자마다 감싸 실제로 그린 서체를 CDP로 읽게 한다. 공백은 서체가 없어 뺀다.
  let charIndex = 0;
  for (const text of checks.texts) {
    const element = elementOf(text.layer);
    if (element === undefined) {
      continue;
    }
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      for (const segment of text.segments) {
        result.fonts.push({
          layer: text.layer,
          index: -1,
          character: text.characters.slice(segment.start, segment.end),
          expected: segment.fontFamily,
        });
      }
      continue;
    }
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    const nodes: Text[] = [];
    for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
      if (node instanceof Text) {
        nodes.push(node);
      }
    }
    let offset = 0;
    for (const node of nodes) {
      const fragment = document.createDocumentFragment();
      for (const character of node.data) {
        const position = offset;
        offset += character.length;
        if (character.trim() === '') {
          fragment.append(character);
          continue;
        }
        const segment = text.segments.find((item) => position >= item.start && position < item.end);
        const span = document.createElement('span');
        span.setAttribute(input.charAttribute, String(charIndex));
        span.textContent = character;
        fragment.append(span);
        result.fonts.push({
          layer: text.layer,
          index: charIndex,
          character,
          expected: segment?.fontFamily ?? '',
        });
        charIndex += 1;
      }
      node.replaceWith(fragment);
    }
  }

  return result;

  /**
   * 전환할 속성마다 transition-property에서 찾을 이름(자신, 단축 속성)을 정한다.
   * @param properties CSS 속성 → 역할
   * @returns CSS 속성 → 찾을 이름
   */
  function transitionNamesOf(properties: Record<string, string>): Record<string, string[]> {
    const names: Record<string, string[]> = {};
    for (const property of Object.keys(properties)) {
      const list = [property, 'all'];
      if (/^padding-/u.test(property)) {
        list.push('padding');
      }
      if (/^border-.+-radius$/u.test(property)) {
        list.push('border-radius');
      }
      if (property === 'column-gap' || property === 'row-gap') {
        list.push('gap');
      }
      if (property.startsWith('outline-')) {
        list.push('outline');
      }
      if (property === 'background-color') {
        list.push('background');
      }
      names[property] = list;
    }
    return names;
  }

  /**
   * 속성을 전환하는 요소를 찾아 그 시간·이징 계산값을 돌려준다. 시간이 0이면 전환하지 않는 것이다.
   * @param element 레이어 요소
   * @param names transition-property에서 찾을 이름
   * @param isInherited 상속되는 속성(글자 색)이면 루트까지 조상도 본다
   * @returns 시간·이징, 없으면 null
   */
  function transitionOwner(
    element: Element,
    names: readonly string[],
    isInherited: boolean,
  ): { duration: string; timing: string } | null {
    for (let current: Element | null = element; current !== null; current = current.parentElement) {
      const style = getComputedStyle(current);
      const listed = style.transitionProperty.split(',').map((item) => item.trim());
      const index = listed.findIndex((item) => names.includes(item));
      if (index !== -1) {
        const durations = style.transitionDuration.split(',').map((item) => item.trim());
        const timings = splitTopLevel(style.transitionTimingFunction);
        const duration = durations[index % durations.length] ?? '';
        if (duration !== '0s') {
          return { duration, timing: timings[index % timings.length] ?? '' };
        }
      }
      if (!isInherited || current === root) {
        return null;
      }
    }
    return null;
  }

  /**
   * 괄호 밖의 쉼표로 나눈다(cubic-bezier 안의 쉼표는 나누지 않는다).
   * @param value 목록 값
   * @returns 항목
   */
  function splitTopLevel(value: string): string[] {
    const parts: string[] = [];
    let depth = 0;
    let current = '';
    for (const character of value) {
      if (character === '(') {
        depth += 1;
      } else if (character === ')') {
        depth -= 1;
      }
      if (character === ',' && depth === 0) {
        parts.push(current.trim());
        current = '';
      } else {
        current += character;
      }
    }
    parts.push(current.trim());
    return parts;
  }

  /**
   * 글자 구간 요소의 계산값을 읽는다. placeholder면 색과 꾸밈만 의사 요소에서 읽는다.
   * @param owner 구간을 그린 요소
   * @param property CSS 속성
   * @param pseudo placeholder면 `::placeholder`
   * @returns 계산값
   */
  function segmentValue(owner: Element, property: string, pseudo: string | null): string {
    const isPseudo = property === 'color' || property === 'text-decoration-line';
    return computedValue(owner, property, pseudo !== null && isPseudo ? pseudo : undefined);
  }

  /**
   * 요소가 화면에 보이는지 본다.
   * @param element 요소
   * @returns 보이면 true
   */
  function isShown(element: Element): boolean {
    return (
      element.checkVisibility({ visibilityProperty: true }) && element.getClientRects().length > 0
    );
  }

  /**
   * 요소(또는 의사 요소)의 계산값을 읽는다. 회전은 `rotate`와 `transform`을 함께 읽는다.
   * @param element 요소
   * @param property CSS 속성(`rotate|transform`은 둘을 `|`로 이은 값)
   * @param pseudo 의사 요소
   * @returns 계산값
   */
  function computedValue(element: Element, property: string, pseudo?: string): string {
    const style = getComputedStyle(element, pseudo ?? null);
    return property
      .split('|')
      .map((name) => style.getPropertyValue(name).trim())
      .join('|');
  }
}
