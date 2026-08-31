import type { ReactElement } from "react";

import { Button as BaseButton } from "@base-ui/react/button";
import { clsx } from "clsx";

import type { ButtonUIAnchorProps, ButtonUIProps } from "./buttonUI.types";

import "./buttonUI.css";

/**
 * 텍스트나 콘텐츠로 목적을 드러내는 일반 작업에는 ButtonUI를 사용한다.
 *
 * 아이콘만 보이는 작업의 접근 가능한 이름은 IconButtonUI가 맡으며, ButtonUI는 활성화 뒤 실행할 애플리케이션 동작을 결정하지 않는다.
 */
interface ButtonUIComponent {
  (props: ButtonUIAnchorProps): ReactElement;
  (props: ButtonUIProps): ReactElement;
}

export const ButtonUI: ButtonUIComponent = (props: ButtonUIAnchorProps | ButtonUIProps) => {
  if (props.render === "anchor") {
    const {
      className,
      disabled = false,
      onClick,
      ref,
      render: _render,
      tabIndex,
      ...anchorProps
    } = props;

    return (
      <a
        {...anchorProps}
        aria-disabled={disabled || undefined}
        className={clsx("wd-button-ui", className)}
        data-disabled={disabled ? "" : undefined}
        onClick={
          disabled
            ? (event) => {
                event.preventDefault();
                event.stopPropagation();
              }
            : onClick
        }
        ref={ref}
        tabIndex={disabled ? -1 : tabIndex}
      />
    );
  }

  const { className, render: _render, type = "button", ...buttonProps } = props;

  return <BaseButton {...buttonProps} className={clsx("wd-button-ui", className)} type={type} />;
};
