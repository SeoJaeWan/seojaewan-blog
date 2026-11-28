import { type LayerKey, parseLayerKey, ROOT_LAYER_KEY } from '../../src/figma-export/layer-key.ts';

// 피그마 이름을 코드 이름(파일, 컴포넌트, 입력, 값, 레이어 클래스)으로 옮기는 규칙이다.

/** 켜고 끄는 입력이 이미 가진 것으로 보는 접두어([[코드 작성 규칙:식별자 이름]]) */
const BOOLEAN_PREFIXES = ['is', 'has', 'can', 'should'] as const;

/** 레이어 클래스에서 마디를 잇는 글자. Tailwind 유틸리티 이름에는 나오지 않는 꼴이라 겹치지 않는다 */
const CLASS_SEGMENT_SEPARATOR = '__';

/** 루트 레이어의 클래스 마디 */
const ROOT_CLASS_SEGMENT = 'root';

/** 변형 값 클래스에서 축과 값을 잇는 글자 */
const MODIFIER_SEPARATOR = '--';

/**
 * 이름을 낱말로 나눈다. 공백·하이픈·밑줄·슬래시와 낙타 표기의 대문자 경계에서 나눈다.
 * @param name 피그마 이름(`MessageBox`, `Has icon`, `close button`)
 * @returns 소문자 낱말
 */
export function nameWords(name: string): string[] {
  return name
    .replace(/([a-z0-9])([A-Z])/gu, '$1 $2')
    .replace(/([A-Z])([A-Z][a-z])/gu, '$1 $2')
    .split(/[^A-Za-z0-9]+/u)
    .filter((word) => word !== '')
    .map((word) => word.toLowerCase());
}

/**
 * 컴포넌트 폴더·파일 이름을 만든다([[코드 작성 규칙:파일과 폴더 이름]]).
 * @codocs [[디자인 시스템:스키마]]
 * @param componentName 피그마 컴포넌트 이름(`MessageBox`)
 * @returns kebab-case 이름(`message-box`)
 */
export function componentFileName(componentName: string): string {
  return nameWords(componentName).join('-');
}

/**
 * 컴포넌트 식별자를 만든다.
 * @codocs [[디자인 시스템:컴포넌트 입력]]
 * @param componentName 피그마 컴포넌트 이름(`MessageBox`, `Message box`)
 * @returns PascalCase 이름(`MessageBox`)
 */
export function componentIdentifier(componentName: string): string {
  return pascalCase(nameWords(componentName));
}

/**
 * 피그마 속성 이름을 입력 이름으로 옮긴다. 속성 키의 `#id`는 스키마가 이미 뗐다.
 * @codocs [[디자인 시스템:컴포넌트 입력]]
 * @param propertyName 피그마 속성 이름(`Variant`, `Close icon`)
 * @returns 낙타 표기 이름(`variant`, `closeIcon`)
 */
export function inputName(propertyName: string): string {
  return camelCase(nameWords(propertyName));
}

/**
 * 켜고 끄는 속성 이름을 입력 이름으로 옮긴다. 접두어가 없으면 `is`를 붙인다.
 * @codocs [[디자인 시스템:컴포넌트 입력]]
 * @param propertyName 피그마 속성 이름(`Has icon`, `Checked`)
 * @returns `hasIcon`, `isChecked`
 */
export function booleanInputName(propertyName: string): string {
  const words = nameWords(propertyName);
  const [first] = words;
  if (first !== undefined && BOOLEAN_PREFIXES.some((prefix) => prefix === first)) {
    return camelCase(words);
  }
  return camelCase(['is', ...words]);
}

/**
 * 변형 값을 코드 값으로 정규화한다. 소문자와 하이픈으로 바꾼다.
 * @codocs [[디자인 시스템:컴포넌트 입력]]
 * @param value 피그마 변형 값(`Two line`)
 * @returns `two-line`
 */
export function variantValueName(value: string): string {
  return nameWords(value).join('-');
}

/**
 * 안에 박힌 부품의 사건 입력 이름을 만든다. 버튼은 레이어 이름 끝의 `button`을 떼고, 다른 부품은 끝의 부품 이름을
 * 떼고 사건 이름을 붙인다(`rename field` → `onRenameChange`).
 * @codocs [[디자인 시스템:컴포넌트 입력]]
 * @param layerName 부품 레이어 이름(`close button`, `rename field`)
 * @param suffix 그 종류의 사건 이름(`EventSpec.nestedSuffix`). 버튼은 빈 문자열이다
 * @returns `onClose`, `onRenameChange`
 */
export function nestedEventInputName(layerName: string, suffix: string): string {
  const words = nameWords(layerName);
  // 버튼은 끝의 `button`을, 다른 부품은 끝의 부품 이름(`field` 등)을 떼고 그 자리에 사건 이름을 붙인다.
  const isTrimmed = words.length > 1 && (suffix !== '' || words.at(-1) === 'button');
  return `on${pascalCase(isTrimmed ? words.slice(0, -1) : words)}${suffix}`;
}

