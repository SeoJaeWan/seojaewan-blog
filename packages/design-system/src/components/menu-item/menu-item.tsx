import { Menu } from '@base-ui/react/menu';
import type { JSX, ReactNode } from 'react';

import type { SvgAssetName } from '../../assets/asset-data';
import { cn } from '../../cn';
import { Asset } from '../asset/asset';
import { IconButton } from '../icon-button/icon-button';
import { ImageAsset, type ImageAssetName } from '../image-asset/image-asset';

type MenuItemCommonProps = {
  label: string;
  icon?: SvgAssetName | ImageAssetName;
  shortcut?: string;
  isDisabled?: boolean;
  className?: string;
};

type MenuItemProps = MenuItemCommonProps &
  (
    | {
        variant?: 'default';
        isStandalone?: boolean;
        onClick?: () => void;
      }
    | {
        variant: 'submenu';
      }
    | {
        variant: 'checkbox';
        isChecked?: boolean;
        isDefaultChecked?: boolean;
        onCheckedChange?: (checked: boolean) => void;
      }
    | {
        variant: 'radio';
        value: string;
      }
    | {
        variant: 'zoom';
        value: string;
        onZoomOut?: () => void;
        onZoomIn?: () => void;
        isZoomOutDisabled?: boolean;
        isZoomInDisabled?: boolean;
      }
  );

// 행(피그마 MenuItem 루트). 위아래 2·좌우 4 들여 쓴 강조 영역(base)을 담는다.
const ROW_CLASS_NAME =
  'group flex w-full items-center justify-start px-spacing-xs py-spacing-2xs outline-none select-none cursor-default';

// 강조 영역(피그마 base)과 상태 색이다. 마우스·키보드로 강조된 항목은 Base UI가 data-highlighted를 단다.
// 피그마 Disabled는 바탕이 투명(subtle-fill/transparent)이고 글자만 흐리다.
const baseClassName = cn(
  'flex flex-flex-fill items-center justify-start gap-spacing-md self-stretch overflow-hidden rounded-radius-control px-spacing-md py-spacing-xs',
  'bg-color-white-0 text-color-black-89 motion-control-state',
  'group-data-highlighted:bg-color-black-4 group-data-popup-open:bg-color-black-4',
  'group-active:group-data-highlighted:bg-color-black-2 group-active:group-data-highlighted:text-color-black-61',
  'group-data-disabled:text-color-black-36',
);

// 메뉴 밖에 홀로 둔 항목(isStandalone)의 상태 색이다. Base UI 강조 대신 hover·focus-visible·active로 바꾼다.
const STANDALONE_BASE_CLASS_NAME =
  'group-enabled:group-hover:bg-color-black-4 group-focus-visible:bg-color-black-4 group-enabled:group-active:bg-color-black-2 group-enabled:group-active:text-color-black-61';

// 확대/축소 줄(Variant=Zoom)의 기본 아이콘이다.
const ZOOM_DEFAULT_ICON = 'icons/ic_fluent_zoom_in_20_regular.svg';

// 단축키·꺾쇠처럼 흐린 글자 색이다.
const SECONDARY_TEXT_CLASS_NAME = 'text-color-black-61 group-data-disabled:text-color-black-36';

