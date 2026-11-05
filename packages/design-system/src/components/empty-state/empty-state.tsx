import type { ComponentProps, JSX, MouseEventHandler } from 'react';

import { cn } from '../../cn';
import { Asset } from '../asset/asset';
import { Button } from '../button/button';

type EmptyStateProps = Omit<ComponentProps<'div'>, 'children'> & {
  heading: string;
  message: string;
  code: string;
  hasButton?: boolean;
  onReload?: MouseEventHandler<HTMLElement>;
};

/**
 * 내용을 보여 줄 수 없을 때의 안내(피그마 EmptyState)를 그린다. 새로고침 버튼은 Button 인스턴스다.
 * 너비는 쓰는 곳이 정한다(피그마 원본의 600은 미리보기 크기).
 * @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
 * @param props 컴포넌트 속성
 * @param props.heading 피그마 Heading. 안내 제목이다
 * @param props.message 피그마 Message. 제목 아래 설명이다
 * @param props.code 피그마 Code. 설명 아래 작은 오류 코드 글자다
 * @param props.hasButton 피그마 Has button. 새로고침 버튼을 그릴지 정한다
 * @param props.onReload 새로고침 버튼을 누르면 부른다
 * @param props.className 덧붙이거나 덮어쓸 클래스
 */
export function EmptyState({
  heading,
  message,
  code,
  hasButton = true,
  onReload: handleReload,
  className,
  ...divProps
}: EmptyStateProps): JSX.Element {
  return (
    <div {...divProps} className={cn('flex flex-col items-start gap-spacing-lg', className)}>
      <Asset
        name="icons/ic_fluent_document_20_regular.svg"
        className="size-size-icon-2xl shrink-shrink-none text-color-black-89"
      />
      <h2 className="self-stretch type-subtitle break-words text-color-black-89">{heading}</h2>
      <p className="self-stretch type-body break-words text-color-black-61">{message}</p>
      <p className="self-stretch type-caption break-words text-color-black-61">{code}</p>
      {hasButton && <Button variant="accent" label="새로고침" onClick={handleReload} />}
    </div>
  );
}
