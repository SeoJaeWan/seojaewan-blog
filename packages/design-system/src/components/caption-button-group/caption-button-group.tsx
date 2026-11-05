import type { JSX, ReactNode } from 'react';

import { cn } from '../../cn';
import { CaptionButton } from '../caption-button/caption-button';

export type CaptionButtonGroupPlacement = 'default' | 'maximized' | 'snapped';

type CaptionButtonGroupProps = {
  placement?: CaptionButtonGroupPlacement;
  isInactive?: boolean;
  hasMaximize?: boolean;
  onMinimize?: () => void;
  onMaximize?: () => void;
  onRestore?: () => void;
  maximizeSlot?: ReactNode;
  onClose?: () => void;
  className?: string;
};

/**
 * 창 제목 표시줄 오른쪽의 최소화·최대화·닫기 버튼 묶음(피그마 CaptionButtonGroup)을 그린다.
 * 버튼은 CaptionButton 인스턴스를 가로로 이어 붙인다.
 * @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
 * @param props 컴포넌트 속성
 * @param props.placement 피그마 Placement. default·snapped는 최소화·최대화·닫기, maximized는 최대화 자리에 이전 크기로 복원 버튼이 온다
 * @param props.isInactive 피그마 State=Inactive. 창이 활성 상태가 아니면 버튼 아이콘을 흐리게 그린다
 * @param props.hasMaximize 최대화(또는 복원) 버튼을 그린다. 늘 전체화면인 모바일 창은 피그마 인스턴스에서 이 버튼 레이어를 숨겨 끈다
 * @param props.onMinimize 최소화 버튼을 눌렀을 때
 * @param props.onMaximize 최대화 버튼을 눌렀을 때(placement가 default, snapped일 때)
 * @param props.onRestore 이전 크기로 복원 버튼을 눌렀을 때(placement가 maximized일 때)
 * @param props.maximizeSlot 기본 최대화 버튼 대신 그릴 것(placement가 default, snapped일 때). 최대화 버튼에 마우스를 올리면 스냅 레이아웃을 여는 조립처럼 앱이 버튼을 바꿔 끼운다. 이때 onMaximize는 쓰이지 않는다
 * @param props.onClose 닫기 버튼을 눌렀을 때
 * @param props.className 바깥 배치용 클래스
 */
export function CaptionButtonGroup({
  placement = 'default',
  isInactive = false,
  hasMaximize = true,
  onMinimize: handleMinimize,
  onMaximize: handleMaximize,
  onRestore: handleRestore,
  maximizeSlot,
  onClose: handleClose,
  className,
}: CaptionButtonGroupProps): JSX.Element {
  const isMaximized = placement === 'maximized';
  return (
    <div className={cn('flex items-start', className)}>
      <CaptionButton label="최소화" isInactive={isInactive} onClick={handleMinimize} />
      {!hasMaximize ? null : isMaximized ? (
        <CaptionButton
          label="이전 크기로 복원"
          icon="icons/ic_fluent_square_multiple_20_regular.svg"
          isInactive={isInactive}
          onClick={handleRestore}
        />
      ) : maximizeSlot !== undefined ? (
        maximizeSlot
      ) : (
        <CaptionButton
          label="최대화"
          icon="icons/ic_fluent_maximize_20_regular.svg"
          isInactive={isInactive}
          onClick={handleMaximize}
        />
      )}
      <CaptionButton variant="close" label="닫기" isInactive={isInactive} onClick={handleClose} />
    </div>
  );
}
