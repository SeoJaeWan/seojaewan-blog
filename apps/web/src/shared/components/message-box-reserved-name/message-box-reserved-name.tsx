import type { JSX, MouseEventHandler } from 'react';

import { MessageBox } from '@seojaewan/design-system';

/**
 * 예약된 장치 이름 메시지 상자의 글자와 버튼. 조립(`MessageBoxReservedName`)과 모달로 띄우는 곳(`MessageBoxDialog`)이 같은 값을 쓴다.
 */
export const RESERVED_NAME_MESSAGE = {
  buttons: 'one',
  title: '이름 바꾸기',
  message: '지정한 장치 이름이 잘못되었습니다.',
  primaryLabel: '확인',
} as const;

type MessageBoxReservedNameProps = {
  /** 확인 버튼을 누르면 부른다 */
  onPrimaryClick?: MouseEventHandler<HTMLElement>;
  /** 바깥 배치 클래스 */
  className?: string;
};

/**
 * 폴더 이름을 예약된 장치 이름으로 정했을 때 보여 주는 메시지 상자(피그마 조립 MessageBox/ReservedName)를 그린다.
 * 바탕화면과 탐색기가 폴더 이름 바꾸기에서 함께 써서 shared에 둔다. 띄우는 위치와 막(모달)은 쓰는 곳이 정한다.
 * @codocs [[작업 공간:폴더 이름]]
 * @codocs [[디자인 시스템:조립]]
 * @param props
 */
export function MessageBoxReservedName(props: MessageBoxReservedNameProps): JSX.Element {
  const { onPrimaryClick: handlePrimaryClick, className } = props;
  return (
    <MessageBox
      {...RESERVED_NAME_MESSAGE}
      onPrimaryClick={handlePrimaryClick}
      className={className}
    />
  );
}
