/**
 * export.json의 레이어 정보(역할마다 토큰 이름, 자동 배치 선택지)를 코드에서 확인할 항목으로 바꾼다.
 * 항목마다 있어야 할 클래스(이름 비교)와, 그 클래스가 만드는 계산값(계산값 비교)을 담는다.
 * 브라우저에서 확인하는 일은 page-checks.ts가 맡는다. 규칙은 [[피그마 일치 검사:비교 규칙]]에 있다.
 */

import { kebabSegment, type TextUtilityVariables, variableName } from '../tokens/tokens-css.ts';
import {
  absoluteClasses,
  blendModeClasses,
  type ClassChoice,
  clipClasses,
  counterAlignClasses,
  ellipseClasses,
  fillCounterClasses,
  fillPrimaryClasses,
  GAP_CLASSES,
  INSET_CLASSES,
  LAYOUT_MODE_CLASSES,
  outlineStyleClasses,
  paddingClasses,
  primaryAlignClasses,
  selfAlignClasses,
  SIZE_CLASSES,
  textAlignClasses,
  textDecorationClasses,
  TOKEN_CLASS_PREFIXES,
  truncateClasses,
  wrapClasses,
} from './rules/class-rules.ts';
import { parityDecisions } from './rules/decisions.ts';

/** 계산값 하나. 요소(또는 의사 요소)의 속성 계산값이 css 값을 넣은 비교용 요소의 계산값과 같아야 한다 */
export type ComputedExpectation = {
  property: string;
  /** `::before`, `::placeholder` */
  pseudo?: string;
  /** 비교용 요소에 넣을 값(`var(--color-x)`, `center`) */
  css?: string;
  /** css 대신 이 클래스를 붙인 비교용 요소의 계산값과 비교한다(손으로 쓴 유틸리티) */
  probeClass?: string;
};

/** 확인 항목 하나 */
export type LayerCheck = {
  /** 레이어 경로. 루트는 빈 문자열 */
  layer: string;
  /** 역할 이름(실패 메시지용) */
  role: string;
  /** 피그마 쪽 이름이나 값(실패 메시지용) */
  figma: string;
  /** 있어야 할 클래스 묶음. 묶음마다 후보 중 하나가 있어야 한다 */
  classes: ClassChoice[];
  /** true면 클래스가 요소나 조상(루트까지)에 있으면 된다(상속되는 속성) */
  inherited?: boolean;
  /** 계산값 비교 */
  computed: ComputedExpectation[];
};

/** 글자 구간 하나 */
export type SegmentCheck = {
  start: number;
  end: number;
  /** 피그마 글자 스타일 이름(메시지용) */
  textStyle: string;
  /** 피그마 구간 서체(D2: 글자마다 실제로 그린 서체와 비교) */
  fontFamily: string;
  fill: { figma: string; classes: ClassChoice; css: string } | null;
  /** 구간 스타일 변수와 같은 변수를 쓰는 글자 스타일 유틸리티(type-*) 후보 */
  typeClasses: ClassChoice;
  /** 구간 스타일 변수 이름(메시지용) */
  styleFigma: string;
  styleComputed: ComputedExpectation[];
  decoration: { figma: string; classes: ClassChoice } | null;
};

/** 글자 레이어 */
export type TextCheck = {
  layer: string;
  characters: string;
  segments: SegmentCheck[];
};

/** 자산 레이어 */
export type AssetCheck = {
  layer: string;
  /** 자산 파일(figma/assets/ 기준). 코드 요소의 data-asset 값과 같아야 한다 */
  file: string;
  color: { figma: string; classes: ClassChoice; css: string } | null;
};

/** 변형 하나(또는 BOOLEAN 경우 하나)의 확인 항목 */
export type VariantChecks = {
  /** 레이어 경로(루트는 빈 문자열) */
  layers: string[];
  /** 슬롯 레이어 경로. 슬롯 안쪽 내용은 비교하지 않는다 */
  slots: string[];
  hidden: string[];
  checks: LayerCheck[];
  texts: TextCheck[];
  assets: AssetCheck[];
  /** 비교할 수 없는 레이어 정보(규칙 없음). 실패로 다룬다 */
  unsupported: { layer: string; message: string }[];
};

// 자간 비교 허용 오차(피그마 소수 오차)
const LETTER_SPACING_TOLERANCE = 0.001;

// 네 방향(CSS 이름)
const CSS_SIDES = ['top', 'right', 'bottom', 'left'] as const;

/** 토큰 이름 정보 */
export type TokenNames = {
  /** tokens.css·theme.css에 있는 CSS 변수 이름(`--color-accent-fill-default`) */
  variables: ReadonlySet<string>;
  /** Tailwind `@utility`로 정의한 유틸리티 이름(`material-acrylic-default`) */
  utilities: ReadonlySet<string>;
  /** type-* 유틸리티 → 쓰는 변수 */
  textUtilities: ReadonlyMap<string, TextUtilityVariables>;
};

type JsonRecord = Record<string, unknown>;

/**
 * 변형 하나의 레이어 목록을 확인 항목으로 바꾼다.
 * @codocs [[피그마 일치 검사:비교 규칙]]
 * @param layers export.json의 layers
 * @param hidden export.json의 hidden
 * @param tokens 토큰 이름 정보
 * @returns 확인 항목
 */
