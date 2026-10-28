import type { JSX, MouseEventHandler } from 'react';

import { MessageBox } from '@seojaewan/design-system';

/**
 * 휴지통에 있는 글 메시지 상자의 글자와 버튼. 조립(`MessageBoxTrashedPost`)과 모달로 띄우는 곳(`MessageBoxDialog`)이 같은 값을 쓴다.
 */
export const TRASHED_POST_MESSAGE = {
  buttons: 'two',
  title: '휴지통에 있는 글',
  message: '이 글은 휴지통에 있어요. 복원하고 열까요?',
  primaryLabel: '복원',
  secondaryLabel: '취소',
} as const;

type MessageBoxTrashedPostProps = {
  /** 복원 버튼을 누르면 부른다 */
  onPrimaryClick?: MouseEventHandler<HTMLElement>;
  /** 취소 버튼을 누르면 부른다 */
  onSecondaryClick?: MouseEventHandler<HTMLElement>;
  /** 바깥 배치 클래스 */
  className?: string;
};

/**
 * 휴지통에 있는 글을 주소로 열 때 복원할지 묻는 메시지 상자(피그마 조립 MessageBox/TrashedPost)를 그린다.
 * 띄우는 위치와 막(모달)은 쓰는 곳이 정한다.
 * @codocs [[Chrome:휴지통에 있는 글]]
 * @codocs [[디자인 시스템:조립]]
 * @param props
 */
export function MessageBoxTrashedPost(props: MessageBoxTrashedPostProps): JSX.Element {
  const {
    onPrimaryClick: handlePrimaryClick,
    onSecondaryClick: handleSecondaryClick,
    className,
  } = props;
  return (
    <MessageBox
      {...TRASHED_POST_MESSAGE}
      onPrimaryClick={handlePrimaryClick}
      onSecondaryClick={handleSecondaryClick}
      className={className}
    />
  );
}
