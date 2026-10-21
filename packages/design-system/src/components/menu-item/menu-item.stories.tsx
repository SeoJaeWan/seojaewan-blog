import { Menu } from '@base-ui/react/menu';
import type { Meta, StoryObj } from '@storybook/react-vite';
import type { JSX, ReactNode } from 'react';
import { useState } from 'react';

import { MenuItem } from './menu-item';

// 피그마 MenuItem의 변형 속성 값이다(정규화한 이름).
const KINDS = ['default', 'submenu', 'toggle-on', 'radio-on'] as const;
const STATES = ['rest', 'hover', 'pressed', 'disabled'] as const;
// 피그마 예시 글자다([[피그마 일치 검사:글자]]).
const LABEL = '열기';
const SHORTCUT = 'Ctrl+O';

type ParityArgs = {
  kind: (typeof KINDS)[number];
  state: (typeof STATES)[number];
  /** 피그마 BOOLEAN 속성 Show icon */
  showIcon: boolean;
  /** 피그마 BOOLEAN 속성 Show shortcut */
  showShortcut: boolean;
};

const meta = {
  title: 'Components/MenuItem',
  args: { kind: 'default', state: 'rest', showIcon: true, showShortcut: false },
  argTypes: {
    kind: { control: 'inline-radio', options: KINDS },
    state: { control: 'inline-radio', options: STATES },
    showIcon: { control: 'boolean' },
    showShortcut: { control: 'boolean' },
  },
  render: (args) => (
    <OpenMenu>
      <ParityMenuItem {...args} />
    </OpenMenu>
  ),
} satisfies Meta<ParityArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 일치 검사:스토리 규칙]]
// 피그마 변형 하나를 args 하나로 고른다. Hover·Pressed는 비교 스크립트가 마우스로 재현한다.
// MenuItem은 열린 Base UI 메뉴 안에서만 동작하므로, 메뉴를 스토리 루트 안에 열고 항목 하나만 담는다.
export const Parity: Story = {};

/**
 * 피그마 변형에 맞는 MenuItem을 그린다.
 * @param props 스토리 args
 */
function ParityMenuItem(props: ParityArgs): JSX.Element {
  const common = {
    label: LABEL,
    disabled: props.state === 'disabled',
    shortcut: props.showShortcut ? SHORTCUT : undefined,
  };
  const icon = props.showIcon ? ('icons/ic_fluent_open_20_regular.svg' as const) : undefined;
  switch (props.kind) {
    case 'default':
      return <MenuItem {...common} icon={icon} />;
    case 'submenu':
      return (
        <Menu.SubmenuRoot>
          <MenuItem {...common} kind="submenu" icon={icon} />
        </Menu.SubmenuRoot>
      );
    case 'toggle-on':
      return <MenuItem {...common} kind="checkbox" defaultChecked />;
    case 'radio-on':
      return (
        <Menu.RadioGroup defaultValue={LABEL}>
          <MenuItem {...common} kind="radio" value={LABEL} />
        </Menu.RadioGroup>
      );
  }
}

/**
 * 스토리 루트 안에 열린 메뉴를 그린다.
 * @param props
 * @param props.children 메뉴 항목
 */
function OpenMenu(props: { children: ReactNode }): JSX.Element {
  const [anchor, setAnchor] = useState<HTMLDivElement | null>(null);
  return (
    <div ref={setAnchor}>
      {anchor !== null && (
        <Menu.Root open modal={false}>
          <Menu.Portal container={anchor}>
            <Menu.Positioner anchor={anchor} side="bottom" align="start" sideOffset={0}>
              <Menu.Popup className="outline-none">{props.children}</Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      )}
    </div>
  );
}
