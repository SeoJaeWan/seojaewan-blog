import { Menu } from '@base-ui/react/menu';
import { Checkmark20Regular } from '@fluentui/react-icons/svg/checkmark';
import { ChevronRight16Regular } from '@fluentui/react-icons/svg/chevron-right';
import type { JSX, ReactNode } from 'react';

import { mergeClassNames } from '../../merge-class-names';

type MenuItemCommonProps = {
  /** 항목 이름. 길면 한 줄로 말줄임한다 */
  label: string;
  /** 이름 앞 16px 아이콘. 확인·라디오 항목은 아이콘 자리에 선택 표시를 그린다 */
  icon?: ReactNode;
  /** 오른쪽에 보이는 단축키(예: `Ctrl+O`) */
  shortcut?: string;
  /** 고를 수 없게 한다 */
  disabled?: boolean;
  /** 덧붙이거나 덮어쓸 클래스 */
  className?: string;
};

type MenuItemProps = MenuItemCommonProps &
  (
    | {
        /** 피그마 Kind=Default. 누르면 onClick을 부르고 메뉴를 닫는다 */
        kind?: 'default';
        /** 항목을 골랐을 때 호출 */
        onClick?: () => void;
      }
    | {
        /** 피그마 Kind=Submenu. Menu.SubmenuRoot 안에 두고 하위 메뉴를 연다 */
        kind: 'submenu';
      }
    | {
        /** 피그마 Kind=Toggle on/off. 켜져 있으면 확인 표시를 그린다 */
        kind: 'checkbox';
        /** 켜짐 여부(제어) */
        checked?: boolean;
        /** 처음 켜짐 여부(비제어) */
        defaultChecked?: boolean;
        /** 켜짐 여부가 바뀔 때 호출 */
        onCheckedChange?: (checked: boolean) => void;
      }
    | {
        /** 피그마 Kind=Radio on/off. Menu.RadioGroup 안에 두며, 골라져 있으면 점을 그린다 */
        kind: 'radio';
        /** 라디오 묶음 안에서 이 항목의 값 */
        value: string;
      }
  );

// 행(32px) 안에 위아래 2·좌우 4 들여 쓴 28px 강조 영역(base)을 둔다.
const ROW_CLASS_NAME =
  'group flex h-menu-item-height w-full px-4 py-2 outline-none select-none cursor-default';
// 강조 영역의 상태 색이다. 마우스·키보드로 강조된 항목은 Base UI가 data-highlighted를 단다.
const baseClassName = [
  'flex min-w-0 flex-1 items-center gap-12 overflow-hidden rounded-control px-12 py-4',
  'bg-subtle-fill-transparent text-text-fill-primary transition-colors duration-faster ease-fade',
  'group-data-highlighted:bg-subtle-fill-secondary group-data-popup-open:bg-subtle-fill-secondary',
  'group-active:group-data-highlighted:bg-subtle-fill-tertiary group-active:group-data-highlighted:text-text-fill-secondary',
  'group-data-disabled:bg-subtle-fill-disabled group-data-disabled:text-text-fill-disabled',
].join(' ');
const SECONDARY_TEXT_CLASS_NAME =
  'text-text-fill-secondary group-data-disabled:text-text-fill-disabled';

/**
 * 메뉴 항목(피그마 MenuItem)을 그린다. Base UI Menu의 Popup 안에 둔다.
 * kind에 따라 Base UI의 Item, SubmenuTrigger, CheckboxItem, RadioItem이 키보드 조작과 접근성을 맡는다.
 * @codocs [[컴포넌트 목록:기본 컨트롤]]
 * @param props
 */
export function MenuItem(props: MenuItemProps): JSX.Element {
  const className = mergeClassNames(ROW_CLASS_NAME, props.className);
  const isDisabled = props.disabled ?? false;

  switch (props.kind) {
    case 'submenu':
      return (
        <Menu.SubmenuTrigger className={className} disabled={isDisabled} label={props.label}>
          <MenuItemContent {...props} leading={props.icon} />
        </Menu.SubmenuTrigger>
      );
    case 'checkbox':
      return (
        <Menu.CheckboxItem
          className={className}
          disabled={isDisabled}
          label={props.label}
          checked={props.checked}
          defaultChecked={props.defaultChecked}
          onCheckedChange={props.onCheckedChange}
        >
          <MenuItemContent
            {...props}
            leading={
              <Menu.CheckboxItemIndicator className="flex">
                <Checkmark20Regular className="size-icon-16" />
              </Menu.CheckboxItemIndicator>
            }
          />
        </Menu.CheckboxItem>
      );
    case 'radio':
      return (
        <Menu.RadioItem
          className={className}
          disabled={isDisabled}
          label={props.label}
          value={props.value}
        >
          <MenuItemContent
            {...props}
            leading={
              <Menu.RadioItemIndicator className="flex size-icon-16 items-center justify-center">
                <span className="size-6 rounded-circular bg-current" />
              </Menu.RadioItemIndicator>
            }
          />
        </Menu.RadioItem>
      );
    case 'default':
    case undefined:
      return (
        <Menu.Item
          className={className}
          disabled={isDisabled}
          label={props.label}
          onClick={props.onClick}
        >
          <MenuItemContent {...props} leading={props.icon} />
        </Menu.Item>
      );
  }
}

type MenuItemContentProps = MenuItemCommonProps & {
  /** 이름 앞 16px 자리에 그릴 내용. 확인·라디오 항목은 항상 자리를 둔다 */
  leading: ReactNode;
  /** 항목 종류 */
  kind?: 'default' | 'submenu' | 'checkbox' | 'radio';
};

/**
 * 강조 영역과 그 안의 아이콘·이름·단축키·꺾쇠를 그린다.
 * @param props
 */
function MenuItemContent(props: MenuItemContentProps): JSX.Element {
  const hasLeading =
    props.leading !== undefined || props.kind === 'checkbox' || props.kind === 'radio';
  return (
    <span className={baseClassName}>
      {hasLeading && (
        <span className="flex size-icon-16 shrink-0 items-center justify-center overflow-hidden">
          {props.leading}
        </span>
      )}
      <span className="min-w-0 flex-1 truncate type-body">{props.label}</span>
      {props.shortcut !== undefined && (
        <span className={mergeClassNames('shrink-0 type-caption', SECONDARY_TEXT_CLASS_NAME)}>
          {props.shortcut}
        </span>
      )}
      {props.kind === 'submenu' && (
        <ChevronRight16Regular
          className={mergeClassNames('size-icon-16 shrink-0', SECONDARY_TEXT_CLASS_NAME)}
        />
      )}
    </span>
  );
}
