import { Menu } from '@base-ui/react/menu';
import type { JSX, ReactNode } from 'react';

import type { SvgAssetName } from '../../assets/asset-data';
import { mergeClassNames } from '../../merge-class-names';
import { Asset } from '../asset/asset';

type MenuItemCommonProps = {
  /** 항목 이름. 길면 한 줄로 말줄임한다 */
  label: string;
  /** 이름 앞 16px 아이콘(피그마 Show icon). 확인·라디오 항목은 아이콘 자리에 선택 표시를 그린다 */
  icon?: SvgAssetName;
  /** 오른쪽에 보이는 단축키(예: `Ctrl+O`, 피그마 Show shortcut) */
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

// 행(피그마 MenuItem 루트). 위아래 2·좌우 4 들여 쓴 강조 영역(base)을 담는다.
const ROW_CLASS_NAME =
  'group flex w-menu-item-width items-center justify-start px-4 py-2 outline-none select-none cursor-default';

// 강조 영역(피그마 base)과 상태 색이다. 마우스·키보드로 강조된 항목은 Base UI가 data-highlighted를 단다.
// 피그마 Disabled는 바탕이 투명(subtle-fill/transparent)이고 글자만 흐리다.
const baseClassName = [
  'flex flex-1 items-center justify-start gap-12 self-stretch overflow-hidden rounded-control px-12 py-4',
  'bg-subtle-fill-transparent text-text-fill-primary transition-colors duration-faster ease-fade',
  'group-data-highlighted:bg-subtle-fill-secondary group-data-popup-open:bg-subtle-fill-secondary',
  'group-active:group-data-highlighted:bg-subtle-fill-tertiary group-active:group-data-highlighted:text-text-fill-secondary',
  'group-data-disabled:text-text-fill-disabled',
].join(' ');

// 단축키·꺾쇠처럼 흐린 글자 색이다.
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
  // @codocs [[피그마 일치 검사:짝짓기]] 행이 피그마 MenuItem 변형 루트다.
  const rootProps = { 'data-figma-root': 'MenuItem' };
  const icon =
    props.icon === undefined ? undefined : (
      <Asset data-figma="base/leading/icon" name={props.icon} className="size-icon-16" />
    );
  switch (props.kind) {
    case 'submenu':
      return (
        <Menu.SubmenuTrigger
          {...rootProps}
          className={className}
          disabled={isDisabled}
          label={props.label}
        >
          <MenuItemContent {...props} leading={icon} />
        </Menu.SubmenuTrigger>
      );
    case 'checkbox':
      return (
        <Menu.CheckboxItem
          {...rootProps}
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
                <Asset
                  data-figma="base/leading/icon"
                  name="icons/ic_fluent_checkmark_20_regular.svg"
                  className="size-icon-16"
                />
              </Menu.CheckboxItemIndicator>
            }
          />
        </Menu.CheckboxItem>
      );
    case 'radio':
      return (
        <Menu.RadioItem
          {...rootProps}
          className={className}
          disabled={isDisabled}
          label={props.label}
          value={props.value}
        >
          <MenuItemContent
            {...props}
            leading={
              <Menu.RadioItemIndicator className="flex">
                <span
                  data-figma="base/leading/bullet"
                  className="size-menu-item-bullet rounded-full bg-text-fill-primary group-data-disabled:bg-text-fill-disabled group-active:group-data-highlighted:bg-text-fill-secondary"
                />
              </Menu.RadioItemIndicator>
            }
          />
        </Menu.RadioItem>
      );
    case 'default':
    case undefined:
      return (
        <Menu.Item
          {...rootProps}
          className={className}
          disabled={isDisabled}
          label={props.label}
          onClick={props.onClick}
        >
          <MenuItemContent {...props} leading={icon} />
        </Menu.Item>
      );
  }
}

type MenuItemContentProps = MenuItemCommonProps & {
  /** 이름 앞 16px 자리(피그마 base/leading)에 그릴 내용. 확인·라디오 항목은 항상 자리를 둔다 */
  leading: ReactNode;
  /** 항목 종류 */
  kind?: 'default' | 'submenu' | 'checkbox' | 'radio';
};

/**
 * 강조 영역과 그 안의 아이콘·이름·단축키·꺾쇠를 그린다.
 * data-figma는 피그마 MenuItem의 레이어 경로다([[피그마 일치 검사:짝짓기]]).
 * @param props
 */
function MenuItemContent(props: MenuItemContentProps): JSX.Element {
  return (
    <span data-figma="base" className={baseClassName}>
      {props.leading !== undefined && (
        <span
          data-figma="base/leading"
          className="flex size-icon-16 shrink-0 items-center justify-center overflow-hidden p-0"
        >
          {props.leading}
        </span>
      )}
      <span data-figma="base/label" className="min-w-0 flex-1 truncate type-body">
        {props.label}
      </span>
      {props.shortcut !== undefined && (
        <span
          data-figma="base/shortcut"
          className={mergeClassNames('shrink-0 type-caption', SECONDARY_TEXT_CLASS_NAME)}
        >
          {props.shortcut}
        </span>
      )}
      {props.kind === 'submenu' && (
        <Asset
          data-figma="base/chevron"
          name="icons/ic_fluent_chevron_right_16_regular.svg"
          className={mergeClassNames('size-icon-16 shrink-0', SECONDARY_TEXT_CLASS_NAME)}
        />
      )}
    </span>
  );
}
