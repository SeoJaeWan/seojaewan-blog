// @vitest-environment node
import { describe, expect, it } from 'vitest';

import {
  changedAssetDataEntries,
  changedTokensCss,
  changedTokensJson,
  componentDependents,
  type FileChange,
  PARITY_WORKFLOW_FILE,
  selectAffectedComponents,
} from './affected-components.ts';

const PREFIX = 'packages/design-system/';
const dependents = componentDependents(
  new Map([
    ['menu', ["import { MenuItem } from '../menu-item/menu-item';"]],
    ['menu-item', ["import { cn } from 'tailwind-merge';"]],
    ['flyout', ["import { Menu } from '../menu/menu';"]],
    ['button', []],
    ['search-box', []],
  ]),
);

const tokensJson = {
  color: {
    gray: { a: { $type: 'color', $value: '#eeeeee' }, b: { $type: 'color', $value: '#dddddd' } },
  },
  'text-fill': { primary: { $type: 'color', $value: '{color.gray.a}' } },
  'control-fill': { default: { $type: 'color', $value: '{color.gray.b}' } },
  spacing: { '8': { $type: 'dimension', $value: { unit: 'px', value: 8 } } },
  font: { size: { body: { $type: 'dimension', $value: { unit: 'px', value: 14 } } } },
  style: {
    paint: {
      Material: {
        'Acrylic Default': {
          $type: 'color',
          $value: '{control-fill.default}',
          $extensions: {
            'com.seojaewan': {
              layers: [
                { type: 'SOLID', color: '{control-fill.default}' },
                { type: 'IMAGE', asset: 'images/noise.png', opacity: 0.02 },
              ],
            },
          },
        },
      },
    },
    text: {
      Body: { $type: 'typography', $value: { fontSize: '{font.size.body}' } },
      Hangul: { Body: { $type: 'typography', $value: { fontSize: '{font.size.body}' } } },
    },
    effect: {},
  },
};

const exportsByComponent = new Map<string, unknown>([
  ['button', { variants: { rest: { layers: [{ fill: { variable: 'text-fill/primary' } }] } } }],
  ['menu-item', { variants: { rest: { layers: [{ asset: { file: 'icons/check.svg' } }] } } }],
  ['flyout', { variants: { rest: { layers: [{ fill: { style: 'Material/Acrylic Default' } }] } } }],
  ['search-box', { variants: { rest: { layers: [{ text: { textStyle: 'Hangul/Body' } }] } } }],
  ['menu', { variants: { rest: { layers: [{ layout: { gap: 'spacing/8' } }] } } }],
]);

/**
 * 고른 결과를 비교하기 쉬운 값으로 바꾼다.
 * @param files 바뀐 파일
 * @param changes 파일 → 기준 커밋과 지금 내용
 * @returns 전체 비교면 'all'(증명 테스트도 돌리면 'all+proof'), 아니면 정렬한 컴포넌트 목록
 */
function select(
  files: string[],
  changes: Record<string, FileChange> = {},
): 'all' | 'all+proof' | string[] {
  const selection = selectAffectedComponents({
    changedFiles: files,
    packagePrefix: PREFIX,
    dependents,
    exports: exportsByComponent,
    tokensJson,
    readChange: (file) => changes[file] ?? { before: undefined, after: undefined },
  });
  if (selection.all) {
    return selection.proof ? 'all+proof' : 'all';
  }
  return [...selection.components].sort();
}

/**
 * tokens.json의 한 토큰 값을 바꾼 글자를 만든다.
 * @param change 바꿀 함수
 * @returns 바꾼 tokens.json 글자
 */
function tokensWith(change: (json: typeof tokensJson) => void): string {
  const copy = structuredClone(tokensJson);
  change(copy);
  return JSON.stringify(copy);
}

const CSS = `@import './x.css';
@theme static {
  --color-gray-a: #eeeeee;
  --color-gray-b: #dddddd;
  --color-text-fill-primary: var(--color-gray-a);
  --color-control-fill-default: var(--color-gray-b);
  --spacing-8: 8px;
  --text-body: 14px;
}
@utility type-body {
  font-size: var(--text-body);
}
@utility material-acrylic-default {
  background-color: var(--color-control-fill-default);
}
@utility helper {
  outline: var(--spacing-8) solid;
}`;

