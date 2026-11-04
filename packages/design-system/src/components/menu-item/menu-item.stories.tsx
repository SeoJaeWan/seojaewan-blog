import { Menu } from '@base-ui/react/menu';
import type { Meta, StoryObj } from '@storybook/react-vite';
import type { JSX, ReactNode } from 'react';
import { useState } from 'react';
import { expect, fn } from 'storybook/test';

import menuItemExport from '../../../figma/components/menu-item/export.json';
import { FigmaFrame } from '../../story/figma-frame';
import { MenuItem } from './menu-item';

// 피그마 MenuItem의 변형 속성 값이다(정규화한 이름).
const VARIANTS = [
  'default',
  'submenu',
  'toggle-on',
  'toggle-off',
  'radio-on',
  'radio-off',
  'zoom',
] as const;
const STATES = ['rest', 'hover', 'pressed', 'disabled'] as const;
// 피그마 예시 글자다([[피그마 연동:스토리 규칙]]).
const LABEL = '메뉴 항목';
const SHORTCUT = 'Ctrl+O';

type FigmaArgs = {
  variant: (typeof VARIANTS)[number];
  state: (typeof STATES)[number];
  /** 피그마 BOOLEAN 속성 Has icon */
  hasIcon: boolean;
  /** 피그마 BOOLEAN 속성 Has shortcut */
  hasShortcut: boolean;
  /** 동작 스토리에서 호출 횟수를 확인하는 핸들러 */
  onClick?: () => void;
  /** 동작 스토리에서 확인 항목이 켜짐 여부를 알리는 핸들러 */
  onCheckedChange?: (checked: boolean) => void;
};

// Base UI 포커스 가드는 aria-hidden이면서 tabindex=0인 span이라 aria-hidden-focus에 걸린다. 외부 라이브러리 구조라 이 규칙만 끈다.
const baseUiFocusGuardParameters = {
  a11y: { config: { rules: [{ id: 'aria-hidden-focus', enabled: false }] } },
};

// Base UI 1.9.0 `Menu.Popup`은 실행 중에 `initialFocus`를 받지만 타입 선언에는 없어, 속성 객체로 넘겨 타입 검사를 지난다.
// 열릴 때 팝업으로 포커스가 옮겨 포커스 링이 그려지면 피그마 그림과 달라지므로 처음 포커스를 옮기지 않게 한다.
const noInitialFocus: Record<string, unknown> = { initialFocus: false };

const meta = {
  title: 'Components/MenuItem',
  args: { variant: 'default', state: 'rest', hasIcon: true, hasShortcut: false },
  argTypes: {
    variant: { control: 'inline-radio', options: VARIANTS },
    state: { control: 'inline-radio', options: STATES },
    hasIcon: { control: 'boolean' },
    hasShortcut: { control: 'boolean' },
  },
  render: (args) => (
    <OpenMenu args={args}>
      <FigmaMenuItem {...args} />
    </OpenMenu>
  ),
} satisfies Meta<FigmaArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형 하나를 args 하나로 고른다. Hover·Pressed는 캡처 도구가 마우스로 재현한다.
// MenuItem은 열린 Base UI 메뉴 안에서만 동작하므로, 메뉴를 스토리 루트 안에 열고 항목 하나만 담는다.
export const Figma: Story = { parameters: baseUiFocusGuardParameters };

// @codocs [[컴포넌트 목록:기본 컨트롤]]
/** 이름을 접근성 이름으로 갖는 menuitem이다. 고르면 onClick을 부르고 단축키를 보인다 */
export const Default: Story = {
  parameters: baseUiFocusGuardParameters,
  args: { onClick: fn() },
  render: ({ onClick: handleClick }) => (
    <OpenMenu>
      <MenuItem label="열기" shortcut="Ctrl+O" onClick={handleClick} />
    </OpenMenu>
  ),
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole('menuitem', { name: /열기/u }));

    await expect(args.onClick).toHaveBeenCalledTimes(1);
    await expect(canvas.getByText('Ctrl+O')).toBeInTheDocument();
  },
};

