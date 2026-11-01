import {
  type JSX,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
  useEffect,
  useRef,
} from 'react';

import type { ChromePageLayout } from '@/features/chrome/components/chrome-page/chrome-page';
import {
  type PostImageBlock,
  renderTemporaryImage,
} from '@/features/chrome/components/post-blocks/post-blocks';
import type { DeviceVariant } from '@/shared/hooks/use-device/use-device';
import { getPlainText } from '@/shared/utils/post-body/post-body';

import { ChromeFindBar } from './components/chrome-find-bar/chrome-find-bar';
import { ChromeImageViewer } from './components/chrome-image-viewer/chrome-image-viewer';
import { usePageFind } from './hooks/use-page-find/use-page-find';

/** 열린 찾기 막대 */
export type ChromePageFind = {
  /** 찾는 글자 */
  query: string;
  /** 입력칸에 포커스를 주고 글자를 모두 선택할 때마다 바꾸는 번호(이미 열린 막대를 Ctrl+F로 다시 열 때) */
  focusRequest: number;
};

/** 크게 보는 이미지 */
export type ChromePageImage = {
  /** 이미지 블록 */
  block: PostImageBlock;
  /** 크게 보기를 닫은 뒤 포커스를 돌려줄 요소(누른 이미지) */
  trigger: HTMLElement;
};

type ChromePageAreaProps = {
  /** 페이지 영역 요소. 쓰는 곳이 이 영역의 너비로 페이지 모양을 정한다 */
  areaRef: RefObject<HTMLDivElement | null>;
  /** 화면 방식. 모바일은 찾기 막대가 도구 모음 아래 전체 폭이다 */
  device: DeviceVariant;
  /** 페이지 모양. 크게 보기가 이 배치를 따른다 */
  layout: ChromePageLayout;
  /** 탭 내용(고른 탭의 페이지) */
  children: ReactNode;
  /** 열린 찾기 막대. 닫혀 있으면 null */
  find: ChromePageFind | null;
  /** 찾는 글자를 바꿀 때 */
  onFindQueryChange: (query: string) => void;
  /** 찾기 막대를 닫을 때(Esc, 닫기 버튼) */
  onFindClose: () => void;
  /** 크게 보는 이미지. 없으면 null */
  image: ChromePageImage | null;
  /** 크게 보기를 닫을 때(닫기 버튼, Esc, 이미지 밖 바탕) */
  onImageClose: () => void;
};

// 찾기 막대를 놓는 자리다. 데스크톱은 도구 모음 아래 오른쪽, 모바일은 도구 모음 아래 전체 폭이다.
const findBarClassNames = {
  desktop: 'absolute top-spacing-none right-spacing-lg',
  mobile: 'absolute inset-x-spacing-none top-spacing-none',
} as const satisfies Record<DeviceVariant, string>;

// 크게 보는 이미지는 페이지 영역 안에 맞추되 원본보다 키우지 않는다.
const VIEWER_IMAGE_CLASS_NAME = 'min-h-size-none max-h-full max-w-full object-contain';

/**
 * Chrome 창의 페이지 영역(도구 모음 아래)이다. 탭 내용 위에 찾기 막대와 이미지 크게 보기를 겹쳐 그린다.
 * 찾기는 탭 내용의 글자에서만 찾고(찾기 막대 글자는 빼고), Enter는 다음, Shift+Enter는 이전, Esc는 닫기다.
 * 크게 보기는 이 영역만 덮어 탭 표시줄·도구 모음은 그대로 보이고, 찾기 막대가 열려 있으면 그 위를 덮는다.
 * 배율과 상관없이 영역 크기에 맞춘다(배율은 탭 내용에만 걸린다). 열 때 포커스를 크게 보기 안으로 옮긴다.
 * 탭 내용은 눌러서 포커스를 받을 수 있어(Tab 키로는 닿지 않는다) 본문을 누른 뒤에도 Chrome 창 단축키(Ctrl+F 등)가 닿는다.
 * @codocs [[Chrome:페이지에서 찾기]]
 * @codocs [[Chrome:글 화면]]
 * @param props
 */
export function ChromePageArea(props: ChromePageAreaProps): JSX.Element {
  const {
    areaRef,
    device,
    layout,
    children,
    find,
    onFindQueryChange: handleFindQueryChange,
    onFindClose: handleFindClose,
    image,
    onImageClose: handleImageClose,
  } = props;
  const contentRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const {
    current,
    total,
    next: handleNext,
    previous: handlePrevious,
  } = usePageFind(contentRef, find?.query ?? '');
  const focusRequest = find?.focusRequest;

  useEffect(
    /** 이미 열린 찾기 막대를 다시 열면 입력칸에 포커스를 주고 글자를 모두 선택한다. */
    () => {
      if (focusRequest === undefined) {
        return;
      }
      const input = areaRef.current?.querySelector<HTMLInputElement>('[role="search"] input');
      input?.focus();
      input?.select();
    },
    [areaRef, focusRequest],
  );

  useEffect(
    /** 크게 보기를 열면 포커스를 그 안으로 옮긴다. */
    () => {
      if (image !== null) {
        viewerRef.current?.focus();
      }
    },
    [image],
  );

  /**
   * 찾기 막대 입력칸의 키. Enter는 다음, Shift+Enter는 이전, Esc는 닫기다. 한글을 조합하는 중의 키는 받지 않는다.
   * @param event 키 이벤트
   */
  function handleFindKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.nativeEvent.isComposing) {
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      if (event.shiftKey) {
        handlePrevious();
      } else {
        handleNext();
      }
    } else if (event.key === 'Escape') {
      event.preventDefault();
      handleFindClose();
    }
  }

  const caption = image === null ? '' : getPlainText(image.block.caption);
  return (
    <div
      ref={areaRef}
      data-layout={layout}
      className="relative flex min-h-size-none w-full flex-flex-fill flex-col"
    >
      <div
        ref={contentRef}
        tabIndex={-1}
        className="flex min-h-size-none w-full flex-flex-fill flex-col outline-none"
      >
        {children}
      </div>
      {find !== null && (
        <ChromeFindBar
          device={device}
          value={find.query}
          onValueChange={handleFindQueryChange}
          onKeyDown={handleFindKeyDown}
          current={current}
          total={total}
          onPrevious={handlePrevious}
          onNext={handleNext}
          onClose={handleFindClose}
          className={findBarClassNames[device]}
        />
      )}
      {image !== null && (
        <ChromeImageViewer
          ref={viewerRef}
          layout={layout}
          image={renderTemporaryImage(image.block, VIEWER_IMAGE_CLASS_NAME)}
          caption={caption.length > 0 ? caption : undefined}
          onClose={handleImageClose}
          className="absolute inset-spacing-none"
        />
      )}
    </div>
  );
}