/**
 * 메뉴 항목(피그마 MenuItem)을 그린다. Base UI Menu의 Popup 안에 둔다.
 * variant에 따라 Base UI의 Item, SubmenuTrigger, CheckboxItem, RadioItem이 키보드 조작과 접근성을 맡는다.
 * variant마다 받는 속성이 달라 공통 속성만 꺼내고, 나머지는 `variantProps`에 모아 variant로 좁힌다.
 * @codocs [[컴포넌트 목록:기본 컨트롤]]
 * @param props 컴포넌트 속성
 * @param props.label 항목 이름. 길면 한 줄로 말줄임한다
 * @param props.icon 이름 앞 16px 아이콘(피그마 Has icon). SVG 아이콘이나 앱 로고 같은 래스터 자산(`images/*`)을 넣는다.
 *   확인·라디오 항목은 아이콘 자리에 선택 표시를 그린다
 * @param props.shortcut 오른쪽에 보이는 단축키(예: `Ctrl+O`, 피그마 Has shortcut)
 * @param props.isDisabled 고를 수 없게 한다
 * @param props.className 덧붙이거나 덮어쓸 클래스
 * @param props.variant 항목 종류. `default`(피그마 Variant=Default)는 누르면 onClick을 부르고 메뉴를 닫는다.
 *   `submenu`(Variant=Submenu)는 Menu.SubmenuRoot 안에 두고 하위 메뉴를 연다.
 *   `checkbox`(Variant=Toggle on/off)는 켜져 있으면 확인 표시를 그린다.
 *   `radio`(Variant=Radio on/off)는 Menu.RadioGroup 안에 두며, 골라져 있으면 점을 그린다.
 *   `zoom`(Variant=Zoom)은 Chrome ⋮ 메뉴의 확대/축소 조절 줄이다. 이름 오른쪽에 지금 배율과 −·+ 버튼을 둔다.
 *   −·+는 Base UI 메뉴 항목이라 ↑↓로 닿고, 눌러도 메뉴가 닫히지 않는다
 * @param props.isStandalone (`default`) 메뉴 밖에 홀로 둔다. 검색 최고 일치 카드(BestMatchCard)의 동작 목록처럼
 *   Base UI 메뉴가 없는 곳에서 같은 모양의 버튼으로 그리고, 강조는 hover·focus-visible로 한다
 * @param props.onClick (`default`) 항목을 골랐을 때 호출
 * @param props.isChecked (`checkbox`) 켜짐 여부(제어)
 * @param props.isDefaultChecked (`checkbox`) 처음 켜짐 여부(비제어)
 * @param props.onCheckedChange (`checkbox`) 켜짐 여부가 바뀔 때 호출
 * @param props.value (`radio`) 라디오 묶음 안에서 이 항목의 값. (`zoom`) 지금 배율 글자(피그마 value, 예: `100%`)
 * @param props.onZoomOut (`zoom`) 줄이기(−)를 눌렀을 때 호출
 * @param props.onZoomIn (`zoom`) 키우기(+)를 눌렀을 때 호출
 * @param props.isZoomOutDisabled (`zoom`) 줄이기를 쓸 수 없게 한다(가장 작은 단계)
 * @param props.isZoomInDisabled (`zoom`) 키우기를 쓸 수 없게 한다(가장 큰 단계)
 */
