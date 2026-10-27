// 항목의 링크(우클릭 메뉴의 링크 복사)를 정한다. 바탕화면과 탐색기가 함께 쓴다.

import type { WorkspaceItem } from '@/shared/utils/workspace-rules/workspace-rules';

/**
 * 링크 복사에 쓸 항목의 링크. 글은 공유 링크(`/posts/<slug>`), 외부 링크는 그 주소다. 그 밖의 항목은 링크가 없다.
 * @codocs [[바탕화면:아이콘 우클릭 메뉴]]
 * @codocs [[파일 탐색기:우클릭 메뉴]]
 * @param item 항목
 * @param origin 블로그 주소의 출처(`https://…`)
 * @returns 링크. 없으면 null
 */
export function getItemLink(item: WorkspaceItem, origin: string): string | null {
  switch (item.kind) {
    case 'post':
      return `${origin}/posts/${item.slug}`;
    case 'link':
      return item.url;
    case 'folder':
    case 'recycle-bin':
      return null;
  }
}

/**
 * 항목의 링크를 클립보드에 복사한다. 링크가 없거나 클립보드를 쓸 수 없으면(권한 거부 등) 조용히 넘어간다.
 * @param item 항목
 */
export function copyItemLink(item: WorkspaceItem): void {
  const link = getItemLink(item, window.location.origin);
  if (link !== null && typeof navigator.clipboard !== 'undefined') {
    navigator.clipboard.writeText(link).catch(ignoreClipboardError);
  }
}

/** 클립보드에 쓰지 못하면 조용히 넘어간다. */
function ignoreClipboardError(): void {}
