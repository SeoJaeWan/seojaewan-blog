import { Folder20Regular } from "@fluentui/react-icons";
import { clsx } from "clsx";

import { ComboboxUI } from "../../primitives/combobox";
import type { RouteInputUIProps } from "./windowUI.types";

/**
 * predefined route 후보를 입력으로 거르고 하나를 고르는 Window field다.
 *
 * ComboboxUI가 filtering, selection, keyboard와 popup mechanics를 소유한다. 후보 조회와 실제
 * route 실행은 소비자가 맡으며 callback은 ID와 native event를 노출하지 않는다.
 */
export const RouteInputUI = ({
  className,
  clearLabel = "경로 지우기",
  defaultInputValue,
  defaultOpen,
  defaultValue,
  disabled,
  emptyMessage = "일치하는 경로가 없습니다",
  inputValue,
  label,
  onInputValueChange,
  onOpenChange,
  onValueChange,
  open,
  options,
  placeholder = "경로 찾기",
  readOnly,
  shape = "rounded",
  showSuggestionsLabel = "경로 후보 보기",
  value,
  ...props
}: RouteInputUIProps) => (
  <div {...props} className={clsx("wd-route-input-ui", className)} data-shape={shape}>
    <ComboboxUI.Root
      defaultInputValue={defaultInputValue}
      defaultOpen={defaultOpen}
      defaultValue={defaultValue}
      disabled={disabled}
      inputValue={inputValue}
      items={options}
      onInputValueChange={(nextInputValue, details) =>
        onInputValueChange?.({ inputValue: nextInputValue, reason: details.reason })
      }
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
      <ComboboxUI.Label className="wd-window-ui__visually-hidden">{label}</ComboboxUI.Label>
      <ComboboxUI.InputGroup className="wd-route-input-ui__control">
        <span aria-hidden="true" className="wd-route-input-ui__icon">
          <Folder20Regular aria-hidden="true" />
        </span>
        <ComboboxUI.Input
          aria-label={label}
          className="wd-route-input-ui__input"
          placeholder={placeholder}
        />
        <ComboboxUI.Clear aria-label={clearLabel} keepMounted />
        <ComboboxUI.Trigger aria-label={showSuggestionsLabel} />
      </ComboboxUI.InputGroup>
      <ComboboxUI.Content className="wd-route-input-ui__content">
        <ComboboxUI.List />
        <ComboboxUI.Empty>{emptyMessage}</ComboboxUI.Empty>
      </ComboboxUI.Content>
    </ComboboxUI.Root>
  </div>
);