export function MenuItem({
  label,
  icon,
  shortcut,
  isDisabled = false,
  className,
  ...variantProps
}: MenuItemProps): JSX.Element {
  const rowClassName = cn(ROW_CLASS_NAME, className);
  const leading = icon === undefined ? undefined : <MenuItemIcon name={icon} />;
  switch (variantProps.variant) {
    case 'submenu':
      return (
        <Menu.SubmenuTrigger className={rowClassName} disabled={isDisabled} label={label}>
          <MenuItemContent label={label} shortcut={shortcut} variant="submenu" leading={leading} />
        </Menu.SubmenuTrigger>
      );
    case 'zoom':
      return (
        <MenuZoomRow
          {...variantProps}
          label={label}
          icon={icon ?? ZOOM_DEFAULT_ICON}
          className={className}
        />
      );
    case 'checkbox': {
      const { isChecked, isDefaultChecked, onCheckedChange: handleCheckedChange } = variantProps;
      return (
        <Menu.CheckboxItem
          className={rowClassName}
          disabled={isDisabled}
          label={label}
          checked={isChecked}
          defaultChecked={isDefaultChecked}
          onCheckedChange={handleCheckedChange}
        >
          <MenuItemContent
            label={label}
            shortcut={shortcut}
            variant="checkbox"
            leading={
              <Menu.CheckboxItemIndicator className="flex">
                {/* 선택 표시는 16px 자리 가운데의 12px 연한 회색 글리프다. 누름 상태에도 색이 그대로다. */}
                <Asset
                  name="icons/ic_fluent_checkmark_20_regular.svg"
                  className="size-size-icon-xs text-color-black-45 group-data-disabled:text-color-black-36"
                />
              </Menu.CheckboxItemIndicator>
            }
          />
        </Menu.CheckboxItem>
      );
    }
    case 'radio':
      return (
        <Menu.RadioItem
          className={rowClassName}
          disabled={isDisabled}
          label={label}
          value={variantProps.value}
        >
          <MenuItemContent
            label={label}
            shortcut={shortcut}
            variant="radio"
            leading={
              <Menu.RadioItemIndicator className="flex">
                <span className="size-size-menu-item-bullet rounded-full bg-color-black-89 motion-control-state group-data-disabled:bg-color-black-36 group-active:group-data-highlighted:bg-color-black-61" />
              </Menu.RadioItemIndicator>
            }
          />
        </Menu.RadioItem>
      );
    case 'default':
    case undefined: {
      const { isStandalone = false, onClick: handleClick } = variantProps;
      if (isStandalone) {
        return (
          <button
            type="button"
            className={cn(rowClassName, 'text-left')}
            disabled={isDisabled}
            data-disabled={isDisabled ? '' : undefined}
            onClick={handleClick}
          >
            <MenuItemContent
              label={label}
              shortcut={shortcut}
              variant={variantProps.variant}
              leading={leading}
              stateClassName={STANDALONE_BASE_CLASS_NAME}
            />
          </button>
        );
      }
      return (
        <Menu.Item
          className={rowClassName}
          disabled={isDisabled}
          label={label}
          onClick={handleClick}
        >
          <MenuItemContent
            label={label}
            shortcut={shortcut}
            variant={variantProps.variant}
            leading={leading}
          />
        </Menu.Item>
      );
    }
  }
}

type MenuZoomRowProps = MenuItemCommonProps & {
  variant: 'zoom';
  value: string;
  onZoomOut?: () => void;
  onZoomIn?: () => void;
  isZoomOutDisabled?: boolean;
  isZoomInDisabled?: boolean;
};

/**
 * 확대/축소 줄(피그마 MenuItem `Variant=Zoom`)을 그린다. 줄 전체가 아니라 −·+ 버튼이 Base UI 메뉴 항목(`Menu.Item`)이라
 * ↑↓ 키로 닿고, `closeOnClick={false}`라 눌러도 메뉴가 닫히지 않는다. 실제 배율 동작은 쓰는 곳이 콜백과 값으로 잇는다.
 * @codocs [[컴포넌트 목록:기본 컨트롤]]
 * @codocs [[Chrome:확대/축소]]
 * @param props 컴포넌트 속성
 * @param props.label 항목 이름. 길면 한 줄로 말줄임한다
 * @param props.icon 이름 앞 16px 아이콘. MenuItem이 넘기며 기본은 확대 아이콘이다
 * @param props.value 지금 배율 글자(피그마 value, 예: `100%`)
 * @param props.onZoomOut 줄이기(−)를 눌렀을 때 호출
 * @param props.onZoomIn 키우기(+)를 눌렀을 때 호출
 * @param props.isZoomOutDisabled 줄이기를 쓸 수 없게 한다(가장 작은 단계)
 * @param props.isZoomInDisabled 키우기를 쓸 수 없게 한다(가장 큰 단계)
 * @param props.className 덧붙이거나 덮어쓸 클래스
 */
