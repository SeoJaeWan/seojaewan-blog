import type { ComponentProps, CSSProperties, JSX, ReactNode } from 'react';

import { SearchBox, ShellSurface } from '@seojaewan/design-system';

export type SearchPanelDevice = 'desktop' | 'mobile';

type SearchPanelProps = {
  /**
   * 피그마 Device. desktop은 작업 표시줄 입력칸에 글자를 입력해 패널 안에 입력칸이 없고,
   * mobile은 작업 표시줄에 입력칸 대신 검색 버튼이 있어 패널 위쪽에 입력칸을 둔다
   */
  device?: SearchPanelDevice;
  /** 모바일 패널 위쪽 입력칸(SearchBox `Appearance=Pill`)에 넘길 속성. 데스크톱에서는 쓰지 않는다 */
  searchBoxProps?: Omit<ComponentProps<typeof SearchBox>, 'appearance' | 'className'>;
  /** 본문 자리. 쓰는 쪽이 검색 본문(`Search/Body`)을 넣는다 */
  children?: ReactNode;
  /** 바깥 배치 클래스 */
  className?: string;
  /** 실행 중에 정해지는 크기(패널 최대 높이). 쓰는 곳(패널 층)이 화면 높이에 맞춰 넘긴다 */
  style?: CSSProperties;
};

/**
 * 작업 표시줄 검색에서 열리는 검색 패널(피그마 조립 `Search/Panel`)을 그린다.
 * 패널 크기와 재질은 ShellSurface가 정하고, 이 조립은 안쪽 여백과 본문 자리만 갖는다. 본문은 쓰는 쪽이 넣는다.
 * 열고 닫기와 입력은 기능을 구현할 때 붙인다.
 * @codocs [[디자인 시스템:조립]]
 * @codocs [[검색:개요]]
 * @codocs [[모바일:차이]]
 * @param props
 */
export function SearchPanel(props: SearchPanelProps): JSX.Element {
  const { device = 'desktop', searchBoxProps, children, className, style } = props;
  const isMobile = device === 'mobile';
  return (
    <ShellSurface material="acrylic" device={device} className={className} style={style}>
      {/* 피그마 `padding` 배치 프레임이다. 모바일은 입력칸과 본문 사이 간격 16을 둔다 */}
      <div
        className={
          isMobile
            ? 'flex size-full flex-col items-start gap-16 px-16 py-32'
            : 'flex size-full flex-col items-start gap-16 p-32'
        }
      >
        {isMobile && (
          <SearchBox {...searchBoxProps} appearance="pill" className="w-full shrink-0" />
        )}
        <div className="flex min-h-px w-full flex-1 flex-col">{children}</div>
      </div>
    </ShellSurface>
  );
}
