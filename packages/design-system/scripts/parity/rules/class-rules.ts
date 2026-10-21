/**
 * 피그마 역할·선택지 → 코드 클래스 대응표. 비교 규칙이 쓰는 이름 규칙은 모두 이 파일 한곳에 둔다.
 * 토큰 이름에서 클래스 이름을 만드는 접두어와, 토큰이 없는 선택지(정렬·방향 등)의 클래스를 담는다.
 * 규칙 설명은 [[피그마 일치 검사:비교 규칙]]에 있다.
 */

/** 같은 역할을 나타낼 수 있는 클래스 후보. 하나만 있으면 된다 */
export type ClassChoice = readonly string[];

/**
 * 토큰 이름으로 클래스를 만드는 접두어. 토큰 이름은 tokens.css의 CSS 변수 이름에서 이름공간을 뗀 것이다.
 * 예: 색 변수 accent-fill/default → --color-accent-fill-default → bg-accent-fill-default
 */
export const TOKEN_CLASS_PREFIXES = {
  /** 채우기 색(--color-*) */
  fill: 'bg-',
  /** 글자 색·한 가지 색 자산 색(--color-*) */
  textColor: 'text-',
  /** 안쪽 선(레이아웃에 들어가지 않음) 색(--color-*) */
  innerStrokeColor: 'inner-border-',
  /** 안쪽 선 그라데이션 칠 스타일(--gradient-*) */
  innerStrokeGradient: 'border-gradient-',
  /** 안쪽 선 두께(--border-width-*) */
  innerStrokeWidth: 'inner-border-w-',
  /** 레이아웃에 들어가는 안쪽 선 색·두께(CSS border, --color-*·--border-width-*) */
  borderColor: 'border-',
  borderWidth: 'border-',
  /** 바깥 선(outline) 색·두께(--color-*·--outline-width-*) */
  outlineColor: 'outline-',
  outlineWidth: 'outline-',
  /** 모서리 반경(--radius-*) */
  radius: 'rounded-',
  /** 불투명도(--opacity-*) */
  opacity: 'opacity-',
  /** 그림자·배경 흐림 효과 스타일(--shadow-*, --backdrop-blur-*, --text-shadow-*) */
  shadow: 'shadow-',
  backdropBlur: 'backdrop-blur-',
  textShadow: 'text-shadow-',
} as const;

/** 여백 한 변의 클래스 후보(간격 토큰 이름 n). 변 하나 → 변·축·전체 */
export const paddingClasses = {
  top: ['pt-', 'py-', 'p-'],
  right: ['pr-', 'px-', 'p-'],
  bottom: ['pb-', 'py-', 'p-'],
  left: ['pl-', 'px-', 'p-'],
} as const satisfies Record<string, readonly string[]>;

/** 자동 배치 간격의 클래스 후보. 주축 방향에 따라 다르다 */
export const GAP_CLASSES = {
  HORIZONTAL: { gap: ['gap-', 'gap-x-'], counterGap: ['gap-', 'gap-y-'] },
  VERTICAL: { gap: ['gap-', 'gap-y-'], counterGap: ['gap-', 'gap-x-'] },
} as const;

/** 고정 크기 클래스 후보. 크기 변수 그룹(size·spacing → 간격 이름공간, stroke-width → 선 두께) */
export const SIZE_CLASSES = {
  width: { spacing: ['w-', 'size-'], strokeWidth: ['w-stroke-'] },
  height: { spacing: ['h-', 'size-'], strokeWidth: ['h-stroke-'] },
  minWidth: { spacing: ['min-w-'], strokeWidth: [] },
  maxWidth: { spacing: ['max-w-'], strokeWidth: [] },
  minHeight: { spacing: ['min-h-'], strokeWidth: [] },
  maxHeight: { spacing: ['max-h-'], strokeWidth: [] },
} as const;

/** 자동 배치 방향. 루트가 가로로 내용에 맞추면(HUG) 줄 안 요소(inline-flex)여야 내용 폭이 된다 */
export const LAYOUT_MODE_CLASSES = {
  HORIZONTAL: { display: ['flex'], hugRootDisplay: ['inline-flex'], direction: [] },
  VERTICAL: { display: ['flex'], hugRootDisplay: ['inline-flex'], direction: ['flex-col'] },
} as const;

/** 주축 정렬(피그마 primaryAxisAlignItems) */
export const primaryAlignClasses: Readonly<Record<string, ClassChoice>> = {
  MIN: ['justify-start'],
  CENTER: ['justify-center'],
  MAX: ['justify-end'],
  SPACE_BETWEEN: ['justify-between'],
  SPACE_EVENLY: ['justify-evenly'],
  SPACE_AROUND: ['justify-around'],
};

