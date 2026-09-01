import { Tag16Regular } from "@fluentui/react-icons";
import { clsx } from "clsx";

import { SelectUI } from "../../primitives/select";
import type { TagInputUIProps } from "./windowUI.types";

/**
 * predefined tag 하나를 입력 없이 선택하는 Window field다.
 *
 * SelectUI가 selection, keyboard와 popup mechanics를 소유한다. tag 조회, 다중 선택과 결과
 * filtering 정책은 소비자가 맡으며 callback은 ID와 native event를 노출하지 않는다.
 */
export const TagInputUI = ({
  className,
  clearLabel = "태그 선택 지우기",
  defaultOpen,
  defaultValue,
  disabled,
  label,
  onOpenChange,
  onValueChange,
  open,
  options,
  placeholder = "태그 선택",
  readOnly,
  value,
  ...props
}: TagInputUIProps) => (
  <div {...props} className={clsx("wd-tag-input-ui", className)}>
    <SelectUI.Root
      defaultOpen={defaultOpen}
      defaultValue={defaultValue}
      disabled={disabled}
      items={options}
      onOpenChange={(nextOpen, details) =>
        onOpenChange?.({ open: nextOpen, reason: details.reason })
      }
      onValueChange={(nextValue, details) =>
        onValueChange?.({ reason: details.reason, value: nextValue })
      }
      open={open}
      readOnly={readOnly}
      value={value}
    >
      <SelectUI.Label className="wd-window-ui__visually-hidden">{label}</SelectUI.Label>
      <SelectUI.Control className="wd-tag-input-ui__control">
        <SelectUI.Trigger aria-label={label} className="wd-tag-input-ui__trigger">
          <span aria-hidden="true" className="wd-tag-input-ui__icon">
            <Tag16Regular aria-hidden="true" />
          </span>
          <SelectUI.Value placeholder={placeholder} />
        </SelectUI.Trigger>
        <SelectUI.Clear aria-label={clearLabel} />
      </SelectUI.Control>
      <SelectUI.Content className="wd-tag-input-ui__content">
        <SelectUI.List>
          {options.map((option) => (
            <SelectUI.Item disabled={option.disabled} key={option.value} value={option.value}>
              {option.label}
            </SelectUI.Item>
          ))}
        </SelectUI.List>
      </SelectUI.Content>
    </SelectUI.Root>
  </div>
);
