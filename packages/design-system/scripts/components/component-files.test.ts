import * as prettier from 'prettier';
import { describe, expect, it } from 'vitest';

import type { ComponentSchema } from '../../src/figma-export/component-schema.ts';
import { buttonSchema, messageBoxSchema } from '../../src/figma-export/figma-export.fixture.ts';
import { fakeBehaviors } from './behavior-specs.fixture.ts';
import { spinnerSchema } from './component-files.fixture.ts';
import { componentFiles, type GenerationOptions, tokenCatalog } from './component-files.ts';

const defaultOptions: GenerationOptions = {
  behaviors: fakeBehaviors('../../behaviors-fake'),
  tokens: { effectKind: () => 'shadow' },
  paths: { source: '../..' },
};

function generate(
  schemas: readonly ComponentSchema[] = [buttonSchema, messageBoxSchema, spinnerSchema],
): Map<string, string> {
  return new Map(
    componentFiles(schemas, defaultOptions).map((file) => [
      `${file.folder}/${file.name}`,
      file.text,
    ]),
  );
}

function file(name: string, schemas?: readonly ComponentSchema[]): string {
  const text = generate(schemas).get(name);
  if (text === undefined) {
    throw new Error(`${name}가 만들어지지 않았다.`);
  }
  return text;
}

/** 저장소에 쓰는 모양(Prettier)으로 맞춘 생성 파일. TS·TSX만 맞춘다 */
async function formatted(name: string, schemas?: readonly ComponentSchema[]): Promise<string> {
  const filepath = `${import.meta.dirname}/../../src/components/${name}`;
  const config = (await prettier.resolveConfig(filepath)) ?? {};
  return prettier.format(file(name, schemas), { ...config, filepath });
}

function withState(schema: ComponentSchema, state: string): ComponentSchema {
  return {
    ...schema,
    variants: schema.variants.map((variant, index) =>
      index === 1 ? { ...variant, values: { ...variant.values, State: state } } : variant,
    ),
  };
}

// @codocs [[디자인 시스템:세 겹]]
// @codocs [[디자인 시스템:동작의 종류]]
describe('세 겹과 동작의 종류', () => {
  it('컴포넌트마다 스킨, 합친 컴포넌트, 스킨 CSS, 스토리, 짝 표를 생성 파일로 낸다', () => {
    expect([...generate([buttonSchema]).keys()]).toEqual([
      'button/button.gen.css',
      'button/button.skin.gen.tsx',
      'button/button.gen.tsx',
      'button/button.gen.stories.tsx',
      'button/button.layers.gen.ts',
    ]);
  });

  it('스킨은 동작을 import하지 않고, 합친 컴포넌트가 등록부의 훅을 불러 역할의 태그와 속성을 스킨에 넘긴다', () => {
    const skin = file('button/button.skin.gen.tsx', [buttonSchema]);
    const combined = file('button/button.gen.tsx', [buttonSchema]);
    expect(skin).not.toContain('behaviors');
    expect(combined).toContain(
      "import { useButtonBehavior } from '../../behaviors-fake/use-button-behavior';",
    );
    expect(combined).toContain("root: { tag: 'button', props: roles.root }");
    expect(combined).toContain('label: { props: roles.label }');
  });

  it('종류가 없는 컴포넌트는 스킨을 그대로 그리고 루트는 div다', () => {
    const combined = file('spinner/spinner.gen.tsx', [spinnerSchema]);
    expect(combined).not.toContain('Behavior');
    expect(combined).toContain('return <SpinnerSkin {...skinProps} />;');
    expect(file('spinner/spinner.skin.gen.tsx', [spinnerSchema])).toContain(
      '<div className={cn(LAYERS.root, className)}>',
    );
  });

  it('등록부에 없는 종류를 적은 컴포넌트는 생성하지 않는다', () => {
    expect(() => generate([{ ...buttonSchema, behavior: 'unknown-kind' }])).toThrow(
      '`unknown-kind`가 등록부에 없다',
    );
  });
});

