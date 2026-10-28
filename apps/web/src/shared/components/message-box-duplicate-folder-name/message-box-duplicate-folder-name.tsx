import type { JSX, MouseEventHandler } from 'react';

import { MessageBox } from '@seojaewan/design-system';

/**
 * 같은 이름의 폴더가 있을 때 메시지 상자의 글자와 버튼. 조립(`MessageBoxDuplicateFolderName`)과 모달로 띄우는 곳(`MessageBoxDialog`)이 같은 값을 쓴다.
 */
export const DUPLICATE_FOLDER_NAME_MESSAGE = {
  buttons: 'one',
  title: '이름 바꾸기',
  message: '이 위치에 같은 이름의 폴더가 이미 있습니다.',
  primaryLabel: '확인',
} as const;

type MessageBoxDuplicateFolderNameProps = {
  /** 확인 버튼을 누르면 부른다 */
  onPrimaryClick?: MouseEventHandler<HTMLElement>;
  /** 바깥 배치 클래스 */
  className?: string;
};

/**
 * 같은 위치에 같은 이름의 폴더가 있을 때 보여 주는 메시지 상자(피그마 조립 MessageBox/DuplicateFolderName)를 그린다.
 * 바탕화면과 탐색기가 폴더 이름 바꾸기에서 함께 써서 shared에 둔다. 띄우는 위치와 막(모달)은 쓰는 곳이 정한다.
 * @codocs [[작업 공간:폴더 이름]]
 * @codocs [[디자인 시스템:조립]]
 * @param props
 */
export function MessageBoxDuplicateFolderName(
  props: MessageBoxDuplicateFolderNameProps,
): JSX.Element {
  const { onPrimaryClick: handlePrimaryClick, className } = props;
  return (
    <MessageBox
      {...DUPLICATE_FOLDER_NAME_MESSAGE}
      onPrimaryClick={handlePrimaryClick}
      className={className}
    />
  );
}
