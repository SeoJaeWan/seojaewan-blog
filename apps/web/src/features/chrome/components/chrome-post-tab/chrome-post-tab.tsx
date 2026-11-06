import { type JSX, useRef, useState } from 'react';

import { ChromePage } from '@/features/chrome/components/chrome-page/chrome-page';
import {
  PostBlocks,
  type PostImageBlock,
} from '@/features/chrome/components/post-blocks/post-blocks';
import { ResponsiveImage } from '@/features/chrome/components/responsive-image/responsive-image';
import { getPostAddress } from '@/features/chrome/utils/chrome-address/chrome-address';
import type { ChromeTabPage } from '@/shared/utils/chrome-tabs/chrome-tabs';
import { getTocHeadings, type PostBody } from '@/shared/utils/post-body/post-body';
import {
  getFolderPath,
  type PostItem,
  type WorkspaceState,
} from '@/shared/utils/workspace-rules/workspace-rules';

import { usePostBody } from './hooks/use-post-body/use-post-body';
import { useReadingPosition } from './hooks/use-reading-position/use-reading-position';
import { getPostNeighbors } from './utils/post-neighbors/post-neighbors';

// 글 머리의 폴더 경로 사이와 경로·작성일 사이 글자다(피그마 Chrome/Page `Page=Post`의 `Blog › React · 2026-10-20`).
const META_PATH_SEPARATOR = ' › ';
const META_DATE_SEPARATOR = ' · ';

type ChromePostTabProps = {
  post: PostItem;
  workspace: Pick<WorkspaceState, 'items'>;
  layout: 'wide' | 'narrow';
  resolveLink: (href: string) => ChromeTabPage | null;
  onNavigate: (page: ChromeTabPage) => void;
  onReload: () => void;
  zoom?: number;
  onImageOpen?: (block: PostImageBlock, trigger: HTMLElement) => void;
  preloadedBody?: PostBody;
};

/**
 * Chrome 탭의 글 화면. 머리(폴더 경로, 작성일, 제목)와 꼬리(작성일 기준 이전·다음 글)는 글 색인으로 바로 그리고,
 * 본문은 서버 경로에서 받아 그린다. 받는 동안 본문 자리는 비워 두고, 받지 못하면 찾을 수 없음 화면을 보인다
 * (받는 중·실패 화면은 디자인이 없다). 제목이 1개 이상이면 목차를 보이고, 스크롤하는 동안 지금 읽는 제목을 표시한다.
 * 목차 항목을 누르면 그 제목으로 스크롤한다. 서버가 읽어 넘긴 본문(`preloadedBody`)이 있으면 받지 않고 바로 그린다.
 * 커버가 있으면 본문과 같은 방식(크기별 사본과 크기)으로 제목 위에 그린다.
 * @codocs [[Chrome:글 화면]]
 * @codocs [[SEO와 공유 미리보기:첫 HTML]]
 * @param props 컴포넌트 속성
 * @param props.post 보는 글
 * @param props.workspace 작업 공간(글 색인)
 * @param props.layout 피그마 Chrome/Page Layout
 * @param props.resolveLink 링크 주소가 블로그 안의 페이지면 그 페이지를 돌려준다. 외부 주소면 null이다
 * @param props.onNavigate 같은 탭에서 페이지로 갈 때(본문 링크, 이전·다음 글)
 * @param props.onReload 찾을 수 없음 화면의 새로고침 버튼을 눌렀을 때
 * @param props.zoom 페이지 본문 배율(1이 100%). 주지 않으면 배율을 걸지 않는다
 * @param props.onImageOpen 본문 이미지를 눌렀을 때(크게 보기). 누른 이미지 블록과 포커스를 돌려줄 요소를 받는다
 * @param props.preloadedBody 서버가 읽어 넘긴 이 글의 본문(글 주소로 처음 들어온 글). 있으면 서버 경로에서 받지 않는다
 */
export function ChromePostTab({
  post,
  workspace,
  layout,
  resolveLink,
  onNavigate: handleNavigate,
  onReload: handleReload,
  zoom,
  onImageOpen: handleImageOpen,
  preloadedBody,
}: ChromePostTabProps): JSX.Element {
  const bodyState = usePostBody(post.slug, preloadedBody);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isTocExpanded, setIsTocExpanded] = useState(false);
  const headings = bodyState.status === 'loaded' ? getTocHeadings(bodyState.body.blocks) : [];
  const cover = bodyState.status === 'loaded' ? bodyState.body.cover : null;
  const activeIndex = useReadingPosition(
    scrollRef,
    headings.map((heading) => heading.id),
  );
  const { previous, next } = getPostNeighbors(workspace, post.slug);

  if (bodyState.status === 'failed') {
    return (
      <ChromePage
        page="not-found"
        layout={layout}
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
      scrollRef={scrollRef}
      zoom={zoom}
      meta={getPostMeta(workspace, post)}
      title={post.name}
      cover={cover === null ? undefined : <ResponsiveImage image={cover} alt="" />}
      toc={headings.map((heading, index) => ({
        label: heading.label,
        isActive: index === activeIndex,
      }))}
      onTocItemSelect={handleTocItemSelect}
      isTocExpanded={isTocExpanded}
      onTocToggle={handleTocToggle}
      previousTitle={previous?.name}
      nextTitle={next?.name}
      onPreviousOpen={handlePreviousOpen}
      onNextOpen={handleNextOpen}
    >
      {bodyState.status === 'loaded' && (
        <PostBlocks
          blocks={bodyState.body.blocks}
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