// @codocs [[피그마 일치 검사:비교 범위]]
describe('비교 범위', () => {
  it('컴포넌트 파일이 바뀌면 그 컴포넌트와 그것을 쓰는 컴포넌트를 비교한다', () => {
    expect(select([`${PREFIX}src/components/menu-item/menu-item.tsx`])).toEqual([
      'flyout',
      'menu',
      'menu-item',
    ]);
  });

  it('테스트 파일만 바뀌면 비교하지 않는다', () => {
    expect(select([`${PREFIX}src/components/button/button.test.tsx`])).toEqual([]);
  });

  it('플러그인이 쓴 컴포넌트 폴더(export.json, 이미지)가 바뀐 컴포넌트와 그것을 담는 컴포넌트를 비교한다', () => {
    expect(select([`${PREFIX}figma/components/button/variant=accent,state=rest.png`])).toEqual([
      'button',
    ]);
    expect(select([`${PREFIX}figma/components/menu-item/export.json`])).toEqual([
      'flyout',
      'menu',
      'menu-item',
    ]);
  });

  it('자산이 바뀌면 export.json에서 그 자산을 쓰는 컴포넌트를 비교한다', () => {
    expect(select([`${PREFIX}figma/assets/icons/check.svg`])).toEqual([
      'flyout',
      'menu',
      'menu-item',
    ]);
    expect(select([`${PREFIX}figma/assets/icons/unused.svg`])).toEqual([]);
  });

  it('토큰의 이미지 층이 쓰는 자산이 바뀌면 그 토큰을 쓰는 컴포넌트를 비교한다', () => {
    expect(select([`${PREFIX}src/assets/images/noise.opacity-2.png`])).toEqual(['flyout']);
    expect(select([`${PREFIX}figma/assets/images/noise.png`])).toEqual(['flyout']);
  });

  it('asset-data.ts는 바뀐 자산 항목만 범위로 삼고, 항목 밖이 바뀌면 전체를 비교한다', () => {
    const file = `${PREFIX}src/assets/asset-data.ts`;
    const before =
      "export const svgAssets = {\n  'icons/check.svg': {\n    viewBox: '0 0 1 1',\n  },\n} as const;\n";
    expect(
      select([file], { [file]: { before, after: before.replace('0 0 1 1', '0 0 2 2') } }),
    ).toEqual(['flyout', 'menu', 'menu-item']);
    expect(select([file], { [file]: { before, after: `// 머리말\n${before}` } })).toBe('all');
  });

  it('tokens.json이 바뀌면 바뀐 토큰과 그것을 가리키는 별칭을 쓰는 컴포넌트를 비교한다', () => {
    const file = `${PREFIX}figma/tokens.json`;
    const after = tokensWith((json) => {
      json.color.gray.a.$value = '#000000';
    });
    expect(select([file], { [file]: { before: JSON.stringify(tokensJson), after } })).toEqual([
      'button',
    ]);
    const material = tokensWith((json) => {
      json.color.gray.b.$value = '#000000';
    });
    expect(
      select([file], { [file]: { before: JSON.stringify(tokensJson), after: material } }),
    ).toEqual(['flyout']);
  });

  it('글자 스타일이 가리키는 변수가 바뀌면 한글 스타일을 쓰는 컴포넌트도 비교한다', () => {
    const file = `${PREFIX}figma/tokens.json`;
    const after = tokensWith((json) => {
      json.font.size.body.$value.value = 16;
    });
    expect(select([file], { [file]: { before: JSON.stringify(tokensJson), after } })).toEqual([
      'search-box',
    ]);
  });

  it('tokens.json을 읽을 수 없으면 전체를 비교한다', () => {
    const file = `${PREFIX}figma/tokens.json`;
    expect(select([file], { [file]: { before: '{', after: JSON.stringify(tokensJson) } })).toBe(
      'all',
    );
  });

  it('tokens.css가 바뀌면 바뀐 변수와 유틸리티를 피그마 토큰으로 바꿔 그것을 쓰는 컴포넌트를 비교한다', () => {
    const file = `${PREFIX}src/tokens.css`;
    expect(
      select([file], { [file]: { before: CSS, after: CSS.replace('#eeeeee', '#000000') } }),
    ).toEqual(['button']);
    expect(
      select([file], {
        [file]: {
          before: CSS,
          after: CSS.replace('font-size: var', 'font-weight: 600; font-size: var'),
        },
      }),
    ).toEqual(['search-box']);
    expect(
      select([file], { [file]: { before: CSS, after: CSS.replace('solid;', 'dashed;') } }),
    ).toEqual(['flyout', 'menu']);
  });

  it('tokens.css에서 피그마 토큰으로 바꿀 수 없는 변경이 있으면 전체를 비교한다', () => {
    const file = `${PREFIX}src/tokens.css`;
    expect(
      select([file], {
        [file]: { before: CSS, after: `${CSS}\n@theme static { --my-own: 1px; }` },
      }),
    ).toBe('all');
    expect(
      select([file], { [file]: { before: CSS, after: CSS.replace("./x.css'", "./y.css'") } }),
    ).toBe('all');
    expect(select([file], { [file]: { before: undefined, after: CSS } })).toBe('all');
  });

  it('전역 스타일·설정이 바뀌면 전체를 비교한다', () => {
    expect(select([`${PREFIX}figma/figma.json`])).toBe('all');
    expect(select([`${PREFIX}src/theme.css`])).toBe('all');
    expect(select([`${PREFIX}src/fonts.css`])).toBe('all');
    expect(select([`${PREFIX}src/open-sans.css`])).toBe('all');
    expect(select([`${PREFIX}.storybook/preview.ts`])).toBe('all');
    expect(select([`${PREFIX}package.json`])).toBe('all');
    expect(select(['pnpm-lock.yaml'])).toBe('all');
  });

  it('컴포넌트 폴더 밖의 디자인 시스템 소스가 바뀌면 전체를 비교한다', () => {
    expect(select([`${PREFIX}src/merge-class-names.ts`])).toBe('all');
  });

  it('비교 도구나 일치 검사 워크플로가 바뀌면 전체와 증명 테스트를 돌린다', () => {
    expect(select([`${PREFIX}scripts/parity/parity-runner.ts`])).toBe('all+proof');
    expect(select([PARITY_WORKFLOW_FILE])).toBe('all+proof');
    expect(select([`${PREFIX}src/theme.css`, `${PREFIX}scripts/parity/parity.spec.ts`])).toBe(
      'all+proof',
    );
  });

  it('디자인 시스템과 상관없는 파일만 바뀌면 비교하지 않는다', () => {
    expect(
      select([
        'apps/web/src/app/page.tsx',
        '.codocs/development/figma-parity.yaml',
        '.github/workflows/ci.yml',
        `${PREFIX}vitest.config.ts`,
      ]),
    ).toEqual([]);
  });
});

