import type {
  ComponentLayout,
  LayerMeasure,
  MeasuredPaint,
  MeasuredStroke,
  Rgba255,
} from './component-layout';
import type {
  AssetLayer,
  AssetRef,
  Bindable,
  BoxLayer,
  ComponentSchema,
  Corners,
  InstanceLayer,
  LayerBase,
  Paints,
  Sides,
  Stroke,
  TextLayer,
  VariantSchema,
  VariantTransition,
} from './component-schema';

// 스키마(`<이름>.json`)와 검증 자료(`<이름>.layout.json`)의 꼴을 보여 주는 테스트 데이터다.
// 피그마 Button(변형·상태·아이콘 자리·글자)과 MessageBox(품은 Button 둘)를 본떴고, 값은 실제 피그마와 다를 수 있다.
// Button은 변형 15개 가운데 다섯만 담는다.

const addIcon: AssetRef = {
  group: 'Icons',
  name: 'ic_fluent_add_20_regular',
  file: 'icons/ic_fluent_add_20_regular',
};

const chevronIcon: AssetRef = {
  group: 'Icons',
  name: 'ic_fluent_chevron_down_20_regular',
  file: 'icons/ic_fluent_chevron_down_20_regular',
};

function color(name: string): { variable: { collection: string; name: string } } {
  return { variable: { collection: 'Color', name } };
}

function dimension(name: string): { variable: { collection: string; name: string } } {
  return { variable: { collection: 'Dimension', name } };
}

function px(value: number): { value: number } {
  return { value };
}

function sides<T>(value: T): Sides<T> {
  return { top: value, right: value, bottom: value, left: value };
}

function corners<T>(value: T): Corners<T> {
  return { topLeft: value, topRight: value, bottomRight: value, bottomLeft: value };
}

function solid(variable: string, opacity: number): Paints {
  return { paints: [{ type: 'SOLID', color: color(variable), opacity }] };
}

function base(
  key: string,
  name: string,
  nodeId: string,
  overrides: Partial<LayerBase> = {},
): LayerBase {
  return {
    key,
    name,
    nodeId,
    isVisible: true,
    propertyRefs: {},
    width: px(0),
    height: px(0),
    sizing: { horizontal: 'HUG', vertical: 'HUG' },
    minWidth: null,
    maxWidth: null,
    minHeight: null,
    maxHeight: null,
    aspectRatio: null,
    placement: {
      positioning: 'AUTO',
      constraints: { horizontal: 'MIN', vertical: 'MIN' },
      x: 0,
      y: 0,
    },
    rotation: 0,
    opacity: px(1),
    ...overrides,
  };
}

// Button ---------------------------------------------------------------------------------------

type ButtonLook = {
  name: string;
  nodeId: string;
  values: Record<string, string>;
  fill: Paints;
  stroke: Stroke | null;
  textColor: Paints;
  transitions: VariantTransition[];
};