function MenuZoomRow({
  label,
  icon,
  value,
  onZoomOut: handleZoomOut,
  onZoomIn: handleZoomIn,
  isZoomOutDisabled = false,
  isZoomInDisabled = false,
  className,
}: MenuZoomRowProps): JSX.Element {
  return (
    <Menu.Group
      aria-label={label}
      className={cn(
        'flex w-full items-center justify-start px-spacing-xs py-spacing-none select-none',
        className,
      )}
    >
      <div className="flex flex-flex-fill items-center justify-start gap-spacing-md self-stretch pr-spacing-xs pl-spacing-md">
        <span className="flex size-size-icon-sm shrink-shrink-none items-center justify-center text-color-black-89">
          {icon !== undefined && <MenuItemIcon name={icon} />}
        </span>
        <span className="min-w-size-none flex-flex-fill truncate type-body text-color-black-89">
          {label}
        </span>
        <div className="flex shrink-shrink-none items-center justify-start gap-spacing-xs">
          <Menu.Item
            nativeButton
            closeOnClick={false}
            disabled={isZoomOutDisabled}
            onClick={handleZoomOut}
            render={
              <IconButton
                variant="subtle"
                label="축소"
                icon="icons/ic_fluent_subtract_20_regular.svg"
              />
            }
          />
          <span className="w-size-menu-item-value-width shrink-shrink-none text-center type-body text-color-black-89">
            {value}
          </span>
          <Menu.Item
            nativeButton
            closeOnClick={false}
            disabled={isZoomInDisabled}
            onClick={handleZoomIn}
            render={
              <IconButton variant="subtle" label="확대" icon="icons/ic_fluent_add_20_regular.svg" />
            }
          />
        </div>
      </div>
    </Menu.Group>
  );
}

/**
 * 아이콘 자리의 자산을 그린다. 래스터 자산(`images/*`)은 ImageAsset, 나머지는 SVG Asset으로 그린다.
 * @param props 컴포넌트 속성
 * @param props.name 자산 이름
 */
function MenuItemIcon({ name }: { name: SvgAssetName | ImageAssetName }): JSX.Element {
  if (isImageAssetName(name)) {
    return <ImageAsset name={name} className="size-size-icon-sm object-contain" />;
  }
  return <Asset name={name} className="size-size-icon-sm" />;
}

/**
 * 자산 이름이 래스터 자산인지 본다.
 * @param name 자산 이름
 * @returns 래스터 자산이면 true
 */
function isImageAssetName(name: SvgAssetName | ImageAssetName): name is ImageAssetName {
  return name.startsWith('images/');
}

type MenuItemContentProps = Pick<MenuItemCommonProps, 'label' | 'shortcut'> & {
  leading: ReactNode;
  variant?: 'default' | 'submenu' | 'checkbox' | 'radio';
  stateClassName?: string;
};

/**
 * 강조 영역과 그 안의 아이콘·이름·단축키·꺾쇠를 그린다.
 * @param props 컴포넌트 속성
 * @param props.label 항목 이름. 길면 한 줄로 말줄임한다
 * @param props.shortcut 오른쪽에 보이는 단축키
 * @param props.leading 이름 앞 16px 자리(피그마 base/leading)에 그릴 내용. 확인·라디오 항목은 항상 자리를 둔다
 * @param props.variant 항목 종류. `submenu`이면 오른쪽에 꺾쇠를 그린다
 * @param props.stateClassName 강조 영역에 덧붙일 상태 클래스
 */
function MenuItemContent({
  label,
  shortcut,
  leading,
  variant,
  stateClassName,
}: MenuItemContentProps): JSX.Element {
  return (
    <span className={cn(baseClassName, stateClassName)}>
      {leading !== undefined && (
        <span className="flex size-size-icon-sm shrink-shrink-none items-center justify-center overflow-hidden p-spacing-none">
          {leading}
        </span>
      )}
      <span className="min-w-size-none flex-flex-fill truncate type-body">{label}</span>
      {shortcut !== undefined && (
        <span className={cn('shrink-shrink-none type-caption', SECONDARY_TEXT_CLASS_NAME)}>
          {shortcut}
        </span>
      )}
      {variant === 'submenu' && (
        <Asset
          name="icons/ic_fluent_chevron_right_16_regular.svg"
          className={cn('size-size-icon-sm shrink-shrink-none', SECONDARY_TEXT_CLASS_NAME)}
        />
      )}
    </span>
  );
}
