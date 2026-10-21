import { Menu } from '@base-ui/react/menu';
import { Open20Regular } from '@fluentui/react-icons/svg/open';
import type { Meta, StoryObj } from '@storybook/react-vite';
import type { JSX, ReactNode } from 'react';
import { useState } from 'react';

import { MenuItem } from './menu-item';

// 피그마 MenuItem의 변형 속성 값이다(정규화한 이름).
const KINDS = ['default', 'submenu', 'toggle-on', 'radio-on'] as const;
const STATES = ['rest', 'hover', 'pressed', 'disabled'] as const;
const LABEL = '열기';

type ParityArgs = {
  kind: (typeof KINDS)[number];
  state: (typeof STATES)[number];
};

const meta = {
  title: 'Components/MenuItem',
  args: { kind: 'default', state: 'rest' },
  argTypes: {
    kind: { control: 'inline-radio', options: KINDS },
    state: { control: 'inline-radio', options: STATES },
  },
  render: (args) => (
    <OpenMenu>
      <ParityMenuItem kind={args.kind} isDisabled={args.state === 'disabled'} />
    </OpenMenu>
  ),
} satisfies Meta<ParityArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 일치 검사:스토리 규칙]]
// 피그마 변형 하나를 args 하나로 고른다. Hover·Pressed는 비교 스크립트가 마우스로 재현한다.
// MenuItem은 열린 Base UI 메뉴 안에서만 동작하므로, 메뉴를 스토리 루트 안에 열고 항목 하나만 담은 팝업에
// data-parity-target을 단다. 팝업에는 여백이 없어 팝업 크기가 항목 크기와 같다.
export const Parity: Story = {};

/**
 * 피그마 변형에 맞는 MenuItem을 그린다.
 * @param props
 * @param props.kind 피그마 Kind
 * @param props.isDisabled 피그마 State=Disabled 여부
 */
function ParityMenuItem(props: { kind: ParityArgs['kind']; isDisabled: boolean }): JSX.Element {
  const common = { label: LABEL, disabled: props.isDisabled };
  const icon = <Open20Regular className="size-icon-16" />;
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
 * 스토리 루트 안에 열린 메뉴를 그린다. 메뉴 팝업은 스토리 루트 폭(피그마 노드 폭)을 따른다.
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
              <Menu.Popup
                data-parity-target
                className="outline-none"
                style={{ width: 'var(--anchor-width)' }}
              >
                {props.children}
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      )}
    </div>
  );
}
