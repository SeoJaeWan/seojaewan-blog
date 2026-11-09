import type { ComponentProps, JSX, MouseEventHandler } from 'react';

import { MessageBox } from '@seojaewan/design-system';

type MessageBoxPathNotFoundProps = {
  path: string;
  onPrimaryClick?: MouseEventHandler<HTMLElement>;
  className?: string;
};

/**
 * 주소창에 입력한 경로의 폴더를 찾지 못한 메시지 상자의 글자와 버튼을 만든다. 조립(`MessageBoxPathNotFound`)과 모달로 띄우는 곳이 같은 값을 쓴다.
 * @codocs [[파일 탐색기:주소창 편집]]
 * @param path 주소창에 입력한 글자
 * @returns 메시지 상자 속성
 */
export function getPathNotFoundMessage(
  path: string,
): Pick<ComponentProps<typeof MessageBox>, 'buttons' | 'title' | 'message' | 'primaryLabel'> {
  return {
    buttons: 'one',
    title: '파일 탐색기',
    message: `'${path}'을(를) 찾을 수 없습니다. 철자를 확인하고 다시 시도하세요.`,
    primaryLabel: '확인',
  };
}

/**
 * 주소창에 입력한 경로의 폴더를 찾지 못했을 때 알리는 메시지 상자(피그마 조립 MessageBox/PathNotFound)를 그린다.
 * 띄우는 위치와 막(모달)은 쓰는 곳이 정한다.
 * @codocs [[파일 탐색기:주소창 편집]]
 * @codocs [[디자인 시스템:조립]]
 * @param props 컴포넌트 속성
 * @param props.path 주소창에 입력한 글자. 메시지에 따옴표로 감싸 넣는다
 * @param props.onPrimaryClick 확인 버튼을 누르면 부른다
 * @param props.className 바깥 배치 클래스
 */
export function MessageBoxPathNotFound({
  path,
  onPrimaryClick: handlePrimaryClick,
  className,
}: MessageBoxPathNotFoundProps): JSX.Element {
  return (
    <MessageBox
      {...getPathNotFoundMessage(path)}
      onPrimaryClick={handlePrimaryClick}
      className={className}
    />
  );
}
