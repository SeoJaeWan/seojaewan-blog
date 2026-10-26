import { describe, expect, it } from 'vitest';

import { selectAffected } from './affected.ts';
import { designSystemExports, usedComponents } from './design-system-exports.ts';

const INDEX = '/ds/src/index.ts';
const files: Record<string, string> = {
  [INDEX]: `// 공개 진입점이다.
export * from './components/button/button';
export * from './components/menu-item/menu-item';
export * from './components/flyout/flyout';
export * from './components/loop/loop';
export { Legacy, type LegacyProps as Props } from './components/legacy/legacy';
// export * from './components/commented/commented';
`,
  '/ds/src/components/button/button.tsx': `export type ButtonProps = { label: string };
export function Button(props: ButtonProps) { return <button>{props.label}</button>; }
export const BUTTON_STYLES = ['accent'];
`,
  '/ds/src/components/menu-item/menu-item.tsx': `type Internal = { id: string };
interface Hidden { id: string }
export interface MenuItemProps { id: string }
export enum MenuItemKind { Plain }
function MenuItemImpl(props: Internal) { return <li>{props.id}</li>; }
export { MenuItemImpl as MenuItem, type Hidden as MenuItemHidden };
export type { Internal as MenuItemInternal };
`,
  '/ds/src/components/flyout/flyout.tsx': `export class Flyout {}
export * from './flyout-parts';
`,
  '/ds/src/components/flyout/flyout-parts.ts': `export const FlyoutPart = 1;
export * from './flyout';
`,
  '/ds/src/components/loop/loop.ts': `export * from './loop';
export const Loop = 1;
`,
};

/**
 * 테스트용 파일 읽기.
 * @param file 파일 경로
 * @returns 내용
 */
function read(file: string): string | undefined {
  return files[file];
}

// @codocs [[피그마 연동:캡처 범위]]
describe('디자인 시스템 공개 이름 표', () => {
  const exported = designSystemExports(INDEX, read);

  it('export *로 다시 내보낸 파일의 선언 이름을 컴포넌트 폴더에 연결한다', () => {
    expect(exported.get('Button')).toBe('button');
    expect(exported.get('ButtonProps')).toBe('button');
    expect(exported.get('BUTTON_STYLES')).toBe('button');
    expect(exported.get('MenuItemProps')).toBe('menu-item');
    expect(exported.get('MenuItemKind')).toBe('menu-item');
  });

  it('별칭은 바깥 이름으로, type export도 모은다', () => {
    expect(exported.get('MenuItem')).toBe('menu-item');
    expect(exported.get('MenuItemHidden')).toBe('menu-item');
    expect(exported.get('MenuItemInternal')).toBe('menu-item');
    expect(exported.has('MenuItemImpl')).toBe(false);
    expect(exported.has('Internal')).toBe(false);
  });

  it('컴포넌트 파일의 export *를 따라가고 순환해도 멈춘다', () => {
    expect(exported.get('Flyout')).toBe('flyout');
    expect(exported.get('FlyoutPart')).toBe('flyout');
    expect(exported.get('Loop')).toBe('loop');
  });

  it('export { } from 모양도 읽고, 주석 처리된 줄은 무시한다', () => {
    expect(exported.get('Legacy')).toBe('legacy');
    expect(exported.get('Props')).toBe('legacy');
    expect(exported.has('Commented')).toBe(false);
  });

  it('진입점이 없으면 빈 표다', () => {
    expect(designSystemExports('/none/index.ts', read).size).toBe(0);
  });
});

// @codocs [[피그마 연동:캡처 범위]]
describe('앱 조립이 쓰는 디자인 시스템 컴포넌트', () => {
  const exported = designSystemExports(INDEX, read);
  const story = `import { Button, type ButtonProps } from '@seojaewan/design-system';
import {
  MenuItem as Item,
  Flyout,
} from '@seojaewan/design-system';
import { other } from './other';`;

  it('스토리가 import한 이름의 컴포넌트가 components에 들어간다', () => {
    expect([...usedComponents([story], exported)].sort()).toEqual([
      'button',
      'flyout',
      'menu-item',
    ]);
  });

  it('디자인 시스템 컴포넌트만 바뀐 PR이 그것을 쓰는 조립을 범위에 넣는다', () => {
    const selection = selectAffected({
      changedFiles: ['packages/design-system/src/components/menu-item/menu-item.tsx'],
      componentSources: new Map([
        ['button', ['export function Button() {}']],
        ['menu-item', ['export function MenuItem() {}']],
      ]),
      patterns: new Map([
        [
          'Menu/Desktop',
          {
            files: new Set(['apps/web/src/menu.stories.tsx']),
            sources: [story],
            components: usedComponents([story], exported),
          },
        ],
      ]),
      patternAreas: new Map([['Menu/Desktop', 'menu']]),
      readChange: () => ({ before: undefined, after: undefined }),
    });
    expect(selection.all).toBe(false);
    expect(selection.all ? [] : [...selection.patterns]).toEqual(['Menu/Desktop']);
  });
});
