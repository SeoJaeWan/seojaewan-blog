import { z } from 'zod';

import type { NotionBlockNode } from '@/content/notion-client/notion-client';
import { getNotionImageAddress } from '@/content/notion-image-address/notion-image-address';
import {
  notionRichTextSchema,
  toPlainText,
  toRichText,
} from '@/content/notion-rich-text/notion-rich-text';
import type { PostBlock } from '@/shared/utils/post-body/post-body';

// 모든 블록에 있는 부분
const blockHeadSchema = z.object({
  id: z.string(),
  type: z.string(),
  last_edited_time: z.string(),
});

const richTexts = z.array(notionRichTextSchema);
const textBodySchema = z.object({ rich_text: richTexts });
const toDoBodySchema = z.object({ rich_text: richTexts, checked: z.boolean() });
const codeBodySchema = z.object({ rich_text: richTexts, language: z.string() });
const imageBodySchema = z.object({ caption: richTexts });
const tableBodySchema = z.object({ has_column_header: z.boolean() });
const tableRowBodySchema = z.object({ cells: z.array(richTexts) });
const bookmarkBodySchema = z.object({ url: z.string(), caption: richTexts });
const equationBodySchema = z.object({ expression: z.string() });

/** Notion 블록 하나와 그 하위 블록(검증한 머리 부분과 응답 그대로의 블록) */
type BlockInput = {
  head: z.infer<typeof blockHeadSchema>;
  block: Record<string, unknown>;
  children: readonly NotionBlockNode[];
};

/**
 * Notion 블록 나무를 본문 블록으로 바꾼다. 지원 블록 12종(제목, 문단, 목록(글머리·번호·할 일), 인용, 콜아웃, 코드, 이미지,
 * 구분선, 토글, 표, 북마크, 수식)을 옮긴다.
 * - 지원하지 않는 블록은 그 자리에 `unsupported`(Notion 유형 이름)를 두고 서버 로그에 경고를 남긴다. 조용히 버리거나 멈추지 않는다.
 * - 목록·할 일·토글은 하위 블록을 그대로 품는다. 하위 블록을 품지 못하는 블록(문단 등)의 하위 블록은 그 블록 바로 뒤에 둔다.
 * - 이미지 주소는 Notion 주소가 아니라 이미지 서버 주소다. 크기는 비워 두고 본문을 만들 때 `resolvePostImages`가 채운다.
 * - 코드 강조와 수식 HTML은 여기서 채우지 않는다. 본문을 보낼 때 `renderPostBlocks`가 채운다.
 * @codocs [[Notion 블록:지원 블록]]
 * @codocs [[Notion 블록:지원하지 않는 블록]]
 * @codocs [[Notion 이미지 제공:주소]]
 * @param nodes Notion 블록 나무(`readBlockTree` 결과)
 * @returns 본문 블록
 */
export function toPostBlocks(nodes: readonly NotionBlockNode[]): PostBlock[] {
  return nodes.flatMap(toPostBlock);
}

/**
 * Notion 블록 하나를 검증할 수 있는 모양으로 나눈다.
 * @param node 블록과 하위 블록
 * @returns 검증한 머리 부분과 블록, 하위 블록
 */
function toBlockInput(node: NotionBlockNode): BlockInput {
  return {
    head: blockHeadSchema.parse(node.block),
    block: z.record(z.string(), z.unknown()).parse(node.block),
    children: node.children,
  };
}

/**
 * 블록 하나를 본문 블록으로 바꾼다. 하위 블록을 품지 못하는 블록이면 하위 블록을 뒤에 이어 돌려준다.
 * @param node 블록과 하위 블록
 * @returns 본문 블록(하나 이상)
 */
function toPostBlock(node: NotionBlockNode): PostBlock[] {
  const { head, block, children } = toBlockInput(node);
  const body = block[head.type];
  switch (head.type) {
    case 'heading_1':
    case 'heading_2':
    case 'heading_3':
    case 'paragraph':
    case 'quote':
    case 'callout':
      return [
        { type: head.type, richText: toRichText(textBodySchema.parse(body).rich_text) },
        ...toPostBlocks(children),
      ];
    case 'bulleted_list_item':
    case 'numbered_list_item':
    case 'toggle':
      return [
        {
          type: head.type,
          richText: toRichText(textBodySchema.parse(body).rich_text),
          ...withChildren(children),
        },
      ];
    case 'to_do': {
      const toDo = toDoBodySchema.parse(body);
      return [
        {
          type: 'to_do',
          richText: toRichText(toDo.rich_text),
          isChecked: toDo.checked,
          ...withChildren(children),
        },
      ];
    }
    case 'code': {
      const code = codeBodySchema.parse(body);
      return [{ type: 'code', language: code.language, code: toPlainText(code.rich_text) }];
    }
    case 'image':
      return [
        {
          type: 'image',
          url: getNotionImageAddress(head.id, head.last_edited_time),
          width: null,
          height: null,
          caption: toRichText(imageBodySchema.parse(body).caption),
        },
      ];
    case 'divider':
      return [{ type: 'divider' }];
    case 'table':
      return [
        {
          type: 'table',
          hasColumnHeader: tableBodySchema.parse(body).has_column_header,
          rows: children.map((row) =>
            tableRowBodySchema
              .parse(z.object({ table_row: z.unknown() }).parse(row.block).table_row)
              .cells.map(toRichText),
          ),
        },
      ];
    case 'bookmark': {
      const bookmark = bookmarkBodySchema.parse(body);
      const caption = toPlainText(bookmark.caption);
      return [
        {
          type: 'bookmark',
          url: bookmark.url,
          title: caption === '' ? bookmark.url : caption,
          description: '',
        },
      ];
    }
    case 'equation':
      return [{ type: 'equation', expression: equationBodySchema.parse(body).expression }];
    default:
      console.warn(`[post-body] 지원하지 않는 블록이다: ${head.type} (${head.id})`);
      return [{ type: 'unsupported', typeName: head.type }];
  }
}

/**
 * 하위 블록이 있으면 본문 블록의 `children`으로 옮긴다.
 * @param children Notion 하위 블록 나무
 * @returns 하위 블록이 있으면 `children`, 없으면 빈 객체
 */
function withChildren(children: readonly NotionBlockNode[]): { children?: PostBlock[] } {
  return children.length === 0 ? {} : { children: toPostBlocks(children) };
}
