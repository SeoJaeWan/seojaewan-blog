import type { JSX, MouseEventHandler } from 'react';

import { MessageBox } from '@seojaewan/design-system';

import { getTrashedItemMessage } from '@/shared/utils/trashed-item-message/trashed-item-message';

/**
 * 휴지통에 있는 글 메시지 상자의 글자와 버튼. 조립(`MessageBoxTrashedPost`)과 모달로 띄우는 곳(`MessageBoxDialog`)이 같은 값을 쓴다.
 * 탐색기 주소창의 휴지통 항목 상자와 같은 글자를 쓰도록 `getTrashedItemMessage`에서 만든다.
 */
export const trashedPostMessage = getTrashedItemMessage('post');

type MessageBoxTrashedPostProps = {
  onPrimaryClick?: MouseEventHandler<HTMLElement>;
  onSecondaryClick?: MouseEventHandler<HTMLElement>;
  className?: string;
};

/**
 * 휴지통에 있는 글을 주소로 열 때 복원할지 묻는 메시지 상자(피그마 조립 MessageBox/TrashedPost)를 그린다.
 * 띄우는 위치와 막(모달)은 쓰는 곳이 정한다.
 * @codocs [[Chrome:휴지통에 있는 글]]
 * @codocs [[디자인 시스템:조립]]
 * @param props 컴포넌트 속성
 * @param props.onPrimaryClick 복원 버튼을 누르면 부른다
 * @param props.onSecondaryClick 취소 버튼을 누르면 부른다
 * @param props.className 바깥 배치 클래스
 */
export function MessageBoxTrashedPost({
  onPrimaryClick: handlePrimaryClick,
  onSecondaryClick: handleSecondaryClick,
  className,
}: MessageBoxTrashedPostProps): JSX.Element {
  return (
    <MessageBox
      {...trashedPostMessage}
      onPrimaryClick={handlePrimaryClick}
      onSecondaryClick={handleSecondaryClick}
      className={className}
    />
  );
}
