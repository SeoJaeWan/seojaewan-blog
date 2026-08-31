"use client";

import { Select as BaseSelect } from "@base-ui/react/select";
import { clsx } from "clsx";

import type { SelectUILabelProps } from "../../selectUI.types";

/**
 * select trigger의 접근 가능한 이름을 제공하는 label part다. `Root` 안의 trigger와 Base UI label 관계로 조합된다.
 *
 * 오류 문구를 생성하거나 필드 유효성 및 애플리케이션 검증 상태를 관리하지 않는다.
 */
export function SelectLabelUI({ className, ref, ...props }: SelectUILabelProps) {
  return (
    <BaseSelect.Label {...props} className={clsx("wd-select-ui__label", className)} ref={ref} />
  );
}