function buttonVariant(look: ButtonLook): VariantSchema {
  const icon: AssetLayer = {
    ...base('icon', 'icon', `${look.nodeId};1`, {
      isVisible: false,
      propertyRefs: { visible: 'Has icon#13:0', mainComponent: 'Icon#13:1' },
      width: px(16),
      height: px(16),
      sizing: { horizontal: 'FIXED', vertical: 'FIXED' },
    }),
    kind: 'asset',
    figmaType: 'INSTANCE',
    asset: addIcon,
    color: color('Black/89'),
    scaleMode: null,
    sourceWidth: 16,
    sourceHeight: 16,
    scaleFactor: 1,
  };
  const label: TextLayer = {
    ...base('label', 'label', `${look.nodeId};2`, {
      propertyRefs: { characters: 'Label#13:2' },
      width: px(25),
      height: px(20),
      placement: {
        positioning: 'AUTO',
        constraints: { horizontal: 'MIN', vertical: 'MIN' },
        x: 47.5,
        y: 6,
      },
    }),
    fills: look.textColor,
    stroke: null,
    cornerRadius: corners(px(0)),
    effectStyle: null,
    kind: 'text',
    figmaType: 'TEXT',
    characters: '버튼',
    textStyle: 'Body',
    autoResize: 'WIDTH_AND_HEIGHT',
    truncation: 'DISABLED',
    maxLines: null,
    textAlignHorizontal: 'LEFT',
    textAlignVertical: 'TOP',
  };
  const root: BoxLayer = {
    ...base('', look.name, look.nodeId, {
      width: px(120),
      height: px(32),
      minWidth: px(120),
      placement: null,
    }),
    fills: look.fill,
    stroke: look.stroke,
    cornerRadius: corners(dimension('radius/control')),
    effectStyle: null,
    kind: 'box',
    figmaType: 'COMPONENT',
    layout: {
      mode: 'HORIZONTAL',
      wrap: 'NO_WRAP',
      primaryAxisAlign: 'CENTER',
      counterAxisAlign: 'CENTER',
      counterAxisAlignContent: 'AUTO',
      padding: {
        top: dimension('spacing/sm-nudge'),
        right: dimension('spacing/md'),
        bottom: dimension('spacing/sm-nudge'),
        left: dimension('spacing/md'),
      },
      itemSpacing: dimension('spacing/sm'),
      counterAxisSpacing: null,
      isReversingZIndex: false,
    },
    isClippingContent: false,
    overflowDirection: 'NONE',
    children: [icon, label],
  };
  return {
    name: look.name,
    nodeId: look.nodeId,
    values: look.values,
    root,
    transitions: look.transitions,
    motion: [],
  };
}

function innerStroke(paints: Paints): Stroke {
  return {
    paints,
    weight: sides(dimension('stroke-width/default')),
    align: 'INSIDE',
    isIncludedInLayout: false,
  };
}

export const buttonSchema = {
  formatVersion: 1,
  name: 'Button',
  nodeId: '13:62',
  page: 'Controls',
  description:
    '글자와 선택 아이콘이 있는 기본 버튼으로, 메시지 상자·찾을 수 없음 화면처럼 사용자가 동작을 고르는 곳에 쓴다.',
  behavior: 'button',
  properties: [
    {
      type: 'VARIANT',
      key: 'Variant',
      name: 'Variant',
      options: ['Accent', 'Standard', 'Subtle'],
      default: 'Standard',
    },
    {
      type: 'VARIANT',
      key: 'State',
      name: 'State',
      options: ['Rest', 'Hover', 'Pressed', 'Disabled', 'Focused'],
      default: 'Rest',
    },
    { type: 'BOOLEAN', key: 'Has icon#13:0', name: 'Has icon', isOnByDefault: false },
    {
      type: 'INSTANCE_SWAP',
      key: 'Icon#13:1',
      name: 'Icon',
      default: { kind: 'asset', asset: addIcon },
      preferredValues: [
        { kind: 'asset', asset: addIcon },
        { kind: 'asset', asset: chevronIcon },
      ],
    },
    { type: 'TEXT', key: 'Label#13:2', name: 'Label', default: '버튼' },
  ],
  variants: [
    buttonVariant({
      name: 'Variant=Standard, State=Rest',
      nodeId: '13:10',
      values: { Variant: 'Standard', State: 'Rest' },
      fill: solid('White/70', 0.7),
      stroke: innerStroke({ style: 'Elevation/Control Border' }),
      textColor: solid('Black/89', 0.89),
      transitions: [
        {
          destination: 'Variant=Standard, State=Hover',
          transition: {
            type: 'SMART_ANIMATE',
            duration: 0.083,
            easing: { type: 'CUSTOM_CUBIC_BEZIER', bezier: { x1: 0, y1: 0, x2: 0, y2: 1 } },
          },
        },
      ],
    }),
    buttonVariant({
      name: 'Variant=Standard, State=Hover',
      nodeId: '13:11',
      values: { Variant: 'Standard', State: 'Hover' },
      fill: solid('White/50', 0.5),
      stroke: innerStroke({ style: 'Elevation/Control Border' }),
      textColor: solid('Black/89', 0.89),
      transitions: [],
    }),
    buttonVariant({
      name: 'Variant=Standard, State=Focused',
      nodeId: '13:12',
      values: { Variant: 'Standard', State: 'Focused' },
      fill: solid('White/70', 0.7),
      stroke: {
        paints: solid('Black/89', 0.89),
        weight: sides(dimension('stroke-width/focus-outer')),
        align: 'OUTSIDE',
        isIncludedInLayout: false,
      },
      textColor: solid('Black/89', 0.89),
      transitions: [],
    }),
    buttonVariant({
      name: 'Variant=Standard, State=Disabled',
      nodeId: '13:13',
      values: { Variant: 'Standard', State: 'Disabled' },
      fill: solid('White/30', 0.3),
      stroke: innerStroke(solid('Black/6', 0.06)),
      textColor: solid('Black/36', 0.36),
      transitions: [],
    }),
    buttonVariant({
      name: 'Variant=Accent, State=Rest',
      nodeId: '13:20',
      values: { Variant: 'Accent', State: 'Rest' },
      fill: solid('Blue/60', 1),
      stroke: innerStroke({ style: 'Elevation/Accent Control Border' }),
      textColor: solid('White/100', 1),
      transitions: [],
    }),
  ],
} satisfies ComponentSchema;

