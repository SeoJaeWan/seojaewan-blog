import 'server-only';

import { highlightCode } from '@/content/code-highlight/code-highlight';
import { renderEquationHtml } from '@/content/equation-render/equation-render';
import type { PostBlock } from '@/shared/utils/post-body/post-body';

/**
 * 본문 블록에 서버에서 처리할 것을 채운다. 코드 블록은 Shiki로 강조한 글자 조각(`highlighted`), 수식 블록은 KaTeX로
 * 그린 HTML(`html`)을 더한다. 목록·할 일·토글 안의 하위 블록도 같이 처리한다.
 * 브라우저는 이 결과를 그리기만 하고 강조·수식 계산을 돌리지 않는다.
 * @codocs [[기술 스택:글 본문 처리]]
 * @codocs [[Chrome:Notion 블록]]
 * @param blocks 본문 블록
 * @returns 강조와 수식을 채운 본문 블록
 */
export async function renderPostBlocks(blocks: readonly PostBlock[]): Promise<PostBlock[]> {
  return Promise.all(blocks.map(renderPostBlock));
}

/**
 * 블록 하나에 서버 처리를 채운다.
 * @param block 블록
 * @returns 처리한 블록
 */
async function renderPostBlock(block: PostBlock): Promise<PostBlock> {
  switch (block.type) {
    case 'code': {
      const highlighted = await highlightCode(block.code, block.language);
      return highlighted === undefined ? block : { ...block, highlighted };
    }
    case 'equation': {
      const html = renderEquationHtml(block.expression);
      return html === undefined ? block : { ...block, html };
    }
    case 'bulleted_list_item':
    case 'numbered_list_item':
    case 'to_do':
    case 'toggle':
      return block.children === undefined
        ? block
        : { ...block, children: await renderPostBlocks(block.children) };
    default:
      return block;
  }
}
