import { Collapsible as BaseCollapsible } from "@base-ui/react/collapsible";
import { ChevronRight16Regular } from "@fluentui/react-icons";
import { clsx } from "clsx";

import type { CollapsibleUITriggerProps } from "../collapsibleUI.types";

/**
 * CollapsibleRootUI 안에서 Panel의 펼침 상태를 바꾸고 해당 Panel과 ARIA 관계를 맺는 button을 렌더링한다.
 *
 * CollapsibleTriggerUI는 항목 선택, tree 탐색 또는 Panel 콘텐츠의 의미를 소유하지 않는다.
 */
export function CollapsibleTriggerUI({
  children,
  className,
  type = "button",
  ref,
  ...props
}: CollapsibleUITriggerProps) {
  return (
    <BaseCollapsible.Trigger
      {...props}
      className={clsx("wd-collapsible-ui__trigger", className)}
      ref={ref}
      type={type}
    >
      <ChevronRight16Regular aria-hidden="true" className="wd-collapsible-ui__trigger-icon" />
      {children}
    </BaseCollapsible.Trigger>
  );
}
