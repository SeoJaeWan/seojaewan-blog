import type { JSX, ReactNode } from 'react';

type WindowThumbnailProps = {
  /** 실제 창의 너비(px). 줄이기 전 크기다 */
  width: number;
  /** 실제 창의 높이(px). 줄이기 전 크기다 */
  height: number;
  /** 줄이는 비율. 창 크기와 넣을 자리에 따라 실행 중에 정해지므로 쓰는 곳이 넘긴다 */
  scale: number;
  /** 줄여 그릴 실제 창 조립(`ChromeWindow`, `ExplorerWindow`). 이 상자의 원래 크기를 채우도록 `size-full`을 준다 */
  children: ReactNode;
  /** 바깥 배치 클래스 */
  className?: string;
};

/**
 * 창 축소 화면(Snap Assist, 작업 표시줄 창 미리보기)에 넣을 실제 창을 CSS `scale`로 줄여 그린다.
 * 창은 원래 크기(width×height)로 배치한 뒤 왼쪽 위를 기준으로 줄이고, 바깥 상자는 줄인 크기를 차지한다.
 * 비율과 크기는 실행 중에 정해지는 값이라 토큰 클래스가 아닌 인라인 스타일로 준다.
 * 축소 화면은 보여 주기만 하므로 안의 창은 조작할 수 없고(`inert`) 보조 기술에도 숨긴다.
 * @codocs [[디자인 시스템:조립]]
 * @param props
 */
export function WindowThumbnail(props: WindowThumbnailProps): JSX.Element {
  const { width, height, scale, children, className } = props;
  return (
    <div
      aria-hidden
      inert
      className={['relative shrink-0', className].filter(Boolean).join(' ')}
      style={{ width: width * scale, height: height * scale }}
    >
      <div
        className="absolute top-0 left-0 flex origin-top-left"
        style={{ width, height, transform: `scale(${String(scale)})` }}
      >
        {children}
      </div>
    </div>
  );
}