// @codocs [[컴포넌트 목록:기본 컨트롤]]
/** 확인 항목은 menuitemcheckbox이고 고르면 켜짐 여부가 바뀐다 */
export const Checkbox: Story = {
  parameters: baseUiFocusGuardParameters,
  args: { onCheckedChange: fn() },
  render: ({ onCheckedChange: handleCheckedChange }) => (
    <OpenMenu>
      <MenuItem
        variant="checkbox"
        label="숨김 항목"
        isDefaultChecked
        onCheckedChange={handleCheckedChange}
      />
    </OpenMenu>
  ),
  play: async ({ args, canvas, userEvent }) => {
    const item = await canvas.findByRole('menuitemcheckbox', { name: '숨김 항목' });
    await expect(item).toHaveAttribute('aria-checked', 'true');

    await userEvent.click(item);

    await expect(args.onCheckedChange).toHaveBeenCalledWith(false, expect.anything());
  },
};

// @codocs [[컴포넌트 목록:기본 컨트롤]]
/** 라디오 항목은 묶음의 값과 같으면 골라진 menuitemradio다 */
export const Radio: Story = {
  parameters: baseUiFocusGuardParameters,
  render: () => (
    <OpenMenu>
      <Menu.RadioGroup defaultValue="name">
        <MenuItem variant="radio" label="이름" value="name" />
        <MenuItem variant="radio" label="날짜" value="date" />
      </Menu.RadioGroup>
    </OpenMenu>
  ),
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('menuitemradio', { name: '이름' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await expect(canvas.getByRole('menuitemradio', { name: '날짜' })).toHaveAttribute(
      'aria-checked',
      'false',
    );
  },
};

// @codocs [[컴포넌트 목록:기본 컨트롤]]
/** 하위 메뉴 항목은 하위 메뉴를 가진 menuitem이다 */
export const Submenu: Story = {
  parameters: baseUiFocusGuardParameters,
  render: () => (
    <OpenMenu>
      <Menu.SubmenuRoot>
        <MenuItem variant="submenu" label="새로 만들기" />
      </Menu.SubmenuRoot>
    </OpenMenu>
  ),
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('menuitem', { name: '새로 만들기' })).toHaveAttribute(
      'aria-haspopup',
      'menu',
    );
  },
};

// @codocs [[Chrome:확대/축소]]
/** 확대/축소 줄은 −·+가 ↑↓로 닿는 menuitem이고, 눌러도 메뉴가 닫히지 않고 콜백을 부른다 */
export const Zoom: Story = {
  parameters: baseUiFocusGuardParameters,
  args: { onClick: fn() },
  render: ({ onClick: handleClick }) => (
    <OpenMenu>
      <MenuItem label="열기" onClick={handleClick} />
      <MenuItem variant="zoom" label="확대/축소" value="110%" isZoomInDisabled />
    </OpenMenu>
  ),
  play: async ({ canvas, userEvent, step }) => {
    const zoomOut = await canvas.findByRole('menuitem', { name: '축소' });
    const zoomIn = canvas.getByRole('menuitem', { name: '확대' });

    await step('배율 글자를 보이고 끝 단계의 버튼은 비활성이다', async () => {
      await expect(canvas.getByText('110%')).toBeInTheDocument();
      await expect(zoomIn).toHaveAttribute('aria-disabled', 'true');
      await expect(zoomOut).not.toHaveAttribute('aria-disabled', 'true');
    });

    await step('↑↓로 −·+에 닿고 누르면 메뉴를 닫지 않는다', async () => {
      canvas.getByRole('menuitem', { name: '열기' }).focus();
      await userEvent.keyboard('{ArrowDown}');
      await expect(zoomOut).toHaveFocus();
      await userEvent.keyboard('{Enter}');
      await expect(canvas.getByRole('menu')).toBeInTheDocument();
    });
  },
};

// @codocs [[컴포넌트 목록:기본 컨트롤]]
/** 비활성이면 골라도 onClick을 부르지 않는다 */
export const Disabled: Story = {
  parameters: baseUiFocusGuardParameters,
  args: { onClick: fn() },
  render: ({ onClick: handleClick }) => (
    <OpenMenu>
      <MenuItem label="열기" disabled onClick={handleClick} />
    </OpenMenu>
  ),
  play: async ({ args, canvas, userEvent }) => {
    const item = await canvas.findByRole('menuitem', { name: '열기' });

    await userEvent.click(item);

    await expect(item).toHaveAttribute('aria-disabled', 'true');
    await expect(args.onClick).not.toHaveBeenCalled();
  },
};