// @codocs [[피그마 일치 검사:비교 범위]]
describe('바뀐 토큰 이름', () => {
  it('더해지거나 사라진 토큰도 바뀐 토큰이다', () => {
    const after = tokensWith((json) => {
      Reflect.deleteProperty(json.spacing, '8');
    });
    expect(changedTokensJson(JSON.stringify(tokensJson), after)).toEqual(['spacing/8']);
    expect(changedTokensJson(undefined, JSON.stringify({ spacing: tokensJson.spacing }))).toEqual([
      'spacing/8',
    ]);
  });

  it('다른 CSS 변수를 거쳐 바뀐 변수도 따라간다', () => {
    expect(changedTokensCss(CSS, CSS.replace('#dddddd', '#000000'), tokensJson)?.sort()).toEqual([
      'color/gray/b',
      'control-fill/default',
    ]);
  });

  it('asset-data.ts에서 더해지거나 사라진 항목도 바뀐 자산이다', () => {
    const one = "export const svgAssets = {\n  'icons/a.svg': {\n    x: 1,\n  },\n} as const;\n";
    const two = one.replace('} as const;', "  'icons/b.svg': {\n    x: 2,\n  },\n} as const;");
    expect(changedAssetDataEntries(one, two)).toEqual(['icons/b.svg']);
    expect(changedAssetDataEntries(undefined, one)).toEqual(['icons/a.svg']);
  });
});