function rgb(r: number, g: number, b: number): Rgba255 {
  return { r, g, b, a: 255 };
}

function solidMeasure(rgba: Rgba255, opacity: number): MeasuredPaint {
  return { type: 'SOLID', color: rgba, opacity };
}

function measure(
  box: { x: number; y: number; width: number; height: number },
  overrides: Partial<LayerMeasure> = {},
): LayerMeasure {
  return {
    ...box,
    opacity: 1,
    fills: [],
    stroke: null,
    cornerRadius: null,
    shadows: [],
    text: null,
    asset: null,
    ...overrides,
  };
}

const BODY_TEXT = {
  fontSize: 14,
  lineHeight: { unit: 'PIXELS', value: 20 },
  fontWeight: 400,
  autoResize: 'WIDTH_AND_HEIGHT',
} as const;

const controlBorder: MeasuredPaint = {
  type: 'GRADIENT_LINEAR',
  stops: [
    { position: 0.9058, color: { r: 0, g: 0, b: 0, a: 15 } },
    { position: 1, color: { r: 0, g: 0, b: 0, a: 41 } },
  ],
  opacity: 1,
};

type ButtonMeasureLook = {
  fill: MeasuredPaint;
  stroke: MeasuredStroke | null;
  text: MeasuredPaint;
};

function buttonLayers(
  origin: { x: number; y: number; width: number },
  look: ButtonMeasureLook,
  prefix = '',
): Record<string, LayerMeasure> {
  return {
    [prefix]: measure(
      { x: origin.x, y: origin.y, width: origin.width, height: 32 },
      { fills: [look.fill], stroke: look.stroke, cornerRadius: corners(4) },
    ),
    [prefix === '' ? 'label' : `${prefix}/label`]: measure(
      { x: origin.x + (origin.width - 25) / 2, y: origin.y + 6, width: 25, height: 20 },
      { fills: [look.text], text: BODY_TEXT },
    ),
  };
}

const standardLook: ButtonMeasureLook = {
  fill: solidMeasure(rgb(255, 255, 255), 0.7),
  stroke: { paints: [controlBorder], weight: sides(1), align: 'INSIDE' },
  text: solidMeasure(rgb(0, 0, 0), 0.89),
};

const accentLook: ButtonMeasureLook = {
  fill: solidMeasure(rgb(0, 95, 184), 1),
  stroke: { paints: [controlBorder], weight: sides(1), align: 'INSIDE' },
  text: solidMeasure(rgb(255, 255, 255), 1),
};

