/**
 * 브라우저 안에서 확인 항목(layer-checks.ts)을 실제 요소와 대조한다.
 * inspectVariant는 page.evaluate로 넘기는 함수라 바깥 변수나 import를 쓰지 않는다.
 * 규칙은 [[피그마 일치 검사:비교 규칙]], [[피그마 일치 검사:짝짓기]], [[피그마 일치 검사:글자]]에 있다.
 */

import type { VariantChecks } from './layer-checks.ts';

/** 브라우저로 넘기는 입력 */
export type InspectInput = {
  checks: VariantChecks;
  /** 레이어 이름 속성(data-figma) */
  layerAttribute: string;
  /** 루트 표시 속성(data-figma-root) */
  rootAttribute: string;
  /** 루트 표시 값(피그마 컴포넌트 이름). 슬롯에 넣은 다른 컴포넌트의 루트와 구별한다 */
  rootName: string;
  /** 표시 없는 요소에 있으면 안 되는 토큰 클래스 정규식(source) */
  tokenClassPattern: string;
  /** 실패 메시지에서 역할 클래스를 고를 때 쓰는 접두어(긴 것부터) */
  rolePrefixes: string[];
};

/** 실패 하나 */
export type InspectFailure = { layer: string; message: string };

/** 서체를 확인할 글자 하나. 글자마다 감싼 요소에 data-parity-char 번호가 붙는다 */
export type FontProbe = {
  layer: string;
  /** 감싼 요소 번호. 입력 요소(input)면 -1 */
  index: number;
  character: string;
  /** 피그마 구간 서체 */
  expected: string;
};

export type InspectResult = {
  failures: InspectFailure[];
  fonts: FontProbe[];
};

/** 글자를 감싼 요소의 번호 속성 */
export const CHAR_ATTRIBUTE = 'data-parity-char';

/**
 * 변형 하나를 확인한다. 브라우저에서 실행된다(page.evaluate).
 * 마지막에 글자 서체를 확인하려고 글자마다 span으로 감싸므로, 호출한 뒤에는 화면을 다시 쓰지 않는다.
 * @codocs [[피그마 일치 검사:비교 규칙]]
 * @param input 확인 항목과 이름 규칙
 * @returns 실패 목록과 서체를 확인할 글자
 */
