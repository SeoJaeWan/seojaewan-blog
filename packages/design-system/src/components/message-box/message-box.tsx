import { type ComponentProps, type JSX, type MouseEventHandler, useId } from 'react';

import { cn } from '../../cn';
import { Button } from '../button/button';

export type MessageBoxButtons = 'one' | 'two';

type MessageBoxProps = Omit<ComponentProps<'div'>, 'children' | 'title'> & {
  /** 피그마 Buttons. one은 확인 버튼 하나, two는 확인과 취소 버튼이다 */
  buttons?: MessageBoxButtons;
  /** 피그마 Title. 대화 상자 제목이자 접근성 이름이다 */
  title: string;
  /** 피그마 Message. 제목 아래 본문이다 */
  message: string;
  /** 강조 버튼(피그마 primary button) 글자 */
  primaryLabel?: string;
  /** 기본 버튼(피그마 secondary button, Buttons=Two만) 글자 */
  secondaryLabel?: string;
  /** 강조 버튼을 누르면 부른다 */
  onPrimaryClick?: MouseEventHandler<HTMLElement>;
  /** 기본 버튼을 누르면 부른다 */
  onSecondaryClick?: MouseEventHandler<HTMLElement>;
};

/**
 * 확인·알림 대화 상자(피그마 MessageBox)를 그린다. 버튼은 Button 인스턴스이고, 띄우는 위치와 막(모달)은 쓰는 곳이 정한다.
 * 바탕 테두리는 피그마에서 레이아웃에 들어가지 않고 내용 위에 겹치므로 안쪽 선 고리(inner-border-*)로 그리고,
 * 버튼 줄의 위 구분선은 레이아웃에 들어가므로 CSS border로 그린다.
 * @codocs [[컴포넌트 목록:기본 컨트롤]]
 * @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
 * @param props
 */
export function MessageBox(props: MessageBoxProps): JSX.Element {
  const {
    buttons = 'one',
    title,
    message,
    primaryLabel = '확인',
    secondaryLabel = '취소',
    onPrimaryClick: handlePrimaryClick,
    onSecondaryClick: handleSecondaryClick,
    className,
    ...divProps
  } = props;
  const id = useId();
  const titleId = `${id}-title`;
  const messageId = `${id}-message`;
  return (
    <div
      role="alertdialog"
      aria-labelledby={titleId}
      aria-describedby={messageId}
      {...divProps}
      className={cn(
        'relative flex w-448 flex-col overflow-hidden rounded-overlay bg-solid-background-fill-base shadow-elevation-dialog',
        'inner-border-surface-stroke-default inner-border-w-default',
        className,
      )}
    >
      <div className="flex flex-col gap-12 self-stretch bg-layer-fill-alt p-24 break-words text-text-fill-primary">
        <h2 id={titleId} className="type-subtitle">
          {title}
        </h2>
        <p id={messageId} className="type-body">
          {message}
        </p>
      </div>
      <div className="flex items-start gap-8 self-stretch border-t-default border-card-stroke-default bg-solid-background-fill-base p-24">
        <Button
          variant="accent"
          label={primaryLabel}
          onClick={handlePrimaryClick}
          className="flex-1"
        />
        {buttons === 'two' && (
          <Button
            variant="standard"
            label={secondaryLabel}
            onClick={handleSecondaryClick}
            className="flex-1"
          />
        )}
      </div>
    </div>
  );
}