const buttonBox = { x: 0, y: 0, width: 120 };

export const buttonLayout = {
  formatVersion: 1,
  name: 'Button',
  variants: [
    {
      name: 'Variant=Standard, State=Rest',
      width: 120,
      height: 32,
      layers: buttonLayers(buttonBox, standardLook),
      motion: [],
    },
    {
      name: 'Variant=Standard, State=Hover',
      width: 120,
      height: 32,
      layers: buttonLayers(buttonBox, {
        ...standardLook,
        fill: solidMeasure(rgb(255, 255, 255), 0.5),
      }),
      motion: [],
    },
    {
      name: 'Variant=Standard, State=Focused',
      width: 120,
      height: 32,
      layers: buttonLayers(buttonBox, {
        ...standardLook,
        stroke: { paints: [solidMeasure(rgb(0, 0, 0), 0.89)], weight: sides(2), align: 'OUTSIDE' },
      }),
      motion: [],
    },
    {
      name: 'Variant=Standard, State=Disabled',
      width: 120,
      height: 32,
      layers: buttonLayers(buttonBox, {
        fill: solidMeasure(rgb(255, 255, 255), 0.3),
        stroke: { paints: [solidMeasure(rgb(0, 0, 0), 0.06)], weight: sides(1), align: 'INSIDE' },
        text: solidMeasure(rgb(0, 0, 0), 0.36),
      }),
      motion: [],
    },
    {
      name: 'Variant=Accent, State=Rest',
      width: 120,
      height: 32,
      layers: buttonLayers(buttonBox, accentLook),
      motion: [],
    },
  ],
} satisfies ComponentLayout;

// MessageBox -----------------------------------------------------------------------------------

function buttonInstance(
  name: string,
  nodeId: string,
  properties: { variant: string; label: string },
  box: { x: number; width: number },
): InstanceLayer {
  return {
    ...base(`footer/${name}`, name, nodeId, {
      width: px(box.width),
      height: px(32),
      sizing: { horizontal: 'FILL', vertical: 'HUG' },
      placement: {
        positioning: 'AUTO',
        constraints: { horizontal: 'MIN', vertical: 'MIN' },
        x: box.x,
        y: 25,
      },
    }),
    kind: 'instance',
    figmaType: 'INSTANCE',
    component: 'Button',
    properties: {
      Variant: properties.variant,
      State: 'Rest',
      'Has icon': false,
      Icon: { kind: 'asset', asset: addIcon },
      Label: properties.label,
    },
    isExposed: false,
    scaleFactor: 1,
    overrides: [],
    slots: [],
  };
}

function messageText(
  key: 'title' | 'message',
  nodeId: string,
  text: { characters: string; style: string; height: number; y: number; property: string },
): TextLayer {
  return {
    ...base(`content/${key}`, key, nodeId, {
      propertyRefs: { characters: text.property },
      width: px(400),
      height: px(text.height),
      sizing: { horizontal: 'FILL', vertical: 'HUG' },
      placement: {
        positioning: 'AUTO',
        constraints: { horizontal: 'MIN', vertical: 'MIN' },
        x: 24,
        y: text.y,
      },
    }),
    fills: solid('Black/89', 0.89),
    stroke: null,
    cornerRadius: corners(px(0)),
    effectStyle: null,
    kind: 'text',
    figmaType: 'TEXT',
    characters: text.characters,
    textStyle: text.style,
    autoResize: 'HEIGHT',
    truncation: 'DISABLED',
    maxLines: null,
    textAlignHorizontal: 'LEFT',
    textAlignVertical: 'TOP',
  };
}

