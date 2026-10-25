import type { JSX, KeyboardEvent, ReactNode } from 'react';

import { SnapPreview, WindowPreview } from '@seojaewan/design-system';

/** Snap Assist가 제안하는 창 하나 */
export type SnapAssistSuggestion = {
  /** 목록 안에서 창을 가리키는 값(창 id) */
  id: string;
  /** 창 앱 아이콘(16px) */
  appIcon: ReactNode;
  /** 창 제목 */
  title: string;
  /** 창 축소 화면. 실제 창 조립을 `WindowThumbnail`로 줄여 넣는다 */
  thumbnail: ReactNode;
};

type SnapAssistProps = {
  /** 남은 칸을 채울 수 있게 제안하는 다른 창들 */
  suggestions: readonly SnapAssistSuggestion[];
  /** 제안 창을 눌렀을 때 부른다. 그 창이 남은 칸을 채운다. 주면 카드가 버튼 역할을 한다 */
  onSelect?: (id: string) => void;
  /** 카드의 닫기 버튼을 눌렀을 때 부른다. 그 창을 닫는다 */
  onClose?: (id: string) => void;
  /** 바깥 배치 클래스. 크기와 위치는 남은 칸에 맞춰 쓰는 곳이 정한다 */
  className?: string;
};

/**
 * 창 하나를 스냅한 뒤 남은 칸에 열린 다른 창을 제안하는 Snap Assist(피그마 조립 `Window/SnapAssist`)를 그린다.
 * 남은 칸 전체를 SnapPreview로 덮고, 그 가운데에 제안 창마다 WindowPreview 카드를 가로로 늘어놓는다.
 * 카드를 누르면(`onSelect`) 그 창이 남은 칸을 채운다. Esc나 빈 곳으로 닫는 동작은 쓰는 곳(창 층)이 맡는다.
 * @codocs [[디자인 시스템:조립]]
 * @codocs [[창 동작:스냅]]
 * @param props
 */
export function SnapAssist(props: SnapAssistProps): JSX.Element {
  const { suggestions, onSelect, onClose, className } = props;
  const isSelectable = onSelect !== undefined;
  return (
    <div
      className={['relative flex items-center justify-center', className].filter(Boolean).join(' ')}
    >
      <SnapPreview className="absolute inset-0" />
      {/* 피그마 `suggestions` 배치 프레임(가로, 간격 8)이다 */}
      <div className="relative flex items-start gap-8 overflow-clip">
        {suggestions.map(
          /**
           * 제안 창 카드 하나를 그린다.
           * @param suggestion 제안 창
           * @returns WindowPreview
           */
          (suggestion) => {
            /** 카드를 누르면 쓰는 곳에 알린다. */
            function handleClick(): void {
              onSelect?.(suggestion.id);
            }
            /**
             * Enter·Space를 누르면 카드를 누른 것으로 본다.
             * @param event 키 이벤트
             */
            function handleKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
              if (
                event.target === event.currentTarget &&
                (event.key === 'Enter' || event.key === ' ')
              ) {
                event.preventDefault();
                onSelect?.(suggestion.id);
              }
            }
            /** 닫기 버튼을 누르면 쓰는 곳에 알린다. */
            function handleClose(): void {
              onClose?.(suggestion.id);
            }
            const handleSelectClick = isSelectable ? handleClick : undefined;
            const handleSelectKeyDown = isSelectable ? handleKeyDown : undefined;
            return (
              <WindowPreview
                key={suggestion.id}
                role={isSelectable ? 'button' : undefined}
                tabIndex={isSelectable ? 0 : undefined}
                aria-label={isSelectable ? suggestion.title : undefined}
                data-snap-assist-suggestion
                onClick={handleSelectClick}
                onKeyDown={handleSelectKeyDown}
                onClose={handleClose}
                appIcon={suggestion.appIcon}
                title={suggestion.title}
                thumbnail={suggestion.thumbnail}
                className="shrink-0"
              />
            );
          },
        )}
      </div>
    </div>
  );
}
