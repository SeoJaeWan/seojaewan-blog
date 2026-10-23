/**
 * 피그마 변수·스타일 이름 → CSS 사용자 속성 이름 규칙. 토큰 값 비교와 컴포넌트 판정의 이름 비교가 함께 쓴다.
 * 규칙 표는 [[피그마 일치 검사:토큰 작성]]에 있다.
 */

/**
 * 피그마 변수 경로를 CSS 사용자 속성 이름으로 바꾼다.
 * Tailwind가 유틸리티를 만드는 이름공간이 있으면 그 이름공간을 쓴다.
 * @codocs [[피그마 일치 검사:토큰 작성]]
 * @param path 변수 이름을 `/`로 나눈 경로
 * @returns `--`로 시작하는 CSS 사용자 속성 이름
 */
export function variableName(path: readonly string[]): string {
  const [group, subgroup, ...rest] = path;
  const joined = path.join('/');

  switch (group) {
    case 'color':
    case 'spacing':
    case 'radius':
    case 'blur':
    case 'opacity':
      return `--${group}-${tail([subgroup, ...rest])}`;
    case 'size':
      // 너비·높이 유틸리티(`h-*`, `size-*`)는 `--spacing-*`을 읽는다.
      return `--spacing-${tail([subgroup, ...rest])}`;
    case 'stroke-width':
      return `--border-width-${tail([subgroup, ...rest])}`;
    case 'font':
      return `--${fontNamespace(subgroup, joined)}-${tail(rest)}`;
    case 'motion':
      return `--motion-${tail([subgroup, ...rest])}`;
    default:
      // Semantic·Component 색 토큰(`text-fill/primary`)은 경로 그대로 `--color-*`이 된다.
      return `--color-${tail(path)}`;
  }
}

/**
 * 변수 하나가 tokens.css에 가질 수 있는 이름을 모두 구한다. 첫 이름이 변수 자신이고, 나머지는 Tailwind
 * 유틸리티가 읽도록 변수 자신을 `var()`로 가리키는 이름이다.
 * @codocs [[피그마 일치 검사:토큰 작성]]
 * @param path 변수 경로
 * @param hasFontSize 같은 이름의 `font/size/*` 변수가 있는지(줄 높이가 `--text-*--line-height`를 갖는다)
 * @returns CSS 이름 목록
 */
export function variableNames(path: readonly string[], hasFontSize: boolean): string[] {
  const name = variableName(path);
  const [group, subgroup, ...rest] = path;
  const suffix = tail(rest);
  const names = [name];
  if (group === 'font' && subgroup === 'line-height' && hasFontSize) {
    names.push(`--text-${suffix}--line-height`);
  }
  if (group === 'motion' && subgroup === 'duration') {
    names.push(`--transition-duration-${suffix}`);
  }
  if (group === 'motion' && subgroup === 'easing') {
    names.push(`--ease-${suffix}`);
  }
  if (group === 'stroke-width') {
    names.push(`--outline-width-${tail([subgroup, ...rest])}`);
  }
  return names;
}

/**
 * 스타일 이름을 CSS 이름 조각으로 바꾼다(`Surface/Flyout (Acrylic)` → `surface-flyout-acrylic`).
 * @param style `/`로 나눈 스타일 이름
 * @returns kebab-case 이름
 */
export function styleSlug(style: string): string {
  return style.split('/').map(kebabSegment).join('-');
}

/**
 * 효과 스타일이 만드는 이름. `Text/*` 묶음은 글자 그림자다.
 * @param style 효과 스타일 이름
 * @returns 그림자·배경 흐림·레이어 흐림 이름
 */
export function effectNames(style: string): { shadow: string; backdropBlur: string; blur: string } {
  const [group, ...rest] = style.split('/');
  const isText = group === 'Text' && rest.length > 0;
  const slug = isText ? styleSlug(rest.join('/')) : styleSlug(style);
  return {
    shadow: isText ? `--text-shadow-${slug}` : `--shadow-${slug}`,
    backdropBlur: `--backdrop-blur-${slug}`,
    blur: `--blur-${slug}`,
  };
}

/**
 * 경로 조각들을 kebab-case로 바꿔 `-`로 잇는다.
 * @param segments 경로 조각(없는 조각은 건너뛴다)
 * @returns `text-fill-primary` 형태의 이름
 */
function tail(segments: readonly (string | undefined)[]): string {
  return segments
    .filter((segment): segment is string => segment !== undefined)
    .map(kebabSegment)
    .join('-');
}

/**
 * 스타일 이름 경로 조각을 CSS 이름 조각으로 바꾼다. 공백과 괄호는 `-`가 된다.
 * @param segment 피그마 이름 조각(`Body Strong`, `Flyout (Acrylic)`)
 * @returns 소문자 kebab-case 조각
 */
export function kebabSegment(segment: string): string {
  return segment
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-+|-+$/gu, '');
}

/**
 * `font/*` 변수의 두 번째 경로를 Tailwind 이름공간으로 바꾼다.
 * @param subgroup `family`, `weight`, `size`, `line-height`, `letter-spacing`
 * @param path 오류 메시지에 쓸 전체 경로
 * @returns Tailwind 이름공간(`font`, `font-weight`, `text`, `leading`, `tracking`)
 */
function fontNamespace(subgroup: string | undefined, path: string): string {
  switch (subgroup) {
    case 'family':
      return 'font';
    case 'weight':
      return 'font-weight';
    case 'size':
      return 'text';
    case 'line-height':
      return 'leading';
    case 'letter-spacing':
      return 'tracking';
    default:
      throw new Error(`${path}: 이름 규칙이 정해지지 않은 서체 변수다.`);
  }
}