function messageBoxVariant(buttons: 'One' | 'Two', nodeId: string): VariantSchema {
  const content: BoxLayer = {
    ...base('content', 'content', `${nodeId};1`, {
      width: px(448),
      height: px(108),
      sizing: { horizontal: 'FILL', vertical: 'HUG' },
    }),
    fills: solid('White/100', 1),
    stroke: null,
    cornerRadius: corners(px(0)),
    effectStyle: null,
    kind: 'box',
    figmaType: 'FRAME',
    layout: {
      mode: 'VERTICAL',
      wrap: 'NO_WRAP',
      primaryAxisAlign: 'MIN',
      counterAxisAlign: 'MIN',
      counterAxisAlignContent: 'AUTO',
      padding: sides(dimension('spacing/2xl')),
      itemSpacing: dimension('spacing/md'),
      counterAxisSpacing: null,
      isReversingZIndex: false,
    },
    isClippingContent: false,
    overflowDirection: 'NONE',
    children: [
      messageText('title', `${nodeId};2`, {
        characters: '제목',
        style: 'Subtitle',
        height: 28,
        y: 24,
        property: 'Title#16:0',
      }),
      messageText('message', `${nodeId};3`, {
        characters: '메시지 내용',
        style: 'Body',
        height: 20,
        y: 64,
        property: 'Message#16:1',
      }),
    ],
  };
  const footerTopStroke: Sides<Bindable<number>> = {
    top: dimension('stroke-width/default'),
    right: px(0),
    bottom: px(0),
    left: px(0),
  };
  const footer: BoxLayer = {
    ...base('footer', 'footer', `${nodeId};4`, {
      width: px(448),
      height: px(81),
      sizing: { horizontal: 'FILL', vertical: 'HUG' },
      placement: {
        positioning: 'AUTO',
        constraints: { horizontal: 'MIN', vertical: 'MIN' },
        x: 0,
        y: 108,
      },
    }),
    fills: solid('Gray/4', 1),
    stroke: {
      paints: solid('Black/6', 0.06),
      weight: footerTopStroke,
      align: 'INSIDE',
      isIncludedInLayout: true,
    },
    cornerRadius: corners(px(0)),
    effectStyle: null,
    kind: 'box',
    figmaType: 'FRAME',
    layout: {
      mode: 'HORIZONTAL',
      wrap: 'NO_WRAP',
      primaryAxisAlign: 'MIN',
      counterAxisAlign: 'MIN',
      counterAxisAlignContent: 'AUTO',
      padding: sides(dimension('spacing/2xl')),
      itemSpacing: dimension('spacing/sm'),
      counterAxisSpacing: null,
      isReversingZIndex: false,
    },
    isClippingContent: false,
    overflowDirection: 'NONE',
    children: [
      buttonInstance(
        'primary button',
        `${nodeId};5`,
        { variant: 'Accent', label: '확인' },
        { x: 24, width: buttons === 'One' ? 400 : 196 },
      ),
      ...(buttons === 'Two'
        ? [
            buttonInstance(
              'secondary button',
              `${nodeId};6`,
              { variant: 'Standard', label: '취소' },
              { x: 228, width: 196 },
            ),
          ]
        : []),
    ],
  };
  const root: BoxLayer = {
    ...base('', `Buttons=${buttons}`, nodeId, {
      width: px(448),
      height: px(189),
      sizing: { horizontal: 'FIXED', vertical: 'HUG' },
      placement: null,
    }),
    fills: solid('Gray/4', 1),
    stroke: {
      paints: solid('Gray/51', 0.4),
      weight: sides(dimension('stroke-width/default')),
      align: 'INSIDE',
      isIncludedInLayout: false,
    },
    cornerRadius: corners(dimension('radius/overlay')),
    effectStyle: 'Elevation/Dialog',
    kind: 'box',
    figmaType: 'COMPONENT',
    layout: {
      mode: 'VERTICAL',
      wrap: 'NO_WRAP',
      primaryAxisAlign: 'MIN',
      counterAxisAlign: 'MIN',
      counterAxisAlignContent: 'AUTO',
      padding: sides(px(0)),
      itemSpacing: px(0),
      counterAxisSpacing: null,
      isReversingZIndex: false,
    },
    isClippingContent: true,
    overflowDirection: 'NONE',
    children: [content, footer],
  };
  return {
    name: `Buttons=${buttons}`,
    nodeId,
    values: { Buttons: buttons },
    root,
    transitions: [],
    motion: [],
  };
}

