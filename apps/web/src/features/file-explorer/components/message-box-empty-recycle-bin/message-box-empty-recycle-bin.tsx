import type { JSX, MouseEventHandler } from 'react';

import { MessageBox } from '@seojaewan/design-system';

type MessageBoxEmptyRecycleBinProps = {
  /** 확인 버튼을 누르면 부른다 */
  onPrimaryClick?: MouseEventHandler<HTMLElement>;
  /** 바깥 배치 클래스 */
  className?: string;
};

/**
 * 휴지통 비우기를 눌렀을 때 보여 주는 메시지 상자(피그마 조립 MessageBox/EmptyRecycleBin)를 그린다.
 * 휴지통 비우기는 실제로 지우지 않고 이 상자만 보여 주므로, 제목·본문·버튼 글자는 데이터가 아니라 조립의 일부다.
 * 띄우는 위치와 막(모달)은 쓰는 곳이 정한다.
 * @codocs [[작업 공간:휴지통]]
 * @codocs [[디자인 시스템:조립]]
 * @param props
 */
export function MessageBoxEmptyRecycleBin(props: MessageBoxEmptyRecycleBinProps): JSX.Element {
  const { onPrimaryClick: handlePrimaryClick, className } = props;
  return (
    <MessageBox
      buttons="one"
      title="휴지통 비우기"
      message="소중한 글이에요 지우지 말아주세요"
      primaryLabel="확인"
      onPrimaryClick={handlePrimaryClick}
      className={className}
    />
  );
}
