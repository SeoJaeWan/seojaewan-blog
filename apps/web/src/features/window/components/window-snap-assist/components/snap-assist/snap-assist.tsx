import { Button } from '@base-ui/react/button';
import { type JSX, type KeyboardEvent, type ReactNode, useRef } from 'react';

import { cn, SnapPreview, WindowPreview } from '@seojaewan/design-system';

import { useRovingFocus } from '@/shared/hooks/use-roving-focus/use-roving-focus';

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
  /** 카드의 닫기 버튼을 누르거나 카드에서 Delete를 눌렀을 때 부른다. 그 창을 닫는다 */
  onClose?: (id: string) => void;
  /** 바깥 배치 클래스. 크기와 위치는 남은 칸에 맞춰 쓰는 곳이 정한다 */
  className?: string;
};

/**
 * 창 하나를 스냅한 뒤 남은 칸에 열린 다른 창을 제안하는 Snap Assist(피그마 조립 `Window/SnapAssist`)를 그린다.
 * 남은 칸 전체를 SnapPreview로 덮고, 그 가운데에 제안 창마다 WindowPreview 카드를 가로로 늘어놓는다.
 * 카드를 누르면(`onSelect`) 그 창이 남은 칸을 채운다. Esc나 빈 곳으로 닫는 동작은 쓰는 곳(창 층)이 맡는다.
 * 카드는 Base UI Button이고 목록은 Tab 한 번에 닿으며 안에서 ←/→로 옮긴다. Delete는 그 창을 닫는다.
 * @codocs [[디자인 시스템:조립]]
 * @codocs [[스냅:Snap Assist]]
 * @codocs [[접근성:Tab]]
 * @codocs [[접근성:역할]]
 * @param props
 */
export function SnapAssist(props: SnapAssistProps): JSX.Element {
  const { suggestions, onSelect, onClose, className } = props;
  const listRef = useRef<HTMLDivElement>(null);
  const rovingProps = useRovingFocus(listRef, { orientation: 'horizontal' });
  return (
    <div className={cn('relative flex items-center justify-center', className)}>
      <SnapPreview className="absolute inset-spacing-none" />
      {/* 피그마 `suggestions` 배치 프레임(가로, 간격 8)이다 */}
      <div
        ref={listRef}
        {...rovingProps}
        className="relative flex items-start gap-spacing-sm overflow-clip"
      >
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
             * Delete를 누르면 그 창을 닫는다.
             * @param event 키 이벤트
             */
            function handleKeyDown(event: KeyboardEvent<HTMLElement>): void {
              if (event.key === 'Delete') {
                event.preventDefault();
                onClose?.(suggestion.id);
              }
            }
            /** 닫기 버튼을 누르면 쓰는 곳에 알린다. */
            function handleClose(): void {
              onClose?.(suggestion.id);
            }
            const card = (
              <WindowPreview
                key={suggestion.id}
                data-snap-assist-suggestion
                onClose={handleClose}
                appIcon={suggestion.appIcon}
                title={suggestion.title}
                thumbnail={suggestion.thumbnail}
                className="shrink-shrink-none"
              />
            );
            return onSelect === undefined ? (
              card
            ) : (
              <Button
                key={suggestion.id}
                nativeButton={false}
                onClick={handleClick}
                onKeyDown={handleKeyDown}
                // @codocs [[접근성:역할]]
                aria-keyshortcuts="Delete"
                render={card}
              />
            );
          },
        )}
      </div>
    </div>
  );
}