// @codocs [[디자인 시스템:컴포넌트 입력]]
// @codocs [[디자인 시스템:아이콘 자리]]
describe('컴포넌트 입력', () => {
  it('구조가 다른 변형은 변형 입력, 글자는 글자 입력이고 State 축은 입력으로 내지 않는다', () => {
    const skin = file('button/button.skin.gen.tsx', [buttonSchema]);
    expect(skin).toContain("export type ButtonVariant = 'accent' | 'standard' | 'subtle';");
    expect(skin).toContain('variant?: ButtonVariant;');
    expect(skin).toContain('label: string;');
    expect(skin).not.toContain('state');
  });

  it('켜고 끄는 속성에 묶인 아이콘 자리는 입력 하나로 합치고, 주면 보이고 주지 않으면 보이지 않는다', async () => {
    const skin = await formatted('button/button.skin.gen.tsx', [buttonSchema]);
    expect(skin).toContain('icon?: SvgAssetName;');
    expect(skin).not.toContain('hasIcon');
    expect(skin).toContain('{icon !== undefined && <Asset name={icon} className={LAYERS.icon} />}');
  });

  it('안에 고정으로 놓인 버튼은 on + 레이어 이름 입력으로 열고, 품은 컴포넌트는 합친 컴포넌트를 쓴다', async () => {
    const skin = await formatted('message-box/message-box.skin.gen.tsx');
    expect(skin).toContain("import { Button } from '../button/button.gen';");
    expect(skin).toContain("onPrimary?: ComponentProps<typeof Button>['onClick'];");
    expect(skin).toContain('onClick={handlePrimary}');
    expect(skin).toContain('label="확인"');
  });

  it('동작의 종류가 켜는 상태는 코드 이름의 입력이 되고 합친 컴포넌트가 훅에 넘긴다', () => {
    expect(file('button/button.gen.tsx', [buttonSchema])).toContain(
      'useButtonBehavior({ isDisabled, onClick: handleClick })',
    );
  });
});