// @codocs [[컴포넌트 목록:기본 컨트롤]]
/** 래스터 자산 아이콘은 이미지로, SVG 아이콘은 svg로 그린다 */
export const Icons: Story = {
  parameters: baseUiFocusGuardParameters,
  render: () => (
    <OpenMenu>
      <MenuItem label="파일 탐색기" icon="images/app-file-explorer" />
      <MenuItem label="열기" icon="icons/ic_fluent_open_20_regular.svg" />
    </OpenMenu>
  ),
  play: async ({ canvas }) => {
    const appItem = await canvas.findByRole('menuitem', { name: '파일 탐색기' });
    const openItem = canvas.getByRole('menuitem', { name: '열기' });

    await expect(appItem.querySelector('img')).not.toBeNull();
    await expect(openItem.querySelector('svg')).not.toBeNull();
  },
};

// @codocs [[컴포넌트 목록:기본 컨트롤]]
/** 메뉴 밖에 홀로 둔(standalone) 항목은 버튼으로 그리고, 누르면 onClick을 부른다 */
export const Standalone: Story = {
  args: { onClick: fn() },
  render: ({ onClick: handleClick }) => (
    <MenuItem
      isStandalone
      label="열기"
      icon="icons/ic_fluent_open_20_regular.svg"
      onClick={handleClick}
    />
  ),
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: '열기' }));

    await expect(args.onClick).toHaveBeenCalledTimes(1);
  },
};

/**
 * 피그마 변형에 맞는 MenuItem을 그린다.
 * @param props 스토리 args
 */
function FigmaMenuItem(props: FigmaArgs): JSX.Element {
  const common = {
    label: LABEL,
    disabled: props.state === 'disabled',
    shortcut: props.hasShortcut ? SHORTCUT : undefined,
  };
  const icon = props.hasIcon ? ('icons/ic_fluent_open_20_regular.svg' as const) : undefined;
  switch (props.variant) {
    case 'default':
      return <MenuItem {...common} icon={icon} />;
    case 'submenu':
      return (
        <Menu.SubmenuRoot>
          <MenuItem {...common} variant="submenu" icon={icon} />
        </Menu.SubmenuRoot>
      );
    case 'toggle-on':
      return <MenuItem {...common} variant="checkbox" isDefaultChecked />;
    case 'toggle-off':
      return <MenuItem {...common} variant="checkbox" isDefaultChecked={false} />;
    case 'radio-on':
      return (
        <Menu.RadioGroup defaultValue={LABEL}>
          <MenuItem {...common} variant="radio" value={LABEL} />
        </Menu.RadioGroup>
      );
    case 'zoom':
      return <MenuItem {...common} variant="zoom" value="100%" />;
    case 'radio-off':
      // 묶음의 값이 이 항목과 달라 골라지지 않은 라디오 항목이다.
      return (
        <Menu.RadioGroup defaultValue="">
          <MenuItem {...common} variant="radio" value={LABEL} />
        </Menu.RadioGroup>
      );
  }
}

/**
 * 스토리 루트 안에 열린 메뉴를 그린다. 메뉴 너비는 피그마 MenuItem 원본의 너비(size/menu/width)로 FigmaFrame이 준다.
 * @param props
 * @param props.args 피그마 변형을 고르는 스토리 args. 동작 스토리는 주지 않는다
 * @param props.children 메뉴 항목
 */
function OpenMenu(props: {
  args?: Readonly<Record<string, unknown>>;
  children: ReactNode;
}): JSX.Element {
  const [anchor, setAnchor] = useState<HTMLDivElement | null>(null);
  return (
    <div ref={setAnchor}>
      {anchor !== null && (
        <Menu.Root open modal={false}>
          <Menu.Portal container={anchor}>
            <Menu.Positioner anchor={anchor} side="bottom" align="start" sideOffset={0}>
              {/* 포털 안에 그리므로 캡처 대상을 표시한다([[피그마 연동:스토리 규칙]]). */}
              <Menu.Popup {...noInitialFocus} data-parity-target>
                <FigmaFrame source={menuItemExport} args={props.args}>
                  {props.children}
                </FigmaFrame>
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      )}
    </div>
  );
}
