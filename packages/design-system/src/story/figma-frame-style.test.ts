// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { TOKEN_NAMES } from '../token-names';
import {
  cssVariableName,
  type FigmaExport,
  figmaFrameStyle,
  type FigmaNode,
} from './figma-frame-style';

/**
 * 크기 방식만 가진 노드를 만든다.
 * @param name 노드 이름
 * @param fields 나머지 칸
 * @returns 노드
 */
function figmaNode(name: string, fields: Omit<FigmaNode, 'name'>): FigmaNode {
  return { name, ...fields };
}

const listItem: FigmaExport = {
  name: 'ListItem',
  variants: {
    'size=compact,state=rest': {
      properties: { Size: 'Compact', State: 'Rest' },
      tree: figmaNode('Size=Compact, State=Rest', {
        sizing: { h: 'FIXED', v: 'HUG' },
        width: 'size/list-item/width',
      }),
    },
    'size=two-line,state=rest': {
      properties: { Size: 'Two-line', State: 'Rest' },
      tree: figmaNode('Size=Two-line, State=Rest', {
        sizing: { h: 'FIXED', v: 'FIXED' },
        width: 'size/list-item/width',
        height: 'size/list-item/two-line-height',
      }),
    },
  },
};

const footer: FigmaExport = {
  name: 'StartMenuFooter',
  variants: {
    default: {
      properties: {},
      tree: figmaNode('StartMenuFooter', {
        sizing: { h: 'FIXED', v: 'HUG' },
        width: 'size/start-menu/footer-width',
        layout: { mode: 'HORIZONTAL' },
        children: [
          figmaNode('Content', {
            sizing: { h: 'FILL', v: 'HUG' },
            layout: { mode: 'HORIZONTAL' },
            children: [
              figmaNode('ProfileButton', { sizing: { h: 'FILL', v: 'HUG' } }),
              figmaNode('power button', { sizing: { h: 'HUG', v: 'HUG' } }),
            ],
          }),
        ],
      }),
    },
  },
};

// @codocs [[피그마 연동:스토리 규칙]]
describe('figmaFrameStyle', () => {
  it('args로 변형을 골라 고정 축에 연결한 크기 변수를 주고 HUG 축은 비운다', () => {
    expect(figmaFrameStyle(listItem, { size: 'compact', state: 'rest' })).toEqual({
      width: 'var(--size-list-item-width)',
      flexShrink: 0,
    });
    expect(figmaFrameStyle(listItem, { size: 'two-line' })).toEqual({
      width: 'var(--size-list-item-width)',
      height: 'var(--size-list-item-two-line-height)',
      flexShrink: 0,
    });
  });

  it('args에 없는 변형 속성은 아무 값이나 맞고, 맞은 변형끼리 크기가 다르면 오류다', () => {
    expect(() => figmaFrameStyle(listItem, {})).toThrow('크기가 다르다');
    expect(() => figmaFrameStyle(listItem, { size: 'wide' })).toThrow('변형이 없다');
  });

  it('안쪽 노드는 부모 방향을 따라 채움(FILL)을 준다', () => {
    expect(figmaFrameStyle(footer, {}, 'Content/ProfileButton')).toEqual({
      flex: '1 1 0',
      minWidth: 0,
    });
    expect(figmaFrameStyle(footer, {}, 'Content/power button')).toEqual({});
    expect(() => figmaFrameStyle(footer, {}, 'Content/없음')).toThrow('노드가 없다');
  });

  it('피그마 변수 경로를 토큰 생성 규칙대로 CSS 변수 이름으로 바꾼다', () => {
    expect(cssVariableName('size/start-menu/footer-width')).toBe('--size-start-menu-footer-width');
    expect(cssVariableName('Surface/Flyout (Acrylic)')).toBe('--surface-flyout-acrylic');
  });

  it('컴포넌트 export.json의 모든 고정 크기 변수는 토큰에 있다', () => {
    const tokens = new Set<string>(Object.values(TOKEN_NAMES).flat());
    const componentsDir = path.join(import.meta.dirname, '../../figma/components');
    const missing: string[] = [];
    /**
     * 노드와 자식의 크기 변수를 모은다.
     * @param node 노드
     * @param where 오류 문구에 쓸 위치
     */
    function check(node: FigmaNode, where: string): void {
      for (const variable of [node.width, node.height]) {
        if (variable !== undefined && !tokens.has(cssVariableName(variable).slice(2))) {
          missing.push(`${where}: ${variable}`);
        }
      }
      for (const child of node.children ?? []) {
        check(child, where);
      }
    }
    for (const component of readdirSync(componentsDir)) {
      const source = JSON.parse(
        readFileSync(path.join(componentsDir, component, 'export.json'), 'utf8'),
      ) as FigmaExport;
      for (const [variant, { tree }] of Object.entries(source.variants)) {
        check(tree, `${component} ${variant}`);
      }
    }
    expect(missing).toEqual([]);
  });
});