export function variantChecks(
  layers: readonly unknown[],
  hidden: readonly string[],
  tokens: TokenNames,
): VariantChecks {
  const result: VariantChecks = {
    layers: [],
    slots: [],
    hidden: [...hidden],
    checks: [],
    texts: [],
    assets: [],
    unsupported: [],
  };
  const records = layers.filter(isRecord);
  const byPath = new Map(records.map((layer) => [stringOf(layer.path), layer]));
  for (const layer of records) {
    const path = stringOf(layer.path);
    result.layers.push(path);
    const context: LayerContext = {
      path,
      layer,
      parent: byPath.get(parentPath(path)),
      tokens,
      result,
    };
    try {
      layerChecks(context);
    } catch (error) {
      result.unsupported.push({
        layer: path,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return result;
}

type LayerContext = {
  path: string;
  layer: JsonRecord;
  parent: JsonRecord | undefined;
  tokens: TokenNames;
  result: VariantChecks;
};

/**
 * 레이어 하나의 확인 항목을 더한다.
 * @param context 레이어와 결과
 */
function layerChecks(context: LayerContext): void {
  const { layer, result, path } = context;
  const type = stringOf(layer.type);
  if (type === 'SLOT') {
    result.slots.push(path);
  }
  sizingChecks(context);
  selfChecks(context);
  if (isRecord(layer.asset)) {
    assetCheck(context, layer.asset);
    return;
  }
  layoutChecks(context);
  if (type === 'SLOT') {
    return;
  }
  paintChecks(context);
  strokeChecks(context);
  radiusChecks(context);
  effectChecks(context);
  miscChecks(context);
  if (isRecord(layer.text)) {
    textChecks(context, layer.text);
  }
}

/**
 * 크기(고정 크기 변수, 채우기, 최소·최대)를 확인한다.
 * @param context 레이어와 결과
 */
function sizingChecks(context: LayerContext): void {
  const { layer, path, parent } = context;
  const sizing = isRecord(layer.sizing) ? layer.sizing : {};
  const parentMode = parent === undefined ? null : layoutMode(parent);
  for (const axis of ['horizontal', 'vertical'] as const) {
    const mode = stringOf(sizing[axis]);
    const dimension = axis === 'horizontal' ? 'width' : 'height';
    const roleName = axis === 'horizontal' ? '너비' : '높이';
    if (mode === 'FIXED') {
      const variable = sizing[dimension];
      if (typeof variable !== 'string') {
        throw new Error(`${roleName}가 크기 변수에 연결되어 있지 않다`);
      }
      add(context, {
        role: roleName,
        figma: variable,
        classes: [sizeClassChoice(dimension, variable)],
        computed: [{ property: dimension, css: `var(${variableName(variable.split('/'))})` }],
      });
    } else if (mode === 'FILL' && parentMode !== null) {
      const isPrimary = (parentMode === 'HORIZONTAL') === (axis === 'horizontal');
      add(context, {
        role: `${roleName} 채우기`,
        figma: 'FILL',
        classes: [isPrimary ? fillPrimaryClasses : fillCounterClasses],
        computed: isPrimary
          ? [{ property: 'flex-grow', css: '1' }]
          : [{ property: 'align-self', css: 'stretch' }],
      });
    } else if (mode === 'HUG' && parentMode !== null) {
      const isPrimary = (parentMode === 'HORIZONTAL') === (axis === 'horizontal');
      if (isPrimary) {
        add(context, {
          role: `${roleName} 내용 맞춤`,
          figma: 'HUG',
          classes: [],
          computed: [{ property: 'flex-grow', css: '0' }],
        });
      }
    }
  }
  for (const key of ['minWidth', 'maxWidth', 'minHeight', 'maxHeight'] as const) {
    const variable = sizing[key];
    if (variable === undefined) {
      continue;
    }
    if (typeof variable !== 'string') {
      throw new Error(`${key}가 크기 변수에 연결되어 있지 않다`);
    }
    const property = key.replace(/[A-Z]/u, (letter) => `-${letter.toLowerCase()}`);
    add(context, {
      role: property,
      figma: variable,
      classes: [sizeClassChoice(key, variable)],
      computed: [{ property, css: `var(${variableName(variable.split('/'))})` }],
    });
  }
  if (path === '' && layoutMode(layer) !== null) {
    // 루트가 내용에 맞추는지는 표시 방식(inline-flex)으로 확인한다(layoutChecks).
  }
}

/**
 * 크기 변수에 맞는 클래스 후보를 만든다.
 * @param key 크기 속성
 * @param variable 크기 변수 경로
 * @returns 클래스 후보
 */
function sizeClassChoice(key: keyof typeof SIZE_CLASSES, variable: string): ClassChoice {
  const segments = variable.split('/');
  const name = variableName(segments);
  if (segments[0] === 'stroke-width') {
    return SIZE_CLASSES[key].strokeWidth.map(
      (prefix) => `${prefix}${stripNamespace(name, '--border-width-')}`,
    );
  }
  return SIZE_CLASSES[key].spacing.map(
    (prefix) => `${prefix}${stripNamespace(name, '--spacing-')}`,
  );
}

/**
 * 부모 자동 배치 안의 자기 정렬과 절대 위치를 확인한다.
 * @param context 레이어와 결과
 */
function selfChecks(context: LayerContext): void {
  const self = isRecord(context.layer.self) ? context.layer.self : null;
  if (self === null) {
    return;
  }
  const align = stringOf(self.align);
  if (align !== '') {
    const classes = selfAlignClasses[align];
    if (classes === undefined) {
      throw new Error(`자기 정렬 ${align}의 클래스 규칙이 없다`);
    }
    add(context, {
      role: '자기 정렬',
      figma: align,
      classes: [classes],
      computed: [{ property: 'align-self', css: alignSelfCss(align) }],
    });
  }
  if (!isRecord(self.absolute)) {
    return;
  }
  add(context, {
    role: '절대 위치',
    figma: 'ABSOLUTE',
    classes: [absoluteClasses],
    computed: [{ property: 'position', css: 'absolute' }],
  });
  for (const axis of ['horizontal', 'vertical'] as const) {
    const constraint = self.absolute[axis];
    if (!isRecord(constraint)) {
      continue;
    }
    const kind = stringOf(constraint.constraint);
    const sides = INSET_CLASSES[axis][kind as keyof (typeof INSET_CLASSES)[typeof axis]] as
      readonly (readonly string[])[] | undefined;
    const distances = Array.isArray(constraint.distances) ? constraint.distances : [];
    if (sides === undefined || sides.length !== distances.length) {
      throw new Error(`절대 위치 제약 ${kind}의 클래스 규칙이 없다(D1)`);
    }
    for (const [index, prefixes] of sides.entries()) {
      const distance: unknown = distances[index];
      if (!isRecord(distance) || typeof distance.token !== 'string') {
        throw new Error('절대 위치 거리가 간격 토큰으로 정해지지 않는다(D1)');
      }
      const tokenName = stripNamespace(variableName(distance.token.split('/')), '--spacing-');
      const sign = distance.isNegative === true ? '-' : '';
      const side = cssSide(axis, kind, index);
      add(context, {
        role: `절대 위치 ${side}`,
        figma: `${sign}${distance.token}`,
        classes: [prefixes.map((prefix) => `${sign}${prefix}${tokenName}`)],
        computed: [
          {
            property: side,
            css:
              sign === ''
                ? `var(--spacing-${tokenName})`
                : `calc(var(--spacing-${tokenName}) * -1)`,
          },
        ],
      });
    }
  }
}

/**
 * 절대 위치 거리가 정하는 CSS 변 이름을 고른다.
 * @param axis 축
 * @param kind 제약
 * @param index 거리 순서(STRETCH는 시작·끝)
 * @returns CSS 속성 이름
 */
function cssSide(axis: 'horizontal' | 'vertical', kind: string, index: number): string {
  const [start, end] = axis === 'horizontal' ? ['left', 'right'] : ['top', 'bottom'];
  if (kind === 'MAX') {
    return end;
  }
  return index === 0 ? start : end;
}

/**
 * 자동 배치(방향, 정렬, 여백, 간격)를 확인한다.
 * @param context 레이어와 결과
 */
function layoutChecks(context: LayerContext): void {
  const { layer, path } = context;
  const layout = isRecord(layer.layout) ? layer.layout : null;
  if (layout === null) {
    return;
  }
  const mode = stringOf(layout.mode);
  if (mode !== 'HORIZONTAL' && mode !== 'VERTICAL') {
    throw new Error(`자동 배치 방향 ${mode}의 클래스 규칙이 없다`);
  }
  const rules = LAYOUT_MODE_CLASSES[mode];
  const sizing = isRecord(layer.sizing) ? layer.sizing : {};
  const isHugRoot = path === '' && stringOf(sizing.horizontal) === 'HUG';
  const display = isHugRoot ? rules.hugRootDisplay : rules.display;
  add(context, {
    role: '배치 방향',
    figma: mode,
    classes: rules.direction.length > 0 ? [display, rules.direction] : [display],
    computed: [
      { property: 'display', css: display[0] },
      { property: 'flex-direction', css: mode === 'VERTICAL' ? 'column' : 'row' },
    ],
  });
  choiceCheck(context, '주축 정렬', primaryAlignClasses, stringOf(layout.primaryAlign), {
    property: 'justify-content',
    css: justifyCss(stringOf(layout.primaryAlign)),
  });
  choiceCheck(context, '교차축 정렬', counterAlignClasses, stringOf(layout.counterAlign), {
    property: 'align-items',
    css: alignItemsCss(stringOf(layout.counterAlign)),
  });
  if (stringOf(layout.wrap) === 'WRAP') {
    choiceCheck(context, '줄바꿈', wrapClasses, 'WRAP', { property: 'flex-wrap', css: 'wrap' });
  }
  const padding = isRecord(layout.padding) ? layout.padding : {};
  for (const side of ['top', 'right', 'bottom', 'left'] as const) {
    const variable = padding[side];
    if (typeof variable !== 'string') {
      continue;
    }
    const tokenName = stripNamespace(variableName(variable.split('/')), '--spacing-');
    add(context, {
      role: `여백(${side})`,
      figma: variable,
      classes: [paddingClasses[side].map((prefix) => `${prefix}${tokenName}`)],
      computed: [{ property: `padding-${side}`, css: `var(--spacing-${tokenName})` }],
    });
  }
  for (const key of ['gap', 'counterGap'] as const) {
    const variable = layout[key];
    if (typeof variable !== 'string') {
      continue;
    }
    const tokenName = stripNamespace(variableName(variable.split('/')), '--spacing-');
    const isColumn = (mode === 'HORIZONTAL') === (key === 'gap');
    add(context, {
      role: key === 'gap' ? '간격' : '줄 간격',
      figma: variable,
      classes: [GAP_CLASSES[mode][key].map((prefix) => `${prefix}${tokenName}`)],
      computed: [
        { property: isColumn ? 'column-gap' : 'row-gap', css: `var(--spacing-${tokenName})` },
      ],
    });
  }
}

/**
 * 칠(단색 변수, 칠 스타일)을 확인한다. 칠이 없으면 배경이 없어야 한다.
 * @param context 레이어와 결과
 */
function paintChecks(context: LayerContext): void {
  const { layer, tokens } = context;
  if (isRecord(layer.text)) {
    return;
  }
  const fill = isRecord(layer.fill) ? layer.fill : null;
  if (fill === null) {
    add(context, {
      role: '채우기',
      figma: '없음',
      classes: [],
      computed: [
        { property: 'background-color', css: 'transparent' },
        { property: 'background-image', css: 'none' },
      ],
    });
    return;
  }
  if (typeof fill.variable === 'string') {
    const color = colorName(fill.variable);
    add(context, {
      role: '채우기',
      figma: fill.variable,
      classes: [[`${TOKEN_CLASS_PREFIXES.fill}${color}`]],
      computed: [{ property: 'background-color', css: `var(--color-${color})` }],
    });
    return;
  }
  const style = stringOf(fill.style);
  const slug = styleSlug(style);
  if (tokens.variables.has(`--color-${slug}`)) {
    add(context, {
      role: '채우기',
      figma: style,
      classes: [[`${TOKEN_CLASS_PREFIXES.fill}${slug}`]],
      computed: [{ property: 'background-color', css: `var(--color-${slug})` }],
    });
  } else if (tokens.utilities.has(slug)) {
    add(context, {
      role: '채우기',
      figma: style,
      classes: [[slug]],
      computed: [
        { property: 'background-color', probeClass: slug },
        { property: 'background-image', probeClass: slug },
      ],
    });
  } else {
    throw new Error(`칠 스타일 ${style}에 맞는 토큰이나 유틸리티가 없다`);
  }
}

/**
 * 선(안쪽 고리, 레이아웃에 들어가는 테두리, 바깥 outline)을 확인한다. 선이 없으면 셋 다 없어야 한다.
 * @param context 레이어와 결과
 */
function strokeChecks(context: LayerContext): void {
  const { layer, tokens } = context;
  const stroke = isRecord(layer.stroke) ? layer.stroke : null;
  if (stroke === null) {
    if (layer.type !== 'TEXT') {
      add(context, {
        role: '선',
        figma: '없음',
        classes: [],
        computed: [
          { property: 'content', pseudo: '::before', css: 'none' },
          { property: 'outline-style', css: 'none' },
          ...['top', 'right', 'bottom', 'left'].map((side) => ({
            property: `border-${side}-width`,
            css: '0px',
          })),
        ],
      });
    }
    return;
  }
  const weight = isRecord(stroke.weight) ? stroke.weight : {};
  const weights = new Set(Object.values(weight));
  const [weightVariable] = weights;
  if (weights.size !== 1 || typeof weightVariable !== 'string') {
    throw new Error('변마다 다른 선 두께는 비교 규칙이 없다');
  }
  const widthName = stripNamespace(variableName(weightVariable.split('/')), '--border-width-');
  const paint = isRecord(stroke.paint) ? stroke.paint : {};
  const align = stringOf(stroke.align);
  const isIncluded = stroke.includedInLayout === true;
  if (align === 'OUTSIDE') {
    const color = colorOf(paint, '바깥 선');
    add(context, {
      role: '선 위치',
      figma: 'OUTSIDE',
      classes: [outlineStyleClasses],
      computed: [
        { property: 'outline-style', css: 'solid' },
        { property: 'outline-offset', css: '0px' },
      ],
    });
    add(context, {
      role: '선 색',
      figma: stringOf(paint.variable),
      classes: [[`${TOKEN_CLASS_PREFIXES.outlineColor}${color}`]],
      computed: [{ property: 'outline-color', css: `var(--color-${color})` }],
    });
    add(context, {
      role: '선 두께',
      figma: weightVariable,
      classes: [[`${TOKEN_CLASS_PREFIXES.outlineWidth}${widthName}`]],
      computed: [{ property: 'outline-width', css: `var(--border-width-${widthName})` }],
    });
    return;
  }
  if (isIncluded) {
    const color = colorOf(paint, '레이아웃에 들어가는 선');
    add(context, {
      role: '선 색',
      figma: stringOf(paint.variable),
      classes: [[`${TOKEN_CLASS_PREFIXES.borderColor}${color}`]],
      computed: ['top', 'right', 'bottom', 'left'].map((side) => ({
        property: `border-${side}-color`,
        css: `var(--color-${color})`,
      })),
    });
    add(context, {
      role: '선 두께',
      figma: weightVariable,
      classes: [[`${TOKEN_CLASS_PREFIXES.borderWidth}${widthName}`]],
      computed: ['top', 'right', 'bottom', 'left'].flatMap((side) => [
        { property: `border-${side}-width`, css: `var(--border-width-${widthName})` },
        { property: `border-${side}-style`, css: 'solid' },
      ]),
    });
    return;
  }
  if (typeof paint.variable === 'string') {
    const color = colorName(paint.variable);
    add(context, {
      role: '선 색',
      figma: paint.variable,
      classes: [[`${TOKEN_CLASS_PREFIXES.innerStrokeColor}${color}`]],
      computed: [
        { property: 'background-color', pseudo: '::before', css: `var(--color-${color})` },
      ],
    });
  } else {
    const style = stringOf(paint.style);
    const slug = styleSlug(style);
    if (!tokens.variables.has(`--gradient-${slug}`)) {
      throw new Error(`선 칠 스타일 ${style}에 맞는 그라데이션 토큰이 없다`);
    }
    add(context, {
      role: '선 색',
      figma: style,
      classes: [[`${TOKEN_CLASS_PREFIXES.innerStrokeGradient}${slug}`]],
      computed: [
        { property: 'background-image', pseudo: '::before', css: `var(--gradient-${slug})` },
      ],
    });
  }
  add(context, {
    role: '선 두께',
    figma: weightVariable,
    classes: [[`${TOKEN_CLASS_PREFIXES.innerStrokeWidth}${widthName}`]],
    computed: CSS_SIDES.map((side) => ringPadding(side, widthName)),
  });
}

/**
 * 안쪽 선 고리(::before)의 한 쪽 두께 기대값을 만든다. 고리는 padding으로 선 두께를 정한다.
 * @param side CSS 방향
 * @param widthName 선 두께 토큰 이름
 * @returns 계산값 기대
 */
function ringPadding(side: string, widthName: string): ComputedExpectation {
  return {
    property: `padding-${side}`,
    pseudo: '::before',
    css: `var(--border-width-${widthName})`,
  };
}

/**
 * 모서리 반경을 확인한다. 원은 완전히 둥근 모서리, 반경이 없으면 0이어야 한다.
 * @param context 레이어와 결과
 */
function radiusChecks(context: LayerContext): void {
  const { layer } = context;
  const corners = [
    ['topLeft', 'top-left', 'tl'],
    ['topRight', 'top-right', 'tr'],
    ['bottomRight', 'bottom-right', 'br'],
    ['bottomLeft', 'bottom-left', 'bl'],
  ] as const;
  if (layer.type === 'ELLIPSE') {
    add(context, {
      role: '모서리 반경',
      figma: 'ELLIPSE',
      classes: [ellipseClasses],
      computed: corners.map(([, css]) => ({
        property: `border-${css}-radius`,
        css: 'calc(infinity * 1px)',
      })),
    });
    return;
  }
  if (layer.type === 'TEXT') {
    return;
  }
  const radius = isRecord(layer.radius) ? layer.radius : null;
  if (radius === null) {
    add(context, {
      role: '모서리 반경',
      figma: '없음',
      classes: [],
      computed: corners.map(([, css]) => ({ property: `border-${css}-radius`, css: '0px' })),
    });
    return;
  }
  const values = new Set(corners.map(([key]) => radius[key]));
  if (values.size === 1 && corners.every(([key]) => typeof radius[key] === 'string')) {
    const variable = stringOf(radius.topLeft);
    const name = stripNamespace(variableName(variable.split('/')), '--radius-');
    add(context, {
      role: '모서리 반경',
      figma: variable,
      classes: [[`${TOKEN_CLASS_PREFIXES.radius}${name}`]],
      computed: corners.map(([, css]) => ({
        property: `border-${css}-radius`,
        css: `var(--radius-${name})`,
      })),
    });
    return;
  }
  for (const [key, css, short] of corners) {
    const variable = radius[key];
    if (typeof variable !== 'string') {
      add(context, {
        role: `모서리 반경(${css})`,
        figma: '없음',
        classes: [],
        computed: [{ property: `border-${css}-radius`, css: '0px' }],
      });
      continue;
    }
    const name = stripNamespace(variableName(variable.split('/')), '--radius-');
    add(context, {
      role: `모서리 반경(${css})`,
      figma: variable,
      classes: [[`${TOKEN_CLASS_PREFIXES.radius}${short}-${name}`]],
      computed: [{ property: `border-${css}-radius`, css: `var(--radius-${name})` }],
    });
  }
}

/**
 * 효과 스타일(그림자, 배경 흐림)을 확인한다. 효과가 없으면 둘 다 없어야 한다.
 * @param context 레이어와 결과
 */
function effectChecks(context: LayerContext): void {
  const { layer, tokens } = context;
  if (typeof layer.effect !== 'string') {
    if (layer.type !== 'TEXT') {
      add(context, {
        role: '효과',
        figma: '없음',
        classes: [],
        computed: [
          { property: 'box-shadow', css: 'none' },
          { property: 'backdrop-filter', css: 'none' },
        ],
      });
    }
    return;
  }
  const slug = styleSlug(layer.effect);
  const hasShadow = tokens.variables.has(`--shadow-${slug}`);
  const hasBlur = tokens.variables.has(`--backdrop-blur-${slug}`);
  if (!hasShadow && !hasBlur) {
    throw new Error(`효과 스타일 ${layer.effect}에 맞는 토큰이 없다`);
  }
  add(context, {
    role: '효과(그림자)',
    figma: layer.effect,
    classes: hasShadow ? [[`${TOKEN_CLASS_PREFIXES.shadow}${slug}`]] : [],
    computed: [{ property: 'box-shadow', css: hasShadow ? `var(--shadow-${slug})` : 'none' }],
  });
  add(context, {
    role: '효과(배경 흐림)',
    figma: layer.effect,
    classes: hasBlur ? [[`${TOKEN_CLASS_PREFIXES.backdropBlur}${slug}`]] : [],
    computed: [
      {
        property: 'backdrop-filter',
        css: hasBlur ? `blur(var(--backdrop-blur-${slug}))` : 'none',
      },
    ],
  });
}

/**
 * 불투명도, 블렌드, 회전, 자르기를 확인한다.
 * @param context 레이어와 결과
 */
function miscChecks(context: LayerContext): void {
  const { layer } = context;
  if (typeof layer.opacity === 'string') {
    const name = stripNamespace(variableName(layer.opacity.split('/')), '--opacity-');
    add(context, {
      role: '불투명도',
      figma: layer.opacity,
      classes: [[`${TOKEN_CLASS_PREFIXES.opacity}${name}`]],
      computed: [{ property: 'opacity', css: `var(--opacity-${name})` }],
    });
  } else {
    add(context, {
      role: '불투명도',
      figma: '1',
      classes: [],
      computed: [{ property: 'opacity', css: '1' }],
    });
  }
  if (typeof layer.blendMode === 'string') {
    choiceCheck(context, '블렌드', blendModeClasses, layer.blendMode, {
      property: 'mix-blend-mode',
      css: layer.blendMode.toLowerCase().replace(/_/gu, '-'),
    });
  }
  const rotation = typeof layer.rotation === 'number' ? String(layer.rotation) : '0';
  const rotations: Readonly<Record<string, string>> = parityDecisions.d9.allowedRotations;
  const rotationClass = rotations[rotation];
  if (rotationClass === undefined) {
    throw new Error(`회전 ${rotation}°의 클래스 규칙이 없다(D9)`);
  }
  if (rotationClass !== '') {
    add(context, {
      role: '회전',
      figma: `${rotation}°`,
      classes: [[rotationClass]],
      computed: [{ property: 'rotate', css: `${String(-Number(rotation))}deg` }],
    });
  }
  if (isRecord(layer.layout) || layer.type === 'RECTANGLE') {
    if (layer.clipsContent === true) {
      add(context, {
        role: '내용 자르기',
        figma: 'clipsContent',
        classes: [clipClasses],
        computed: [{ property: 'overflow-x', css: 'hidden' }],
      });
    }
  }
}

/**
 * 글자 레이어(내용, 구간마다 색·스타일·서체, 정렬, 말줄임)를 확인한다.
 * @param context 레이어와 결과
 * @param text export.json의 text
 */
function textChecks(context: LayerContext, text: JsonRecord): void {
  const { path, tokens, result } = context;
  const align = stringOf(text.alignHorizontal);
  if (align !== 'LEFT') {
    choiceCheck(context, '글자 정렬', textAlignClasses, align, {
      property: 'text-align',
      css: align === 'JUSTIFIED' ? 'justify' : align.toLowerCase(),
    });
  }
  if (text.maxLines === 1) {
    add(context, {
      role: '말줄임',
      figma: 'maxLines 1',
      classes: [truncateClasses],
      computed: [
        { property: 'text-overflow', css: 'ellipsis' },
        { property: 'white-space', css: 'nowrap' },
      ],
    });
  } else if (text.maxLines !== null && text.maxLines !== undefined) {
    throw new Error(`여러 줄 말줄임(maxLines ${JSON.stringify(text.maxLines)})은 비교 규칙이 없다`);
  }
  const segments = Array.isArray(text.segments) ? text.segments.filter(isRecord) : [];
  result.texts.push({
    layer: path,
    characters: stringOf(text.characters),
    segments: segments.map((segment) => segmentCheck(segment, tokens)),
  });
}

/**
 * 글자 스타일 속성의 연결 변수 이름이나 값을 읽는다.
 * @param style export.json 구간의 style
 * @param key 속성 이름
 * @param field 읽을 칸(variable 또는 value)
 * @returns 문자열이면 그 값
 */
function styleField(
  style: JsonRecord,
  key: string,
  field: 'variable' | 'value',
): string | undefined {
  const entry = style[key];
  return isRecord(entry) && typeof entry[field] === 'string' ? entry[field] : undefined;
}

/**
 * 글자 구간 하나의 확인 항목을 만든다.
 * @param segment export.json의 구간
 * @param tokens 토큰 이름 정보
 * @returns 구간 확인 항목
 */
function segmentCheck(segment: JsonRecord, tokens: TokenNames): SegmentCheck {
  const style = isRecord(segment.style) ? segment.style : {};
  const fontSize = styleField(style, 'fontSize', 'variable');
  const lineHeight = styleField(style, 'lineHeight', 'variable');
  const fontWeight = styleField(style, 'fontWeight', 'variable');
  const letterSpacing = styleField(style, 'letterSpacing', 'value');
  const letterSpacingVariable = styleField(style, 'letterSpacing', 'variable');
  const typeClasses: string[] = [];
  for (const [name, used] of tokens.textUtilities) {
    if (
      used.fontSize === fontSize &&
      used.lineHeight === lineHeight &&
      used.fontWeight === fontWeight &&
      sameLetterSpacing(used.letterSpacing, letterSpacing, letterSpacingVariable)
    ) {
      typeClasses.push(name);
    }
  }
  const styleComputed: ComputedExpectation[] = [];
  if (fontSize !== undefined) {
    styleComputed.push({ property: 'font-size', css: `var(${variableName(fontSize.split('/'))})` });
  }
  if (lineHeight !== undefined) {
    styleComputed.push({
      property: 'line-height',
      css: `var(${variableName(lineHeight.split('/'))})`,
    });
  }
  if (fontWeight !== undefined) {
    styleComputed.push({
      property: 'font-weight',
      css: `var(${variableName(fontWeight.split('/'))})`,
    });
  }
  const spacingCss = letterSpacing === undefined ? undefined : letterSpacingCss(letterSpacing);
  if (spacingCss !== undefined) {
    styleComputed.push({ property: 'letter-spacing', css: spacingCss });
  }
  const fill = isRecord(segment.fill) ? segment.fill : null;
  if (fill !== null && typeof fill.variable !== 'string') {
    throw new Error('칠 스타일을 쓴 글자 구간은 비교 규칙이 없다');
  }
  const decoration = stringOf(segment.textDecoration);
  const decorationClasses = textDecorationClasses[decoration];
  return {
    start: typeof segment.start === 'number' ? segment.start : 0,
    end: typeof segment.end === 'number' ? segment.end : 0,
    textStyle: stringOf(segment.textStyle),
    fontFamily: stringOf(segment.fontFamily),
    fill:
      fill === null || typeof fill.variable !== 'string'
        ? null
        : {
            figma: fill.variable,
            classes: [`${TOKEN_CLASS_PREFIXES.textColor}${colorName(fill.variable)}`],
            css: `var(--color-${colorName(fill.variable)})`,
          },
    typeClasses,
    styleFigma: [fontSize, lineHeight, fontWeight, letterSpacing ?? '']
      .filter((part) => part !== undefined && part !== '')
      .join(', '),
    styleComputed,
    decoration:
      decorationClasses === undefined ? null : { figma: decoration, classes: decorationClasses },
  };
}

/**
 * 자산 레이어 확인 항목을 더한다.
 * @param context 레이어와 결과
 * @param asset export.json의 asset
 */
function assetCheck(context: LayerContext, asset: JsonRecord): void {
  const { path, result } = context;
  const color = typeof asset.color === 'string' ? asset.color : null;
  if (asset.kind === 'mono' && color === null) {
    throw new Error('한 가지 색 자산의 색이 없다(D6)');
  }
  result.assets.push({
    layer: path,
    file: stringOf(asset.file),
    color:
      color === null
        ? null
        : {
            figma: color,
            classes: [`${TOKEN_CLASS_PREFIXES.textColor}${colorName(color)}`],
            css: `var(--color-${colorName(color)})`,
          },
  });
}

/**
 * 선택지 확인 항목을 더한다.
 * @param context 레이어와 결과
 * @param role 역할 이름
 * @param table 선택지 → 클래스 후보
 * @param value 피그마 선택지
 * @param computed 계산값
 */
function choiceCheck(
  context: LayerContext,
  role: string,
  table: Readonly<Record<string, ClassChoice>>,
  value: string,
  computed: ComputedExpectation,
): void {
  const classes = table[value];
  if (classes === undefined) {
    throw new Error(`${role} ${value}의 클래스 규칙이 없다`);
  }
  add(context, { role, figma: value, classes: [classes], computed: [computed] });
}

/**
 * 확인 항목을 더한다.
 * @param context 레이어와 결과
 * @param check 레이어 경로를 뺀 항목
 */
function add(context: LayerContext, check: Omit<LayerCheck, 'layer'>): void {
  context.result.checks.push({ layer: context.path, ...check });
}

/**
 * 색 변수 경로를 클래스 이름 조각으로 바꾼다(`text-fill/primary` → `text-fill-primary`).
 * @param variable 색 변수 경로
 * @returns 이름공간을 뗀 이름
 */
function colorName(variable: string): string {
  return stripNamespace(variableName(variable.split('/')), '--color-');
}

/**
 * 선 칠의 색 이름을 꺼낸다. 단색 변수만 된다.
 * @param paint export.json의 paint
 * @param where 오류 메시지에 쓸 이름
 * @returns 색 이름
 */
function colorOf(paint: JsonRecord, where: string): string {
  if (typeof paint.variable !== 'string') {
    throw new Error(`${where}의 칠 스타일은 비교 규칙이 없다`);
  }
  return colorName(paint.variable);
}

/**
 * 스타일 이름을 CSS 이름 조각으로 바꾼다(`Surface/Flyout (Acrylic)` → `surface-flyout-acrylic`).
 * @param style 스타일 이름
 * @returns kebab-case 이름
 */
function styleSlug(style: string): string {
  return style.split('/').map(kebabSegment).join('-');
}

/**
 * CSS 변수 이름에서 이름공간을 뗀다.
 * @param name CSS 변수 이름
 * @param namespace 이름공간 접두어
 * @returns 남은 이름
 */
function stripNamespace(name: string, namespace: string): string {
  if (!name.startsWith(namespace)) {
    throw new Error(`${name}는 ${namespace} 이름공간이 아니다`);
  }
  return name.slice(namespace.length);
}

/**
 * 자간 값이 같은지 본다. 변수에 연결되어 있으면 변수 경로를, 아니면 값과 단위를 비교한다. 0은 단위와 상관없이 같다.
 * @codocs [[피그마 일치 검사:글자]]
 * @param used 유틸리티가 쓰는 값(`{"unit":"%","value":-0.5}` 같은 JSON 문자열이나 변수 경로)
 * @param figma 피그마 구간 값(`-0.5%`, `1px`)
 * @param figmaVariable 피그마 구간 자간에 연결된 변수 경로
 * @returns 같으면 true
 */
function sameLetterSpacing(
  used: string,
  figma: string | undefined,
  figmaVariable: string | undefined,
): boolean {
  if (!used.startsWith('{')) {
    return figmaVariable !== undefined && used === figmaVariable;
  }
  const parsed: unknown = JSON.parse(used);
  const figmaSpacing = figma === undefined ? null : parseLetterSpacing(figma);
  if (!isRecord(parsed) || typeof parsed.value !== 'number' || figmaSpacing === null) {
    return false;
  }
  if (parsed.value === 0 && figmaSpacing.value === 0) {
    return true;
  }
  return (
    parsed.unit === figmaSpacing.unit &&
    Math.abs(parsed.value - figmaSpacing.value) < LETTER_SPACING_TOLERANCE
  );
}

/**
 * 피그마 자간 문자열을 값과 단위로 나눈다.
 * @param value `-0.5%`, `1px`
 * @returns 값과 단위(읽을 수 없으면 null)
 */
function parseLetterSpacing(value: string): { value: number; unit: '%' | 'px' } | null {
  const match = /^(-?[\d.]+(?:e-?\d+)?)(%|px)$/u.exec(value);
  if (match?.[1] === undefined || match[2] === undefined) {
    return null;
  }
  return { value: Number.parseFloat(match[1]), unit: match[2] === 'px' ? 'px' : '%' };
}

/**
 * 피그마 자간을 CSS 값으로 바꾼다. 피그마 %는 글자 크기의 백분율이라 em으로 옮긴다.
 * @param value `-0.5%`, `1px`
 * @returns CSS 자간 값(읽을 수 없으면 undefined)
 */
function letterSpacingCss(value: string): string | undefined {
  const parsed = parseLetterSpacing(value);
  if (parsed === null) {
    return undefined;
  }
  const rounded = Number(parsed.value.toFixed(4));
  return parsed.unit === 'px'
    ? `${String(rounded)}px`
    : `${String(Number((rounded / 100).toFixed(6)))}em`;
}

/**
 * 레이어의 자동 배치 방향을 읽는다.
 * @param layer 레이어
 * @returns 방향, 자동 배치가 아니면 null
 */
function layoutMode(layer: JsonRecord): string | null {
  return isRecord(layer.layout) ? stringOf(layer.layout.mode) : null;
}

/**
 * 부모 레이어 경로를 구한다.
 * @param path 레이어 경로
 * @returns 부모 경로(루트의 자식은 빈 문자열)
 */
function parentPath(path: string): string {
  const index = path.lastIndexOf('/');
  return index < 0 ? '' : path.slice(0, index);
}

/**
 * 피그마 정렬 선택지를 align-self 값으로 바꾼다.
 * @param align MIN·CENTER·MAX·STRETCH
 * @returns CSS 값
 */
function alignSelfCss(align: string): string {
  return (
    { MIN: 'flex-start', CENTER: 'center', MAX: 'flex-end', STRETCH: 'stretch' }[align] ?? align
  );
}

/**
 * 주축 정렬을 justify-content 값으로 바꾼다.
 * @param align 피그마 값
 * @returns CSS 값
 */
function justifyCss(align: string): string {
  return (
    {
      MIN: 'flex-start',
      CENTER: 'center',
      MAX: 'flex-end',
      SPACE_BETWEEN: 'space-between',
      SPACE_EVENLY: 'space-evenly',
      SPACE_AROUND: 'space-around',
    }[align] ?? align
  );
}

/**
 * 교차축 정렬을 align-items 값으로 바꾼다.
 * @param align 피그마 값
 * @returns CSS 값
 */
function alignItemsCss(align: string): string {
  return (
    { MIN: 'flex-start', CENTER: 'center', MAX: 'flex-end', BASELINE: 'baseline' }[align] ?? align
  );
}

/**
 * 객체인지 확인한다.
 * @param value 값
 * @returns 배열이 아닌 객체면 true
 */
function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * 문자열이면 그대로, 아니면 빈 문자열을 돌려준다.
 * @param value 값
 * @returns 문자열
 */
function stringOf(value: unknown): string {
  return typeof value === 'string' ? value : '';
}
