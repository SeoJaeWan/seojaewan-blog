import type { JSX, ReactNode } from 'react';

import { cn } from '@seojaewan/design-system';

type WindowThumbnailProps = {
  width: number;
  height: number;
  scale: number;
  children: ReactNode;
  className?: string;
};

/**
 * 창 축소 화면(Snap Assist, 작업 표시줄 창 미리보기)에 넣을 실제 창을 CSS `scale`로 줄여 그린다.
 * 창은 원래 크기(width×height)로 배치한 뒤 왼쪽 위를 기준으로 줄이고, 바깥 상자는 줄인 크기를 차지한다.
 * 비율과 크기는 실행 중에 정해지는 값이라 토큰 클래스가 아닌 인라인 스타일로 준다.
 * 축소 화면은 보여 주기만 하므로 안의 창은 조작할 수 없고(`inert`) 보조 기술에도 숨긴다.
 * @codocs [[디자인 시스템:조립]]
 * @param props 컴포넌트 속성
 * @param props.width 실제 창의 너비(px). 줄이기 전 크기다
 * @param props.height 실제 창의 높이(px). 줄이기 전 크기다
 * @param props.scale 줄이는 비율. 창 크기와 넣을 자리에 따라 실행 중에 정해지므로 쓰는 곳이 넘긴다
 * @param props.children 줄여 그릴 실제 창 조립(`ChromeWindow`, `ExplorerWindow`). 상자가 넣은 창을 원래 크기(width×height)로 채운다
 * @param props.className 바깥 배치 클래스
 */
export function WindowThumbnail({
  width,
  height,
  scale,
  children,
  className,
}: WindowThumbnailProps): JSX.Element {
  return (
    <div
      aria-hidden
      inert
      className={cn('relative shrink-shrink-none', className)}
      style={{ width: width * scale, height: height * scale }}
    >
      <div
        className="absolute top-spacing-none left-spacing-none flex origin-top-left [&>*]:size-full"
        style={{ width, height, transform: `scale(${String(scale)})` }}
      >
        {children}
      </div>
    </div>
  );
}