/** 교차축 정렬(피그마 counterAxisAlignItems) */
export const counterAlignClasses: Readonly<Record<string, ClassChoice>> = {
  MIN: ['items-start'],
  CENTER: ['items-center'],
  MAX: ['items-end'],
  BASELINE: ['items-baseline'],
};

/** 줄바꿈 */
export const wrapClasses: Readonly<Record<string, ClassChoice>> = {
  WRAP: ['flex-wrap'],
};

/** 자기 정렬(피그마 layoutAlign). INHERIT는 부모 정렬을 따르므로 클래스가 없다 */
export const selfAlignClasses: Readonly<Record<string, ClassChoice>> = {
  MIN: ['self-start'],
  CENTER: ['self-center'],
  MAX: ['self-end'],
  STRETCH: ['self-stretch'],
};

/** 부모 주축 방향으로 채우기(FILL) */
export const fillPrimaryClasses: ClassChoice = ['flex-1', 'grow'];
/** 부모 교차축 방향으로 채우기(FILL) */
export const fillCounterClasses: ClassChoice = ['self-stretch'];

/** 내용 자르기(clipsContent) */
export const clipClasses: ClassChoice = ['overflow-hidden', 'overflow-clip'];

/** 원(ELLIPSE)은 반경 토큰 없이 완전히 둥근 모서리로 그린다 */
export const ellipseClasses: ClassChoice = ['rounded-full'];

/** 바깥 선(OUTSIDE)은 실선 outline으로 그린다 */
export const outlineStyleClasses: ClassChoice = ['outline-solid'];

/** 절대 위치(ABSOLUTE) */
export const absoluteClasses: ClassChoice = ['absolute'];

/** 절대 위치 제약 → 거리 클래스 접두어(간격 토큰 이름 n). 음수 거리는 앞에 -를 붙인다 */
export const INSET_CLASSES = {
  horizontal: {
    MIN: [['left-', 'inset-x-', 'inset-']],
    MAX: [['right-', 'inset-x-', 'inset-']],
    STRETCH: [
      ['left-', 'inset-x-', 'inset-'],
      ['right-', 'inset-x-', 'inset-'],
    ],
  },
  vertical: {
    MIN: [['top-', 'inset-y-', 'inset-']],
    MAX: [['bottom-', 'inset-y-', 'inset-']],
    STRETCH: [
      ['top-', 'inset-y-', 'inset-'],
      ['bottom-', 'inset-y-', 'inset-'],
    ],
  },
} as const;

/** 글자 가로 정렬. LEFT는 기본값이라 클래스가 없다 */
export const textAlignClasses: Readonly<Record<string, ClassChoice>> = {
  CENTER: ['text-center'],
  RIGHT: ['text-right'],
  JUSTIFIED: ['text-justify'],
};

/** 한 줄 말줄임(maxLines 1) */
export const truncateClasses: ClassChoice = ['truncate'];

/** 글자 꾸밈 */
export const textDecorationClasses: Readonly<Record<string, ClassChoice>> = {
  UNDERLINE: ['underline'],
  STRIKETHROUGH: ['line-through'],
};

/** 블렌드 모드 */
export const blendModeClasses: Readonly<Record<string, ClassChoice>> = {
  DARKEN: ['mix-blend-darken'],
  MULTIPLY: ['mix-blend-multiply'],
  COLOR_BURN: ['mix-blend-color-burn'],
  LIGHTEN: ['mix-blend-lighten'],
  SCREEN: ['mix-blend-screen'],
  COLOR_DODGE: ['mix-blend-color-dodge'],
  OVERLAY: ['mix-blend-overlay'],
  SOFT_LIGHT: ['mix-blend-soft-light'],
  HARD_LIGHT: ['mix-blend-hard-light'],
  DIFFERENCE: ['mix-blend-difference'],
  EXCLUSION: ['mix-blend-exclusion'],
  HUE: ['mix-blend-hue'],
  SATURATION: ['mix-blend-saturation'],
  COLOR: ['mix-blend-color'],
  LUMINOSITY: ['mix-blend-luminosity'],
};

/**
 * 표시 없는 요소에 있으면 안 되는 토큰 클래스(변형 접두어를 뗀 이름). 디자인 값을 정하는 클래스는 모두
 * 피그마 레이어와 짝지은 요소(data-figma)에만 있어야 한다.
 */
export const TOKEN_CLASS_PATTERN =
  /^(bg|text|inner-border|border-gradient|border|outline|rounded|shadow|backdrop-blur|opacity|type|p|pt|pr|pb|pl|px|py|gap|gap-x|gap-y|w|h|size|min-w|min-h|max-w|max-h|w-stroke|h-stroke|material)-/u;
