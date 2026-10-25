import type { JSX, ReactNode } from 'react';

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
  /** 바깥 배치 클래스. 크기와 위치는 남은 칸에 맞춰 쓰는 곳이 정한다 */
  className?: string;
};

/**
 * 창 하나를 스냅한 뒤 남은 칸에 열린 다른 창을 제안하는 Snap Assist(피그마 조립 `Window/SnapAssist`)를 그린다.
 * 남은 칸 전체를 SnapPreview로 덮고, 그 가운데에 제안 창마다 WindowPreview 카드를 가로로 늘어놓는다.
 * 창을 고르면 남은 칸을 채우고 Esc나 빈 곳으로 닫는 동작은 기능을 구현할 때 붙인다.
 * @codocs [[디자인 시스템:조립]]
 * @codocs [[창 동작:스냅]]
 * @param props
 */
export function SnapAssist(props: SnapAssistProps): JSX.Element {
  const { suggestions, className } = props;
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
          (suggestion) => (
            <WindowPreview
              key={suggestion.id}
              appIcon={suggestion.appIcon}
              title={suggestion.title}
              thumbnail={suggestion.thumbnail}
              className="shrink-0"
            />
          ),
        )}
      </div>
    </div>
  );
}
