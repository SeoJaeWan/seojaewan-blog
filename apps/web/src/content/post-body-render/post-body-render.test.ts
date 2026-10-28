import { describe, expect, it, vi } from 'vitest';

import type { PostBlock } from '@/shared/utils/post-body/post-body';

import { renderPostBlocks } from './post-body-render';

vi.mock('server-only', () => ({}));

const CODE_BLOCK = { type: 'code', language: 'ts', code: 'const a = true;' } as const;
const EQUATION_BLOCK = { type: 'equation', expression: 'a^2 + b^2 = c^2' } as const;

// @codocs [[기술 스택:글 본문 처리]]
describe('기술 스택:글 본문 처리', () => {
  it('코드 블록은 서버에서 강조한 글자 조각을 더해 보낸다', async () => {
    const [block] = await renderPostBlocks([CODE_BLOCK]);
    expect(block?.type === 'code' && block.highlighted?.[0]).toContainEqual({
      text: 'true',
      syntax: 'keyword',
    });
  });

  it('수식 블록은 서버에서 그린 KaTeX HTML을 더해 보낸다', async () => {
    const [block] = await renderPostBlocks([EQUATION_BLOCK]);
    expect(block?.type === 'equation' && block.html).toContain('katex');
  });

  it('목록·할 일·토글 안의 하위 블록도 처리한다', async () => {
    const blocks: PostBlock[] = [
      { type: 'bulleted_list_item', richText: [], children: [CODE_BLOCK] },
      { type: 'to_do', richText: [], checked: false, children: [EQUATION_BLOCK] },
      {
        type: 'toggle',
        richText: [],
        children: [{ type: 'numbered_list_item', richText: [], children: [CODE_BLOCK] }],
      },
    ];
    const [list, todo, toggle] = await renderPostBlocks(blocks);
    const listChild = list?.type === 'bulleted_list_item' ? list.children?.[0] : undefined;
    expect(listChild?.type === 'code' && listChild.highlighted).toBeTruthy();
    const todoChild = todo?.type === 'to_do' ? todo.children?.[0] : undefined;
    expect(todoChild?.type === 'equation' && todoChild.html).toBeTruthy();
    const nested = toggle?.type === 'toggle' ? toggle.children?.[0] : undefined;
    const nestedChild = nested?.type === 'numbered_list_item' ? nested.children?.[0] : undefined;
    expect(nestedChild?.type === 'code' && nestedChild.highlighted).toBeTruthy();
  });

  it('강조할 수 없는 언어의 코드와 다른 블록은 그대로 보낸다', async () => {
    const blocks: PostBlock[] = [
      { type: 'code', language: 'plain text', code: '글자' },
      { type: 'paragraph', richText: [{ text: '문단', link: null }] },
    ];
    expect(await renderPostBlocks(blocks)).toEqual(blocks);
  });
});