export function inspectVariant(input: InspectInput): InspectResult {
  const { checks, layerAttribute, rootAttribute } = input;
  const failures: InspectFailure[] = [];
  const fonts: FontProbe[] = [];
  const tokenPattern = new RegExp(input.tokenClassPattern, 'u');
  /**
   * 실패를 "<레이어> <역할>: 피그마 <이름> → 코드 <클래스/값>" 형식으로 더한다.
   * @param layer 레이어 경로(루트는 빈 문자열)
   * @param role 역할
   * @param figma 피그마 쪽 이름
   * @param code 코드 쪽 클래스나 값
   */
  function fail(layer: string, role: string, figma: string, code: string): void {
    const label = layer === '' ? '(루트)' : layer;
    failures.push({ layer, message: `${label} ${role}: 피그마 ${figma} → 코드 ${code}` });
  }

  const rootSelector = `[${rootAttribute}="${CSS.escape(input.rootName)}"]`;
  const roots = [...document.querySelectorAll(rootSelector)];
  const [root] = roots;
  if (roots.length !== 1 || !(root instanceof HTMLElement || root instanceof SVGElement)) {
    fail('', '짝', `${rootSelector} 요소 1개`, `${String(roots.length)}개`);
    return { failures, fonts };
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

  // 숨긴 레이어가 보이면 실패(D4)
  for (const path of checks.hidden) {
    const element = elementOf(path);
    if (element !== undefined && isShown(element)) {
      fail(path, '숨김', '숨김', '보임');
    }
  }

  // 토큰 클래스는 표시가 있는 요소에만 둔다. 글자 레이어 안에서 구간을 나누는 요소(<strong> 등)는 표시가 필요 없고 구간 비교가 확인한다.
  const textElements = checks.texts
    .map((text) => elementOf(text.layer))
    .filter((element): element is Element => element !== undefined);
  for (const element of root.querySelectorAll('*')) {
    if (element.hasAttribute(layerAttribute) || isInsideSlot(element)) {
      continue;
    }
    if (textElements.some((text) => text.contains(element))) {
      continue;
    }
    if (element.closest('[data-asset]') !== null && element.closest('[data-asset]') !== element) {
      continue;
    }
    const tokenClasses = classList(element).filter((name) => tokenPattern.test(baseClass(name)));
    if (tokenClasses.length > 0) {
      const owner = element.parentElement?.closest(`[${layerAttribute}], [${rootAttribute}]`);
      const ownerPath = owner?.getAttribute(layerAttribute) ?? '';
      fail(
        ownerPath,
        '표시 없는 요소',
        '없음',
        `<${element.tagName.toLowerCase()} class="${tokenClasses.join(' ')}">`,
      );
    }
  }

  // 역할마다 클래스 이름과 계산값
  for (const check of checks.checks) {
    const element = elementOf(check.layer);
    if (element === undefined) {
      continue;
    }
    const bases = new Set(classList(element).map(baseClass));
    const chosen: string[] = [];
    let isNameOk = true;
    for (const choice of check.classes) {
      const found = choice.find((name) => bases.has(name));
      if (found === undefined) {
        isNameOk = false;
        fail(check.layer, check.role, check.figma, roleClasses(element, choice) || '없음');
      } else {
        chosen.push(found);
      }
    }
    if (!isNameOk) {
      continue;
    }
    for (const expectation of check.computed) {
      const actual = computedValue(element, expectation.property, expectation.pseudo);
      const expected = expectedValue(expectation);
      if (actual !== expected) {
        const where = expectation.pseudo === undefined ? '' : `${expectation.pseudo} `;
        fail(
          check.layer,
          check.role,
          check.figma,
          `${chosen.join(' ') || '클래스 없음'} (${where}${expectation.property} ${actual}, 기대 ${expected})`,
        );
        break;
      }
    }
  }

  // 자산: 같은 자산 파일, 한 가지 색이면 색 클래스와 계산값
  for (const asset of checks.assets) {
    const element = elementOf(asset.layer);
    if (element === undefined) {
      continue;
    }
    const actualFile = element.getAttribute('data-asset');
    if (actualFile !== asset.file) {
      fail(asset.layer, '자산', asset.file, actualFile === null ? 'data-asset 없음' : actualFile);
      continue;
    }
    if (asset.color !== null) {
      const chain = chainClasses(element, root);
      const found = asset.color.classes.find((name) => chain.has(name));
      if (found === undefined) {
        fail(
          asset.layer,
          '자산 색',
          asset.color.figma,
          chainRoleClasses(element, root, 'text-') || '없음',
        );
        continue;
      }
      const actual = computedValue(element, 'color');
      const expected = expectedValue({ property: 'color', css: asset.color.css });
      if (actual !== expected) {
        fail(
          asset.layer,
          '자산 색',
          asset.color.figma,
          `${found} (color ${actual}, 기대 ${expected})`,
        );
      }
    }
  }

  // 글자: 내용, 구간마다 색·스타일·꾸밈, 서체 확인 준비
  for (const text of checks.texts) {
    const element = elementOf(text.layer);
    if (element === undefined) {
      continue;
    }
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
    for (const segment of text.segments) {
      const segmentOwners = isField
        ? [element]
        : [...new Set(owners.slice(segment.start, segment.end))];
      const range = `[${String(segment.start)}, ${String(segment.end)})`;
      for (const owner of segmentOwners) {
        const chain = chainClasses(owner, root);
        const pseudo = isPlaceholder ? '::placeholder' : undefined;
        if (segment.fill !== null) {
          const found = segment.fill.classes.find((name) => chain.has(name));
          const actual = computedValue(owner, 'color', pseudo);
          const expected = expectedValue({ property: 'color', css: segment.fill.css });
          if (found === undefined) {
            fail(
              text.layer,
              `글자 색${range}`,
              segment.fill.figma,
              chainRoleClasses(owner, root, 'text-') || '없음',
            );
          } else if (actual !== expected) {
            fail(
              text.layer,
              `글자 색${range}`,
              segment.fill.figma,
              `${found} (color ${actual}, 기대 ${expected})`,
            );
          }
        }
        const typeFound = segment.typeClasses.find((name) => chain.has(name));
        if (typeFound === undefined) {
          fail(
            text.layer,
            `글자 스타일${range}`,
            `${segment.textStyle}(${segment.styleFigma})`,
            chainRoleClasses(owner, root, 'type-') || '없음',
          );
        } else {
          // 글자 크기·줄 높이·굵기는 입력 요소 자체 값이 정한다(placeholder 의사 요소의 줄 높이는 브라우저가 고정한다).
          for (const expectation of segment.styleComputed) {
            const actual = computedValue(owner, expectation.property);
            const expected = expectedValue(expectation);
            if (actual !== expected) {
              fail(
                text.layer,
                `글자 스타일${range}`,
                `${segment.textStyle}(${segment.styleFigma})`,
                `${typeFound} (${expectation.property} ${actual}, 기대 ${expected})`,
              );
              break;
            }
          }
        }
        const decorationLine = computedValue(owner, 'text-decoration-line', pseudo);
        if (segment.decoration === null) {
          if (decorationLine !== 'none') {
            fail(text.layer, `글자 꾸밈${range}`, 'NONE', decorationLine);
          }
        } else if (!segment.decoration.classes.some((name) => chain.has(name))) {
          fail(text.layer, `글자 꾸밈${range}`, segment.decoration.figma, decorationLine);
        }
      }
    }
  }

  // 상태 전환(M1): 이 변형으로 들어오는 전환마다, 바뀌는 속성을 전환하는 요소의 시간·이징 클래스와 계산값.
  // CSS 전환은 바뀐 뒤 상태의 값을 쓰므로 지금(도착 변형) 상태에서 읽는다.
  for (const transition of checks.transitions) {
    const element = elementOf(transition.layer);
    if (element === undefined) {
      continue;
    }
    const where = `전환(${transition.from} → ${transition.trigger})`;
    for (const role of transition.unknown) {
      fail(
        transition.layer,
        `${where} 대상`,
        role,
        '역할 → CSS 속성 표(class-rules transitionProperties)에 없음',
      );
    }
    for (const [property, role] of Object.entries(transition.properties)) {
      const owner = transitionOwner(element, property);
      if (owner === undefined) {
        fail(
          transition.layer,
          `${where} 대상`,
          `${role} → ${property}`,
          `transition-property에 ${property} 없음(${computedValue(element, 'transition-property')})`,
        );
        continue;
      }
      const bases = new Set(classList(owner.element).map(baseClass));
      for (const [label, expectation, property2, actual] of [
        ['시간', transition.duration, 'transition-duration', owner.duration],
        ['이징', transition.easing, 'transition-timing-function', owner.timing],
      ] as const) {
        const expected = expectedValue({ property: property2, css: expectation.css });
        if (!bases.has(expectation.className)) {
          fail(
            transition.layer,
            `${where} ${label}`,
            expectation.figma,
            `${expectation.className} 클래스 없음(${property2} ${actual}, 기대 ${expected})`,
          );
        } else if (actual !== expected) {
          fail(
            transition.layer,
            `${where} ${label}`,
            expectation.figma,
            `${expectation.className} (${property2} ${actual}, 기대 ${expected})`,
          );
        }
      }
    }
  }

  // 서체 확인 준비(D2): 글자마다 감싸 실제로 그린 서체를 CDP로 읽게 한다. 공백은 서체가 없어 뺀다.
  let charIndex = 0;
  for (const text of checks.texts) {
    const element = elementOf(text.layer);
    if (element === undefined) {
      continue;
    }
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      for (const segment of text.segments) {
        fonts.push({
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
      const value = node.data;
      const fragment = document.createDocumentFragment();
      for (const character of value) {
        const position = offset;
        offset += character.length;
        if (character.trim() === '') {
          fragment.append(character);
          continue;
        }
        const segment = text.segments.find((item) => position >= item.start && position < item.end);
        const span = document.createElement('span');
        span.setAttribute('data-parity-char', String(charIndex));
        span.textContent = character;
        fragment.append(span);
        fonts.push({
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

  return { failures, fonts };

  /**
   * 속성을 전환하는 요소와 그 시간·이징을 찾는다. 요소 자신을 보고, 상속되는 글자 색은 루트까지 조상도 본다.
   * transition-property 목록에서 그 속성이나 all의 자리를 찾아 같은 자리의 시간·이징을 쓴다.
   * @param element 레이어 요소
   * @param property CSS 속성
   * @returns 전환하는 요소와 시간·이징(없으면 undefined)
   */
  function transitionOwner(
    element: Element,
    property: string,
  ): { element: Element; duration: string; timing: string } | undefined {
    for (let current: Element | null = element; current !== null; current = current.parentElement) {
      const style = getComputedStyle(current);
      const properties = style.transitionProperty.split(',').map((item) => item.trim());
      const index = properties.findIndex((item) => item === property || item === 'all');
      if (index !== -1) {
        const durations = style.transitionDuration.split(',').map((item) => item.trim());
        const timings = splitTopLevel(style.transitionTimingFunction);
        const duration = durations[index % durations.length] ?? '';
        if (duration !== '0s') {
          return {
            element: current,
            duration: normalizeValue('transition-duration', duration),
            timing: normalizeValue(
              'transition-timing-function',
              timings[index % timings.length] ?? '',
            ),
          };
        }
      }
      if (property !== 'color' || current === root) {
        return undefined;
      }
    }
    return undefined;
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
   * 요소의 클래스 목록을 읽는다.
   * @param element 요소
   * @returns 클래스 이름 목록
   */
  function classList(element: Element): string[] {
    return [...element.classList];
  }

  /**
   * 변형 접두어(hover:, focus-visible: 등)와 !를 뗀 클래스 이름을 구한다.
   * @param name 클래스 이름
   * @returns 기본 클래스 이름
   */
  function baseClass(name: string): string {
    let depth = 0;
    let start = 0;
    for (let index = 0; index < name.length; index += 1) {
      const character = name[index];
      if (character === '[' || character === '(') {
        depth += 1;
      } else if (character === ']' || character === ')') {
        depth -= 1;
      } else if (character === ':' && depth === 0) {
        start = index + 1;
      }
    }
    return name.slice(start).replace(/^!|!$/gu, '');
  }

  /**
   * 요소에서 루트까지 올라가며 기본 클래스 이름을 모은다(상속되는 속성).
   * @param element 시작 요소
   * @param stop 여기까지 올라간다(포함)
   * @returns 기본 클래스 이름 집합
   */
  function chainClasses(element: Element, stop: Element): Set<string> {
    const names = new Set<string>();
    for (let current: Element | null = element; current !== null; current = current.parentElement) {
      for (const name of classList(current)) {
        names.add(baseClass(name));
      }
      if (current === stop) {
        break;
      }
    }
    return names;
  }

  /**
   * 실패 메시지용으로 요소의 역할 클래스를 고른다.
   * @param element 요소
   * @param choice 기대한 클래스 후보
   * @returns 같은 접두어를 쓰는 클래스(공백으로 이음)
   */
  function roleClasses(element: Element, choice: readonly string[]): string {
    const prefixes = choice.map(
      (name) => input.rolePrefixes.find((prefix) => name.startsWith(prefix)) ?? name,
    );
    return classList(element)
      .filter((name) => prefixes.some((prefix) => baseClass(name).startsWith(prefix)))
      .join(' ');
  }

  /**
   * 실패 메시지용으로 요소에서 루트까지의 역할 클래스를 고른다.
   * @param element 시작 요소
   * @param stop 여기까지 올라간다(포함)
   * @param prefix 접두어
   * @returns 클래스(공백으로 이음)
   */
  function chainRoleClasses(element: Element, stop: Element, prefix: string): string {
    const names: string[] = [];
    for (let current: Element | null = element; current !== null; current = current.parentElement) {
      names.push(...classList(current).filter((name) => baseClass(name).startsWith(prefix)));
      if (current === stop) {
        break;
      }
    }
    return names.join(' ');
  }

  /**
   * 요소(또는 의사 요소)의 계산값을 읽는다.
   * @param element 요소
   * @param property CSS 속성
   * @param pseudo 의사 요소
   * @returns 계산값
   */
  function computedValue(element: Element, property: string, pseudo?: string): string {
    return normalizeValue(
      property,
      getComputedStyle(element, pseudo ?? null)
        .getPropertyValue(property)
        .trim(),
    );
  }

  /**
   * 같은 모양을 다르게 적은 계산값을 한 가지로 맞춘다. Tailwind 그림자는 안 보이는 그림자(투명, 0)를 앞에 붙인다.
   * @param property CSS 속성
   * @param value 계산값
   * @returns 맞춘 값
   */
  function normalizeValue(property: string, value: string): string {
    if (property !== 'box-shadow') {
      return value;
    }
    const layers = value.split(/,(?![^(]*\))/u).map((layer) => layer.trim());
    const visible = layers.filter((layer) => layer !== 'rgba(0, 0, 0, 0) 0px 0px 0px 0px');
    return visible.length === 0 ? 'none' : visible.join(', ');
  }

  /**
   * 기대 계산값을 구한다. 값(또는 클래스)을 넣은 비교용 요소를 잠깐 붙여 계산값을 읽는다.
   * @param expectation 속성과 값
   * @param expectation.property CSS 속성
   * @param expectation.css 넣을 값
   * @param expectation.probeClass 넣을 클래스
   * @param expectation.pseudo 클래스로 기대값을 만들 때 읽을 의사 요소
   * @returns 기대 계산값
   */
  function expectedValue(expectation: {
    property: string;
    css?: string;
    probeClass?: string;
    pseudo?: string;
  }): string {
    if (expectation.property === 'content') {
      return expectation.css ?? '';
    }
    // 비교용 요소는 위치를 정하지 않은 채 크기 0인 상자 안에 둔다. 절대 위치면 display가 block으로 바뀐다.
    const holder = document.createElement('div');
    holder.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;visibility:hidden;';
    const probe = document.createElement('div');
    probe.style.cssText = 'pointer-events:none;border-style:solid;outline-style:solid;';
    holder.append(probe);
    if (expectation.probeClass !== undefined) {
      probe.className = expectation.probeClass;
    }
    if (expectation.css !== undefined) {
      probe.style.setProperty(expectation.property, expectation.css);
    }
    document.body.append(holder);
    // 유틸리티 클래스로 기대값을 만들 때는 그 유틸리티의 의사 요소 값을 읽는다.
    const probePseudo = expectation.probeClass === undefined ? undefined : expectation.pseudo;
    const value = normalizeValue(
      expectation.property,
      getComputedStyle(probe, probePseudo).getPropertyValue(expectation.property).trim(),
    );
    holder.remove();
    return value;
  }
}
