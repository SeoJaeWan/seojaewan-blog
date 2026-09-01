"use client";

import { useContext } from "react";

import { clsx } from "clsx";

import type { ComboboxUILabelProps } from "../../comboboxUI.types";
import { ComboboxUIContext } from "../../comboboxUIContext";

/**
 * combobox 입력의 접근 가능한 이름을 제공하는 label part다. `Root`가 만든 입력 식별자를 기본 `htmlFor`로 연결한다.
 *
 * 오류 문구를 생성하거나 필드 유효성 및 애플리케이션 검증 상태를 관리하지 않는다.
 */
export function ComboboxLabelUI({ className, htmlFor, ref, ...props }: ComboboxUILabelProps) {
  const { inputId } = useContext(ComboboxUIContext);

  return (
    <label
      {...props}
      className={clsx("wd-combobox-ui__label", className)}
      htmlFor={htmlFor ?? inputId}
      ref={ref}
    />
  );
}
