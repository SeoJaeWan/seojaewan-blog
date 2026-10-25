import { Menu } from '@base-ui/react/menu';
import type { JSX, ReactNode } from 'react';

import type { SvgAssetName } from '../../assets/asset-data';
import { cn } from '../../cn';
import { Asset } from '../asset/asset';
import { ImageAsset, type ImageAssetName } from '../image-asset/image-asset';

type MenuItemCommonProps = {
  /** 항목 이름. 길면 한 줄로 말줄임한다 */
  label: string;
  /**
   * 이름 앞 16px 아이콘(피그마 Show icon). SVG 아이콘이나 앱 로고 같은 래스터 자산(`images/*`)을 넣는다.
   * 확인·라디오 항목은 아이콘 자리에 선택 표시를 그린다
   */
  icon?: SvgAssetName | ImageAssetName;
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
        /**
         * 메뉴 밖에 홀로 둔다. 검색 최고 일치 카드(BestMatchCard)의 동작 목록처럼 Base UI 메뉴가 없는 곳에서
         * 같은 모양의 버튼으로 그리고, 강조는 hover·focus-visible로 한다
         */
        standalone?: boolean;
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
  'group flex w-240 items-center justify-start px-4 py-2 outline-none select-none cursor-default';

// 강조 영역(피그마 base)과 상태 색이다. 마우스·키보드로 강조된 항목은 Base UI가 data-highlighted를 단다.
// 피그마 Disabled는 바탕이 투명(subtle-fill/transparent)이고 글자만 흐리다.
const baseClassName = [
  'flex flex-1 items-center justify-start gap-12 self-stretch overflow-hidden rounded-control px-12 py-4',
  'bg-subtle-fill-transparent text-text-fill-primary motion-control-state',
  'group-data-highlighted:bg-subtle-fill-secondary group-data-popup-open:bg-subtle-fill-secondary',
  'group-active:group-data-highlighted:bg-subtle-fill-tertiary group-active:group-data-highlighted:text-text-fill-secondary',
  'group-data-disabled:text-text-fill-disabled',
].join(' ');

// 메뉴 밖에 홀로 둔 항목(standalone)의 상태 색이다. Base UI 강조 대신 hover·focus-visible·active로 바꾼다.
const STANDALONE_BASE_CLASS_NAME =
  'group-enabled:group-hover:bg-subtle-fill-secondary group-focus-visible:bg-subtle-fill-secondary group-enabled:group-active:bg-subtle-fill-tertiary group-enabled:group-active:text-text-fill-secondary';

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
  const className = cn(ROW_CLASS_NAME, props.className);
  const isDisabled = props.disabled ?? false;
  const icon = props.icon === undefined ? undefined : <MenuItemIcon name={props.icon} />;
  switch (props.kind) {
    case 'submenu':
      return (
        <Menu.SubmenuTrigger className={className} disabled={isDisabled} label={props.label}>
          <MenuItemContent {...props} leading={icon} />
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
                <Asset name="icons/ic_fluent_checkmark_20_regular.svg" className="size-icon-16" />
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
              <Menu.RadioItemIndicator className="flex">
                <span className="size-6 rounded-full bg-text-fill-primary motion-control-state group-data-disabled:bg-text-fill-disabled group-active:group-data-highlighted:bg-text-fill-secondary" />
              </Menu.RadioItemIndicator>
            }
          />
        </Menu.RadioItem>
      );
    case 'default':
    case undefined:
      if (props.standalone === true) {
        return (
          <button
            type="button"
            className={cn(className, 'text-left')}
            disabled={isDisabled}
            data-disabled={isDisabled ? '' : undefined}
            onClick={props.onClick}
          >
            <MenuItemContent {...props} leading={icon} baseClassName={STANDALONE_BASE_CLASS_NAME} />
          </button>
        );
      }
      return (
        <Menu.Item
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

/**
 * 아이콘 자리의 자산을 그린다. 래스터 자산(`images/*`)은 ImageAsset, 나머지는 SVG Asset으로 그린다.
 * @param props
 * @param props.name 자산 이름
 */
function MenuItemIcon(props: { name: SvgAssetName | ImageAssetName }): JSX.Element {
  if (isImageAssetName(props.name)) {
    return <ImageAsset name={props.name} className="size-icon-16 object-contain" />;
  }
  return <Asset name={props.name} className="size-icon-16" />;
}

/**
 * 자산 이름이 래스터 자산인지 본다.
 * @param name 자산 이름
 * @returns 래스터 자산이면 true
 */
function isImageAssetName(name: SvgAssetName | ImageAssetName): name is ImageAssetName {
  return name.startsWith('images/');
}

type MenuItemContentProps = MenuItemCommonProps & {
  /** 이름 앞 16px 자리(피그마 base/leading)에 그릴 내용. 확인·라디오 항목은 항상 자리를 둔다 */
  leading: ReactNode;
  /** 항목 종류 */
  kind?: 'default' | 'submenu' | 'checkbox' | 'radio';
  /** 강조 영역에 덧붙일 상태 클래스 */
  baseClassName?: string;
};

/**
 * 강조 영역과 그 안의 아이콘·이름·단축키·꺾쇠를 그린다.
 * @param props
 */
function MenuItemContent(props: MenuItemContentProps): JSX.Element {
  return (
    <span className={cn(baseClassName, props.baseClassName)}>
      {props.leading !== undefined && (
        <span className="flex size-icon-16 shrink-0 items-center justify-center overflow-hidden p-0">
          {props.leading}
        </span>
      )}
      <span className="min-w-0 flex-1 truncate type-body">{props.label}</span>
      {props.shortcut !== undefined && (
        <span className={cn('shrink-0 type-caption', SECONDARY_TEXT_CLASS_NAME)}>
          {props.shortcut}
        </span>
      )}
      {props.kind === 'submenu' && (
        <Asset
          name="icons/ic_fluent_chevron_right_16_regular.svg"
          className={cn('size-icon-16 shrink-0', SECONDARY_TEXT_CLASS_NAME)}
        />
      )}
    </span>
  );
}
