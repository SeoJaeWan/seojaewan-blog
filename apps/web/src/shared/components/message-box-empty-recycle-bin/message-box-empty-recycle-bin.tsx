import type { JSX, MouseEventHandler } from 'react';

import { MessageBox } from '@seojaewan/design-system';

/**
 * 휴지통 비우기 메시지 상자의 글자와 버튼. 휴지통 비우기는 실제로 지우지 않고 이 상자만 보여 주므로, 글자는 데이터가 아니라 조립의 일부다.
 * 조립(`MessageBoxEmptyRecycleBin`)과 모달로 띄우는 곳(`MessageBoxDialog`)이 같은 값을 쓴다.
 */
export const EMPTY_RECYCLE_BIN_MESSAGE = {
  buttons: 'one',
  title: '휴지통 비우기',
  message: '소중한 글이에요 지우지 말아주세요',
  primaryLabel: '확인',
} as const;

type MessageBoxEmptyRecycleBinProps = {
  /** 확인 버튼을 누르면 부른다 */
  onPrimaryClick?: MouseEventHandler<HTMLElement>;
  /** 바깥 배치 클래스 */
  className?: string;
};

/**
 * 휴지통 비우기를 눌렀을 때 보여 주는 메시지 상자(피그마 조립 MessageBox/EmptyRecycleBin)를 그린다.
 * 탐색기 기능에 있던 조립으로, 바탕화면의 휴지통 비우기가 함께 써서 shared에 둔다. 띄우는 위치와 막(모달)은 쓰는 곳이 정한다.
 * 앱은 `EMPTY_RECYCLE_BIN_MESSAGE`를 `MessageBoxDialog`에 넘겨 모달로 띄운다.
 * @codocs [[작업 공간:휴지통]]
 * @codocs [[디자인 시스템:조립]]
 * @param props
 */
export function MessageBoxEmptyRecycleBin(props: MessageBoxEmptyRecycleBinProps): JSX.Element {
  const { onPrimaryClick: handlePrimaryClick, className } = props;
  return (
    <MessageBox
      {...EMPTY_RECYCLE_BIN_MESSAGE}
      onPrimaryClick={handlePrimaryClick}
      className={className}
    />
  );
}
