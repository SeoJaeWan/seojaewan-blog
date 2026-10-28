import { describe, expect, it } from 'vitest';

import { matchPasteNames, parsePasteText } from './paste-selection';
import { buildCatalog, TOKENS_KEY } from './target-catalog';

const catalog = buildCatalog(
  [
    { id: '1:1', name: 'Button', kind: 'COMPONENT_SET', variantCount: 4, group: 'Controls' },
    { id: '1:2', name: 'ToggleSwitch', kind: 'COMPONENT_SET', variantCount: 6, group: 'Controls' },
  ],
  [
    { id: '2:1', name: 'Menu/Folder', kind: 'COMPONENT', variantCount: 1, group: 'Menu' },
    { id: '2:2', name: 'Menu/Desktop', kind: 'COMPONENT', variantCount: 1, group: 'Menu' },
    {
      id: '2:3',
      name: 'Taskbar/Default',
      kind: 'COMPONENT_SET',
      variantCount: 2,
      group: 'Taskbar',
    },
  ],
  [{ id: '3:1', name: 'motion-window-open' }],
);

/**
 * 붙여넣은 글을 짝지어 고를 키와 찾지 못한 이름을 돌려준다.
 * @param text 붙여넣은 글
 * @returns 고를 키와 찾지 못한 이름
 */
function select(text: string) {
  return matchPasteNames(parsePasteText(text), catalog.items);
}

// @codocs [[피그마 연동:플러그인 화면]]
describe('이름 붙여넣기 선택: 형식', () => {
  it('한 줄에 하나, 또는 쉼표로 이은 이름을 나눈다', () => {
    expect(parsePasteText('Button, ToggleSwitch\nMenu/Folder')).toEqual([
      'Button',
      'ToggleSwitch',
      'Menu/Folder',
    ]);
  });

  it('줄 앞의 -·*·번호, 이름을 감싼 백틱, 앞뒤 공백을 뗀다', () => {
    expect(
      parsePasteText(
        '- `Button`\n* ToggleSwitch\n1. Menu/Folder\n2) `motion-window-open`\n  토큰  ',
      ),
    ).toEqual(['Button', 'ToggleSwitch', 'Menu/Folder', 'motion-window-open', '토큰']);
  });

  it('빈 줄과 #으로 시작하는 줄은 무시한다', () => {
    expect(parsePasteText('# 내보낼 대상\n\nButton\r\n   \n# 끝')).toEqual(['Button']);
  });
});

// @codocs [[피그마 연동:플러그인 화면]]
describe('이름 붙여넣기 선택: 이름 짝짓기', () => {
  it('토큰(또는 tokens)은 토큰, 이름은 컴포넌트, 영역/이름은 조립, 견본 이름은 애니메이션이다', () => {
    expect(select('토큰\nButton\nMenu/Folder\nmotion-window-open')).toEqual({
      keys: [TOKENS_KEY, 'component:1:1', 'pattern:2:1', 'motion:3:1'],
      notFound: [],
    });
    expect(select('tokens').keys).toEqual([TOKENS_KEY]);
  });

  it('영역/*은 그 영역의 조립 전체다', () => {
    expect(select('menu/*').keys).toEqual(['pattern:2:1', 'pattern:2:2']);
  });

  it('대소문자와 / 앞뒤 공백을 구분하지 않는다', () => {
    expect(select('BUTTON, menu / folder, TOKENS').keys).toEqual([
      'component:1:1',
      'pattern:2:1',
      TOKENS_KEY,
    ]);
  });

  it('찾지 못한 이름은 붙여넣은 그대로 모으고, 같은 대상은 한 번만 고른다', () => {
    expect(select('Button\nbutton\nCheckBox\nStart/*')).toEqual({
      keys: ['component:1:1'],
      notFound: ['CheckBox', 'Start/*'],
    });
  });
});
