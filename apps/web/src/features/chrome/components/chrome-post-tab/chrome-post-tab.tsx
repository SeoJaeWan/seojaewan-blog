import { type JSX, useRef, useState } from 'react';

import { ChromePage } from '@/features/chrome/components/chrome-page/chrome-page';
import {
  PostBlocks,
  type PostImageBlock,
} from '@/features/chrome/components/post-blocks/post-blocks';
import { usePostBody } from '@/features/chrome/hooks/use-post-body/use-post-body';
import { useReadingPosition } from '@/features/chrome/hooks/use-reading-position/use-reading-position';
import { getPostAddress } from '@/features/chrome/utils/chrome-address/chrome-address';
import { getPostNeighbors } from '@/features/chrome/utils/post-neighbors/post-neighbors';
import type { ChromeTabPage } from '@/shared/utils/chrome-tabs/chrome-tabs';
import { getTocHeadings } from '@/shared/utils/post-body/post-body';
import {
  getFolderPath,
  type PostItem,
  type WorkspaceState,
} from '@/shared/utils/workspace-rules/workspace-rules';

// 글 머리의 폴더 경로 사이와 경로·작성일 사이 글자다(피그마 Chrome/Page `Page=Post`의 `Blog › React · 2026-10-20`).
const META_PATH_SEPARATOR = ' › ';
const META_DATE_SEPARATOR = ' · ';

type ChromePostTabProps = {
  /** 보는 글 */
  post: PostItem;
  /** 작업 공간(글 색인) */
  workspace: Pick<WorkspaceState, 'items'>;
  /** 피그마 Chrome/Page Layout */
  layout: 'wide' | 'narrow';
  /** 링크 주소가 블로그 안의 페이지면 그 페이지를 돌려준다. 외부 주소면 null이다 */
  resolveLink: (href: string) => ChromeTabPage | null;
  /** 같은 탭에서 페이지로 갈 때(본문 링크, 이전·다음 글) */
  onNavigate: (page: ChromeTabPage) => void;
  /** 찾을 수 없음 화면의 새로고침 버튼을 눌렀을 때 */
  onReload: () => void;
  /** 페이지 본문 배율(1이 100%). 주지 않으면 배율을 걸지 않는다 */
  zoom?: number;
  /** 본문 이미지를 눌렀을 때(크게 보기). 누른 이미지 블록과 포커스를 돌려줄 요소를 받는다 */
  onImageOpen?: (block: PostImageBlock, trigger: HTMLElement) => void;
};

/**
 * Chrome 탭의 글 화면. 머리(폴더 경로, 작성일, 제목)와 꼬리(작성일 기준 이전·다음 글)는 글 색인으로 바로 그리고,
 * 본문은 서버 경로에서 받아 그린다. 받는 동안 본문 자리는 비워 두고, 받지 못하면 찾을 수 없음 화면을 보인다
 * (받는 중·실패 화면은 디자인이 없다). 제목이 1개 이상이면 목차를 보이고, 스크롤하는 동안 지금 읽는 제목을 표시한다.
 * 목차 항목을 누르면 그 제목으로 스크롤한다.
 * @codocs [[Chrome:글 화면]]
 * @param props
 */
export function ChromePostTab(props: ChromePostTabProps): JSX.Element {
  const {
    post,
    workspace,
    layout,
    resolveLink,
    onNavigate: handleNavigate,
    onReload: handleReload,
    zoom,
    onImageOpen: handleImageOpen,
  } = props;
  const body = usePostBody(post.slug);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isTocExpanded, setIsTocExpanded] = useState(false);
  const headings = body.status === 'loaded' ? getTocHeadings(body.blocks) : [];
  const activeIndex = useReadingPosition(
    scrollRef,
    headings.map((heading) => heading.id),
  );
  const { previous, next } = getPostNeighbors(workspace, post.slug);
  const className = 'min-h-0 w-full flex-1';

  if (body.status === 'failed') {
    return (
      <ChromePage
        page="not-found"
        layout={layout}
        className={className}
        zoom={zoom}
        url={getPostAddress(post.slug)}
        onReload={handleReload}
      />
    );
  }

  /**
   * 목차 항목의 제목으로 스크롤한다. 펼친 narrow 목차는 접는다.
   * @param index 목차 항목 순서
   */
  function handleTocItemSelect(index: number): void {
    setIsTocExpanded(false);
    const heading = headings[index];
    if (heading !== undefined) {
      scrollRef.current
        ?.querySelector(`#${CSS.escape(heading.id)}`)
        ?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }
  }

  /** 이전 글로 간다. */
  function handlePreviousOpen(): void {
    if (previous !== undefined) {
      handleNavigate({ kind: 'post', slug: previous.slug });
    }
  }

  /** 다음 글로 간다. */
  function handleNextOpen(): void {
    if (next !== undefined) {
      handleNavigate({ kind: 'post', slug: next.slug });
    }
  }

  /** narrow 목차를 펼치거나 접는다. */
  function handleTocToggle(): void {
    setIsTocExpanded((isExpanded) => !isExpanded);
  }

  return (
    <ChromePage
      page="post"
      layout={layout}
      className={className}
      scrollRef={scrollRef}
      zoom={zoom}
      meta={getPostMeta(workspace, post)}
      title={post.name}
      toc={headings.map((heading, index) => ({
        label: heading.label,
        active: index === activeIndex,
      }))}
      onTocItemSelect={handleTocItemSelect}
      isTocExpanded={isTocExpanded}
      onTocToggle={handleTocToggle}
      previousTitle={previous?.name}
      nextTitle={next?.name}
      onPreviousOpen={handlePreviousOpen}
      onNextOpen={handleNextOpen}
    >
      {body.status === 'loaded' && (
        <PostBlocks
          blocks={body.blocks}
          resolveLink={resolveLink}
          onPageOpen={handleNavigate}
          onImageOpen={handleImageOpen}
        />
      )}
    </ChromePage>
  );
}

/**
 * 글 머리의 작은 글자. 글이 놓인 폴더 경로와 작성일이다(예: `Blog › React · 2026-10-20`).
 * 바탕화면이나 휴지통에 있으면 작성일만이다.
 * @codocs [[Chrome:글 화면]]
 * @param workspace 작업 공간
 * @param post 글
 * @returns 머리 글자
 */
function getPostMeta(workspace: Pick<WorkspaceState, 'items'>, post: PostItem): string {
  const path =
    post.parentId === null ? [] : getFolderPath(workspace, post.parentId).map((f) => f.name);
  return [...(path.length > 0 ? [path.join(META_PATH_SEPARATOR)] : []), post.date].join(
    META_DATE_SEPARATOR,
  );
}
