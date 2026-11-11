import { Menu } from '@base-ui/react/menu';
import { Tooltip } from '@base-ui/react/tooltip';
import type { Meta, StoryObj } from '@storybook/react-vite';
import type { JSX, ReactNode } from 'react';
import { useState } from 'react';
import { expect, fn } from 'storybook/test';

import menuCommandBarExport from '../../../figma/components/menu-command-bar/export.json';
import { FigmaFrame } from '../../story/figma-frame';
import { MenuCommandButton } from '../menu-command-button/menu-command-button';
import { MenuCommandBar } from './menu-command-bar';

// Base UI 포커스 가드는 aria-hidden이면서 tabindex=0인 span이라 aria-hidden-focus에 걸린다. 외부 라이브러리 구조라 이 규칙만 끈다.
const baseUiFocusGuardParameters = {
  a11y: { config: { rules: [{ id: 'aria-hidden-focus', enabled: false }] } },
};

// Base UI 1.9.0 `Menu.Popup`은 실행 중에 `initialFocus`를 받지만 타입 선언에는 없어, 속성 객체로 넘겨 타입 검사를 지난다.
// 열릴 때 팝업으로 포커스가 옮겨 포커스 링이 그려지면 피그마 그림과 달라지므로 처음 포커스를 옮기지 않게 한다.
const noInitialFocus: Record<string, unknown> = { initialFocus: false };

type FigmaArgs = {
  /** 동작 스토리에서 호출 횟수를 확인하는 핸들러 */
  onClick?: () => void;
};

const meta = {
  title: 'Components/MenuCommandBar',
  // 피그마 Items 슬롯 기본 내용은 MenuCommandButton 셋이다([[디자인 시스템:컴포넌트 조립 규칙]]).
  render: () => (
    <OpenMenu>
      <MenuCommandBar>
        <MenuCommandButton label="명령" icon="icons/ic_fluent_open_20_regular.svg" />
        <MenuCommandButton label="명령" icon="icons/ic_fluent_open_20_regular.svg" />
        <MenuCommandButton label="명령" icon="icons/ic_fluent_open_20_regular.svg" />
      </MenuCommandBar>
    </OpenMenu>
  ),
} satisfies Meta<FigmaArgs>;

export default meta;

type Story = StoryObj<FigmaArgs>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형 하나(Default)를 고른다. MenuCommandBar는 열린 Base UI 메뉴 안에서만 동작하므로, 메뉴를 스토리 루트 안에 열고 줄 하나만 담는다.
export const Figma: Story = { parameters: baseUiFocusGuardParameters };

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
/** 단추들을 가로로 놓고 사이마다 세로 구분선을 둔다. 단추는 각자 menuitem이라 고르면 onClick을 부른다 */
export const Default: Story = {
  parameters: baseUiFocusGuardParameters,
  args: { onClick: fn() },
  render: ({ onClick: handleClick }) => (
    <OpenMenu>
      <MenuCommandBar>
        <MenuCommandButton
          label="잘라내기"
          icon="icons/ic_fluent_open_20_regular.svg"
          shortcut="Ctrl+X"
          onClick={handleClick}
        />
        <MenuCommandButton label="복사" icon="icons/ic_fluent_open_20_regular.svg" />
        <MenuCommandButton label="삭제" icon="icons/ic_fluent_open_20_regular.svg" />
      </MenuCommandBar>
    </OpenMenu>
  ),
  play: async ({ args, canvas, userEvent, step }) => {
    const cut = await canvas.findByRole('menuitem', { name: '잘라내기' });

    await step('단추 사이에 세로 구분선이 둘 있다', async () => {
      const separators = canvas.getAllByRole('separator');
      await expect(separators).toHaveLength(2);
      for (const separator of separators) {
        await expect(separator).toHaveAttribute('aria-orientation', 'vertical');
      }
    });

    await step('↓로 다음 단추에 닿는다', async () => {
      cut.focus();
      await userEvent.keyboard('{ArrowDown}');
      await expect(canvas.getByRole('menuitem', { name: '복사' })).toHaveFocus();
    });

    await step('단추를 고르면 onClick을 부른다', async () => {
      await userEvent.click(cut);
      await expect(args.onClick).toHaveBeenCalledTimes(1);
    });
  },
};

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
/** 단추가 하나면 구분선이 없다 */
export const SingleButton: Story = {
  parameters: baseUiFocusGuardParameters,
  render: () => (
    <OpenMenu>
      <MenuCommandBar>
        <MenuCommandButton label="삭제" icon="icons/ic_fluent_open_20_regular.svg" />
      </MenuCommandBar>
    </OpenMenu>
  ),
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('menuitem', { name: '삭제' })).toBeInTheDocument();
    await expect(canvas.queryByRole('separator')).toBeNull();
  },
};

/**
 * 스토리 루트 안에 열린 메뉴를 그린다. 단추 줄의 크기는 피그마 MenuCommandBar 원본의 크기(견본 크기)로 FigmaFrame이 준다.
 * 마우스를 올려도 툴팁이 캡처에 끼지 않도록 툴팁 지연을 크게 둔다. 툴팁이 뜨는 모습은 MenuCommandButton 스토리가 확인한다.
 * @param props
 * @param props.children 메뉴 안에 둘 단추 줄
 */
function OpenMenu(props: { children: ReactNode }): JSX.Element {
  const [anchor, setAnchor] = useState<HTMLDivElement | null>(null);
  return (
    <div ref={setAnchor}>
      {anchor !== null && (
        <Tooltip.Provider delay={600_000}>
          <Menu.Root open modal={false}>
            <Menu.Portal container={anchor}>
              <Menu.Positioner anchor={anchor} side="bottom" align="start" sideOffset={0}>
                {/* 포털 안에 그리므로 캡처 대상을 표시한다([[피그마 연동:스토리 규칙]]). */}
                <Menu.Popup {...noInitialFocus} data-parity-target>
                  <FigmaFrame source={menuCommandBarExport}>{props.children}</FigmaFrame>
                </Menu.Popup>
              </Menu.Positioner>
            </Menu.Portal>
          </Menu.Root>
        </Tooltip.Provider>
      )}
    </div>
  );
}