/**
 * 노출한 중첩 인스턴스 속성의 바깥 입력 이름을 만든다. 인스턴스 레이어 이름 뒤에 안쪽 입력 이름을 잇는다.
 * @codocs [[디자인 시스템:컴포넌트 입력]]
 * @param layerName 인스턴스 레이어 이름(`primary button`)
 * @param innerInput 안쪽 컴포넌트의 입력 이름(`label`)
 * @returns `primaryButtonLabel`
 */
export function exposedInputName(layerName: string, innerInput: string): string {
  return `${camelCase(nameWords(layerName))}${innerInput.charAt(0).toUpperCase()}${innerInput.slice(1)}`;
}

/**
 * 스토리 export 이름을 만든다. 변형 값을 PascalCase로 이어 붙인다. 변형이 없으면 `Default`다.
 * @codocs [[디자인 시스템:스토리 규칙]]
 * @param values 변형 축 값(피그마 순서)
 * @returns `StandardRest`
 */
export function storyExportName(values: readonly string[]): string {
  const name = pascalCase(values.flatMap(nameWords));
  if (name === '') {
    return 'Default';
  }
  return /^[0-9]/u.test(name) ? `Variant${name}` : name;
}

/**
 * 레이어 키에서 레이어 클래스의 마디를 만든다. 마디마다 소문자 kebab으로 바꾸고 `__`로 잇는다.
 * 같은 이름 형제의 순번은 `-<n>`으로 붙인다. 루트는 `root`다.
 * @codocs [[디자인 시스템:생성 결과 검증]]
 * @param key 레이어 키
 * @returns `footer__primary-button`, `root`
 */
export function layerClassSegment(key: LayerKey): string {
  if (key === ROOT_LAYER_KEY) {
    return ROOT_CLASS_SEGMENT;
  }
  return parseLayerKey(key)
    .map(({ name, occurrence }) => {
      const slug = nameWords(name).join('-') || 'layer';
      return occurrence === 1 ? slug : `${slug}-${String(occurrence)}`;
    })
    .join(CLASS_SEGMENT_SEPARATOR);
}

/**
 * 레이어 클래스를 만든다. 컴포넌트 파일 이름 뒤에 레이어 자리를 잇는다.
 * @codocs [[디자인 시스템:생성 결과 검증]]
 * @param fileName 컴포넌트 파일 이름(`message-box`)
 * @param segment `layerClassSegment`가 만든 마디
 * @returns `message-box__footer__primary-button`
 */
export function layerClassName(fileName: string, segment: string): string {
  return `${fileName}${CLASS_SEGMENT_SEPARATOR}${segment}`;
}

/**
 * 구조가 다른 변형 값의 클래스를 만든다. 루트 요소에 붙는다.
 * @codocs [[디자인 시스템:컴포넌트 입력]]
 * @param fileName 컴포넌트 파일 이름
 * @param axisInput 변형 입력 이름(`variant`)
 * @param value 코드 값(`accent`)
 * @returns `button--variant-accent`
 */
export function modifierClassName(fileName: string, axisInput: string, value: string): string {
  return `${fileName}${MODIFIER_SEPARATOR}${nameWords(axisInput).join('-')}-${value}`;
}

/**
 * 레이어 키에서 코드 안의 레이어 식별자를 만든다. 루트는 `root`다.
 * @param key 레이어 키
 * @returns `footerPrimaryButton`
 */
export function layerIdentifier(key: LayerKey): string {
  if (key === ROOT_LAYER_KEY) {
    return ROOT_CLASS_SEGMENT;
  }
  const words = parseLayerKey(key).flatMap(({ name, occurrence }) => [
    ...nameWords(name),
    ...(occurrence === 1 ? [] : [String(occurrence)]),
  ]);
  return camelCase(words.length === 0 ? ['layer'] : words);
}

/**
 * 이미 쓴 이름과 겹치지 않게 뒤에 순번을 붙인다.
 * @param name 만들려는 이름
 * @param used 이미 쓴 이름. 고른 이름을 더한다
 * @param separator 순번 앞에 붙일 글자
 * @returns 겹치지 않는 이름
 */
export function uniqueName(name: string, used: Set<string>, separator = ''): string {
  let candidate = name;
  let count = 1;
  while (used.has(candidate)) {
    count += 1;
    candidate = `${name}${separator}${String(count)}`;
  }
  used.add(candidate);
  return candidate;
}

/**
 * 낱말을 PascalCase로 잇는다.
 * @param words 소문자 낱말
 * @returns PascalCase 이름
 */
export function pascalCase(words: readonly string[]): string {
  return words.map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`).join('');
}

/**
 * 낱말을 camelCase로 잇는다.
 * @param words 소문자 낱말
 * @returns camelCase 이름
 */
function camelCase(words: readonly string[]): string {
  const pascal = pascalCase(words);
  return `${pascal.charAt(0).toLowerCase()}${pascal.slice(1)}`;
}
