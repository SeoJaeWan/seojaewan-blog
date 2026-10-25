import type { JSX } from 'react';

import { cn } from '../../cn';
import { CaptionButton } from '../caption-button/caption-button';

export type CaptionButtonGroupPlacement = 'normal' | 'maximized' | 'snapped';

type CaptionButtonGroupProps = {
  /** 피그마 Placement. normal·snapped는 최소화·최대화·닫기, maximized는 최대화 자리에 이전 크기로 복원 버튼이 온다 */
  placement?: CaptionButtonGroupPlacement;
  /** 피그마 State=Inactive. 창이 활성 상태가 아니면 버튼 아이콘을 흐리게 그린다 */
  inactive?: boolean;
  /** 최대화(또는 복원) 버튼을 그린다. 늘 전체화면인 모바일 창은 피그마 인스턴스에서 이 버튼 레이어를 숨겨 끈다 */
  showMaximize?: boolean;
  /** 최소화 버튼을 눌렀을 때 */
  onMinimize?: () => void;
  /** 최대화 버튼을 눌렀을 때(placement가 normal, snapped일 때) */
  onMaximize?: () => void;
  /** 이전 크기로 복원 버튼을 눌렀을 때(placement가 maximized일 때) */
  onRestore?: () => void;
  /** 닫기 버튼을 눌렀을 때 */
  onClose?: () => void;
  /** 바깥 배치용 클래스 */
  className?: string;
};

/**
 * 창 제목 표시줄 오른쪽의 최소화·최대화·닫기 버튼 묶음(피그마 CaptionButtonGroup)을 그린다.
 * 버튼은 CaptionButton 인스턴스를 가로로 이어 붙인다.
 * @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
 * @param props
 */
export function CaptionButtonGroup(props: CaptionButtonGroupProps): JSX.Element {
  const {
    placement = 'normal',
    inactive: isInactive = false,
    showMaximize: isMaximizeShown = true,
    onMinimize: handleMinimize,
    onMaximize: handleMaximize,
    onRestore: handleRestore,
    onClose: handleClose,
    className,
  } = props;
  const isMaximized = placement === 'maximized';
  return (
    <div className={cn('flex items-start', className)}>
      <CaptionButton label="최소화" inactive={isInactive} onClick={handleMinimize} />
      {!isMaximizeShown ? null : isMaximized ? (
        <CaptionButton
          label="이전 크기로 복원"
          icon="icons/ic_fluent_square_multiple_20_regular.svg"
          inactive={isInactive}
          onClick={handleRestore}
        />
      ) : (
        <CaptionButton
          label="최대화"
          icon="icons/ic_fluent_maximize_20_regular.svg"
          inactive={isInactive}
          onClick={handleMaximize}
        />
      )}
      <CaptionButton kind="close" label="닫기" inactive={isInactive} onClick={handleClose} />
    </div>
  );
}