// @codocs [[디자인 시스템:상태]]
describe('상태', () => {
  it('기본 상태는 모습 전부를, 다른 상태는 기본 상태와의 차이만 낸다', () => {
    const css = file('button/button.gen.css', [buttonSchema]);
    expect(css).toContain(
      ':where(.button__root) { display: flex; flex-direction: row; flex-wrap: nowrap; justify-content: center; align-items: center;',
    );
    expect(css).toContain(
      ':where(.button__root.button--variant-standard:hover) { @apply bg-color-white-50; }',
    );
  });

  it('올림은 @media (hover: hover) 안에 낸다', () => {
    expect(file('button/button.gen.css', [buttonSchema])).toMatch(
      /@media \(hover: hover\) \{\n:where\(\.button__root\.button--variant-standard:hover\)/u,
    );
  });

  it('낱말 표에 먼저 적은 낱말이 겹칠 때 이기도록 뒤에 낸다', () => {
    const css = file('button/button.gen.css', [buttonSchema]);
    const hover = css.indexOf(':hover)');
    const focused = css.indexOf(':focus-visible)');
    const disabled = css.indexOf(':disabled)');
    expect(hover).toBeLessThan(focused);
    expect(focused).toBeLessThan(disabled);
  });

  it('낱말 표에 없는 상태 낱말은 생성하지 않는다', () => {
    expect(() => generate([withState(buttonSchema, 'Weird')])).toThrow(
      '상태 낱말 `Weird`가 `button` 종류의 낱말 표에 없다',
    );
  });

  it('도착 상태와 기본 상태에 전환을 걸고, 전환이 없는 상태로는 즉시 바뀌며, 동작 줄이기에서는 걸지 않는다', () => {
    const css = file('button/button.gen.css', [buttonSchema]);
    const transition =
      'transition-property: background-color; transition-duration: 83ms; transition-timing-function: cubic-bezier(0, 0, 0, 1);';
    expect(css).toContain(
      `@media (prefers-reduced-motion: no-preference) { :where(.button__root) { ${transition} } }`,
    );
    expect(css).toContain(
      `@media (prefers-reduced-motion: no-preference) { :where(.button__root.button--variant-standard:hover) { ${transition} } }`,
    );
    expect(css).toContain(
      '@media (prefers-reduced-motion: no-preference) { :where(.button__root.button--variant-standard:focus-visible) { transition-property: none; } }',
    );
  });
});

// @codocs [[디자인 시스템:기기 변형]]
describe('기기 변형', () => {
  it('Device 축은 입력으로 내지 않고, Mobile은 차이만 모바일 조건 안에 낸다', () => {
    const css = file('spinner/spinner.gen.css', [spinnerSchema]);
    expect(file('spinner/spinner.skin.gen.tsx', [spinnerSchema])).not.toContain('device');
    expect(css).toContain('@variant mobile {\n:where(.spinner__root) { @apply p-spacing-md; }\n}');
  });
});

// @codocs [[디자인 시스템:크기 변수]]
// @codocs [[디자인 시스템:토큰 사용 강제]]
describe('크기와 토큰', () => {
  it('색·간격·모서리·선·글자는 토큰 클래스로, 크기는 숫자로 낸다', () => {
    const css = file('button/button.gen.css', [buttonSchema]);
    expect(css).toContain('@apply px-spacing-md py-spacing-sm-nudge;');
    expect(css).toContain('@apply rounded-radius-control;');
    expect(css).toContain(
      '@apply inner-border-w-stroke-width-default border-gradient-elevation-control-border;',
    );
    expect(css).toContain('@apply type-body;');
    expect(css).toContain('min-width: 120px;');
  });

  it('내용에 맞추는 루트는 내용 폭이고, 쓰는 곳의 클래스가 이기도록 components 층의 :where()에 둔다', () => {
    const css = file('button/button.gen.css', [buttonSchema]);
    expect(css).toContain('@layer theme, base, components, utilities;');
    expect(css).toContain("@reference '../../tokens.css';");
    expect(css).toContain('width: fit-content;');
  });

  it('토큰에 묶이지 않은 간격은 생성하지 않는다', () => {
    const schema = JSON.parse(
      JSON.stringify(buttonSchema).replaceAll(
        '"itemSpacing":{"variable":{"collection":"Dimension","name":"spacing/sm"}}',
        '"itemSpacing":{"value":7}',
      ),
    ) as ComponentSchema;
    expect(() => generate([schema])).toThrow('간격 7이 토큰에 묶여 있지 않다');
  });

  it('효과 스타일은 tokens.css를 보고 그림자, 배경 흐림, 재질 표면을 가른다', () => {
    const tokens = tokenCatalog(
      [
        '  --elevation-dialog: 0px 2px 21px 0px #00000026;',
        '  --blur-acrylic: 30px;',
        '@utility surface-flyout-acrylic {',
      ].join('\n'),
    );
    expect(tokens.effectKind('elevation-dialog')).toBe('shadow');
    expect(tokens.effectKind('blur-acrylic')).toBe('backdrop-blur');
    expect(tokens.effectKind('surface-flyout-acrylic')).toBe('surface');
  });
});

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
describe('컴포넌트 조립 규칙', () => {
  it('품은 컴포넌트를 놓는 방식(채움)은 바깥 컴포넌트가 정하고, 안쪽 기본 모습을 이기도록 클래스 하나로 낸다', () => {
    expect(file('message-box/message-box.gen.css')).toContain(
      '.message-box__footer__primary-button { display: flex; flex: 1 1 0px; }',
    );
  });

  it('구조가 다른 변형에만 있는 레이어는 그 변형 입력일 때만 그린다', () => {
    expect(file('message-box/message-box.skin.gen.tsx')).toMatch(
      /\{\(buttons === 'two'\) && \(\n\s+<Button/u,
    );
  });
});

// @codocs [[디자인 시스템:모션 클래스]]
// @codocs [[디자인 시스템:모션]]
// @codocs [[디자인 시스템:회전 구현]]
describe('움직임', () => {
  it('속성마다 <컴포넌트>-<Motion 값>-<속성> 이름의 @keyframes를 만들고 [data-motion]일 때 건다', () => {
    const css = file('spinner/spinner.gen.css', [spinnerSchema]);
    expect(css).toContain('@keyframes spinner-spin-rotate {');
    expect(css).toContain(
      ":where(.spinner__root[data-motion='spin']) { animation: spinner-spin-rotate 1000ms linear infinite both; }",
    );
  });

  it('회전 키프레임은 부호를 뒤집고, 이동은 CSS 변수에 피그마 숫자를 기본값으로 둔다', () => {
    const css = file('spinner/spinner.gen.css', [spinnerSchema]);
    expect(css).toContain('100% { rotate: 360deg; }');
    expect(css).toContain('translate: var(--spinner-spin-motion-dot-translate-100, 0px 4px);');
  });

  it('키프레임 이징은 앞 키프레임에 옮기고, motion 레이어는 코드에 만들지 않는다', () => {
    const css = file('spinner/spinner.gen.css', [spinnerSchema]);
    expect(css).toContain(
      '0% { opacity: 0.2; animation-timing-function: cubic-bezier(0, 0, 0.58, 1); }',
    );
    expect(file('spinner/spinner.skin.gen.tsx', [spinnerSchema])).not.toContain(
      "'spinner__motion'",
    );
  });
});

// @codocs [[디자인 시스템:생성 결과 검증]]
describe('생성 결과 검증', () => {
  it('짝 표는 레이어 키마다 선택자를 내고, 품은 인스턴스 안쪽은 인스턴스 선택자 뒤에 잇는다', async () => {
    const layers = await formatted('message-box/message-box.layers.gen.ts');
    expect(layers).toContain("[ROOT_LAYER_KEY]: '.message-box__root',");
    expect(layers).toContain(
      "'footer/primary button/label': '.message-box__footer__primary-button .button__label',",
    );
  });

  it('코드 이름이 없는 의사 클래스 상태는 테스트가 켜고, motion 레이어는 루트와 짝짓는다', async () => {
    const button = await formatted('button/button.layers.gen.ts', [buttonSchema]);
    expect(button).toMatch(
      /StandardHover: \{[^}]*forcedStates: \[\s*\{\s*selector: '\.button__root',\s*pseudoClasses: \['hover'\],?\s*\},?\s*\]/u,
    );
    const spinner = await formatted('spinner/spinner.layers.gen.ts', [spinnerSchema]);
    expect(spinner).toContain("motion: '.spinner__root',");
    expect(spinner).toMatch(/ignored: \[\s*\{\s*key: '',\s*field: 'look',?\s*\},?\s*\]/u);
  });
});

// @codocs [[디자인 시스템:스토리 규칙]]
describe('스토리 규칙', () => {
  it('변형 하나에 스토리 하나를 만들고 입력은 그 변형의 피그마 값이며 play는 넣지 않는다', async () => {
    const stories = await formatted('button/button.gen.stories.tsx', [buttonSchema]);
    expect(stories.match(/^export const \w+: Story/gmu)).toHaveLength(buttonSchema.variants.length);
    expect(stories).toContain("args: { variant: 'standard', label: '버튼', isDisabled: true }");
    expect(stories).not.toContain('play');
  });

  it('Device=Mobile 변형의 스토리는 모바일 뷰포트로 그린다', () => {
    expect(file('spinner/spinner.gen.stories.tsx', [spinnerSchema])).toContain(
      "globals: { viewport: { value: 'mobile1', isRotated: false } },",
    );
  });
});