export const messageBoxSchema = {
  formatVersion: 1,
  name: 'MessageBox',
  nodeId: '16:226',
  page: 'Controls',
  description:
    '확인이나 알림을 묻는 대화 상자로, 휴지통 비우기처럼 사용자의 확인이 필요한 곳에 쓴다.',
  behavior: 'dialog',
  properties: [
    { type: 'VARIANT', key: 'Buttons', name: 'Buttons', options: ['One', 'Two'], default: 'One' },
    { type: 'TEXT', key: 'Title#16:0', name: 'Title', default: '제목' },
    { type: 'TEXT', key: 'Message#16:1', name: 'Message', default: '메시지 내용' },
  ],
  variants: [messageBoxVariant('One', '16:211'), messageBoxVariant('Two', '16:212')],
} satisfies ComponentSchema;

const dialogShadows: LayerMeasure['shadows'] = [
  {
    type: 'DROP_SHADOW',
    color: { r: 0, g: 0, b: 0, a: 48 },
    offsetX: 0,
    offsetY: 32,
    radius: 64,
    spread: 0,
  },
  {
    type: 'DROP_SHADOW',
    color: { r: 0, g: 0, b: 0, a: 38 },
    offsetX: 0,
    offsetY: 2,
    radius: 21,
    spread: 0,
  },
];

function messageBoxLayers(buttons: 'One' | 'Two'): Record<string, LayerMeasure> {
  const buttonWidth = buttons === 'One' ? 400 : 196;
  const text = solidMeasure(rgb(0, 0, 0), 0.89);
  return {
    '': measure(
      { x: 0, y: 0, width: 448, height: 189 },
      {
        fills: [solidMeasure(rgb(243, 243, 243), 1)],
        stroke: {
          paints: [solidMeasure(rgb(117, 117, 117), 0.4)],
          weight: sides(1),
          align: 'INSIDE',
        },
        cornerRadius: corners(8),
        shadows: dialogShadows,
      },
    ),
    content: measure(
      { x: 0, y: 0, width: 448, height: 108 },
      { fills: [solidMeasure(rgb(255, 255, 255), 1)], cornerRadius: corners(0) },
    ),
    'content/title': measure(
      { x: 24, y: 24, width: 400, height: 28 },
      {
        fills: [text],
        text: {
          fontSize: 20,
          lineHeight: { unit: 'PIXELS', value: 28 },
          fontWeight: 600,
          autoResize: 'HEIGHT',
        },
      },
    ),
    'content/message': measure(
      { x: 24, y: 64, width: 400, height: 20 },
      { fills: [text], text: { ...BODY_TEXT, autoResize: 'HEIGHT' } },
    ),
    footer: measure(
      { x: 0, y: 108, width: 448, height: 81 },
      {
        fills: [solidMeasure(rgb(243, 243, 243), 1)],
        stroke: {
          paints: [solidMeasure(rgb(0, 0, 0), 0.06)],
          weight: { top: 1, right: 0, bottom: 0, left: 0 },
          align: 'INSIDE',
        },
        cornerRadius: corners(0),
      },
    ),
    ...buttonLayers({ x: 24, y: 133, width: buttonWidth }, accentLook, 'footer/primary button'),
    ...(buttons === 'Two'
      ? buttonLayers({ x: 228, y: 133, width: 196 }, standardLook, 'footer/secondary button')
      : {}),
  };
}

export const messageBoxLayout = {
  formatVersion: 1,
  name: 'MessageBox',
  variants: [
    { name: 'Buttons=One', width: 448, height: 189, layers: messageBoxLayers('One'), motion: [] },
    { name: 'Buttons=Two', width: 448, height: 189, layers: messageBoxLayers('Two'), motion: [] },
  ],
} satisfies ComponentLayout;
