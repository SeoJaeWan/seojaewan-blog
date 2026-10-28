import type { JSX, KeyboardEvent, MouseEvent, ReactNode } from 'react';

import { IconButton } from '@seojaewan/design-system';

export type ChromeImageViewerLayout = 'wide' | 'narrow';

type ChromeImageViewerProps = {
  /** 피그마 Layout. wide는 넓은 창(이미지 칸 좌우 여백 32), narrow는 좁은 창(모바일 폭)의 배치다 */
  layout?: ChromeImageViewerLayout;
  /**
   * 크게 볼 이미지(피그마 `image`). 페이지 영역 안에 맞추되 원본보다 키우지 않도록 쓰는 곳이 크기를 정한다
   * (예: `max-h-full max-w-full object-contain`)
   */
  image: ReactNode;
  /** 이미지 아래 캡션. 없으면 그리지 않는다 */
  caption?: string;
  /** 닫기 버튼, Esc, 이미지 밖 바탕을 눌렀을 때 */
  onClose?: () => void;
  /** 바깥 배치 클래스. 덮을 페이지 영역의 크기와 위치는 쓰는 곳이 정한다 */
  className?: string;
};

/**
 * 글 이미지를 크게 보는 화면(피그마 조립 `Chrome/ImageViewer`)을 그린다. 탭의 페이지 영역을 어두운 바탕으로 덮고,
 * 오른쪽 위에 닫기 버튼, 가운데에 이미지와 캡션을 둔다. 닫기 버튼·Esc·이미지 밖 바탕을 누르면 `onClose`를 부른다.
 * 크기는 덮는 페이지 영역이 정하고, 열고 닫는 움직임은 없다. 포커스 가두기와 원래 이미지로 포커스 돌리기는 여는 쪽이 붙인다.
 * @codocs [[디자인 시스템:조립]]
 * @codocs [[Chrome:글 화면]]
 * @param props
 */
export function ChromeImageViewer(props: ChromeImageViewerProps): JSX.Element {
  const { layout = 'wide', image, caption, onClose: handleClose, className } = props;

  /**
   * 이미지 밖 바탕(덮개나 이미지 칸의 빈 곳)을 누르면 닫는다.
   * @param event 누르기 이벤트
   */
  function handleBackdropClick(event: MouseEvent<HTMLDivElement>): void {
    const isBackdrop =
      event.target === event.currentTarget ||
      (event.target instanceof HTMLElement && event.target.dataset.backdrop !== undefined);
    if (isBackdrop) {
      handleClose?.();
    }
  }

  /**
   * Esc를 누르면 닫는다.
   * @param event 키 이벤트
   */
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      handleClose?.();
    }
  }

  return (
    <div
      role="dialog"
      aria-modal
      aria-label={caption === undefined ? '이미지 크게 보기' : caption}
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      className={[
        'flex flex-col items-start gap-16 bg-chrome-image-viewer-backdrop p-16',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* 피그마 `toolbar` 배치 프레임. 닫기 버튼을 오른쪽 끝에 둔다 */}
      <div data-backdrop className="flex w-full justify-end">
        <IconButton
          label="닫기"
          icon="icons/ic_fluent_dismiss_20_regular.svg"
          onClick={handleClose}
        />
      </div>
      {/* 피그마 `stage` 배치 프레임. 남은 높이를 채우고 이미지와 캡션을 가운데에 둔다 */}
      <div
        data-backdrop
        className={[
          'flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-12',
          layout === 'wide' ? 'px-32' : 'px-0',
        ].join(' ')}
      >
        {image}
        {caption !== undefined && (
          <p className="w-full text-center type-body text-chrome-image-viewer-text">{caption}</p>
        )}
      </div>
    </div>
  );
}
