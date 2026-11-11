import { Menu } from '@base-ui/react/menu';
import { Tooltip } from '@base-ui/react/tooltip';
import type { Meta, StoryObj } from '@storybook/react-vite';
import type { JSX, ReactNode } from 'react';
import { useState } from 'react';
import { expect, fn, waitFor } from 'storybook/test';

import menuCommandButtonExport from '../../../figma/components/menu-command-button/export.json';
import { FigmaFrame } from '../../story/figma-frame';
import { MenuCommandButton } from './menu-command-button';

// 피그마 MenuCommandButton의 변형 속성 값이다(정규화한 이름). Hover·Pressed는 캡처 도구가 마우스로 재현한다.
const STATES = ['rest', 'hover', 'pressed'] as const;

type FigmaArgs = {
  state: (typeof STATES)[number];
  /** 동작 스토리에서 호출 횟수를 확인하는 핸들러 */
  onClick?: () => void;
};

// Base UI 포커스 가드는 aria-hidden이면서 tabindex=0인 span이라 aria-hidden-focus에 걸린다. 외부 라이브러리 구조라 이 규칙만 끈다.
const baseUiFocusGuardParameters = {
  a11y: { config: { rules: [{ id: 'aria-hidden-focus', enabled: false }] } },
};

// Base UI 1.9.0 `Menu.Popup`은 실행 중에 `initialFocus`를 받지만 타입 선언에는 없어, 속성 객체로 넘겨 타입 검사를 지난다.
// 열릴 때 팝업으로 포커스가 옮겨 포커스 링이 그려지면 피그마 그림과 달라지므로 처음 포커스를 옮기지 않게 한다.
const noInitialFocus: Record<string, unknown> = { initialFocus: false };

// 캡처하는 동안 툴팁이 뜨지 않게 하는 지연(ms)이다.
const FIGMA_TOOLTIP_DELAY = 600_000;

// 호버 지연(Base UI 기본 600ms)보다 짧게 잡아, 이 시간 안에 뜬 툴팁은 포커스로 뜬 것으로 본다.
const HOVER_CHECK_MS = 300;

const meta = {
  title: 'Components/MenuCommandButton',
  args: { state: 'rest' },
  argTypes: {
    state: { control: 'inline-radio', options: STATES },
  },
  // 피그마 Hover 변형에는 툴팁이 없다. 마우스를 올려도 툴팁이 뜨지 않도록 지연을 크게 준다.
  // 툴팁이 뜨는 모습은 아래 동작 스토리가 확인한다.
  render: (args) => (
    <Tooltip.Provider delay={FIGMA_TOOLTIP_DELAY}>
      <OpenMenu args={args}>
        <MenuCommandButton label="명령" icon="icons/ic_fluent_open_20_regular.svg" />
      </OpenMenu>
    </Tooltip.Provider>
  ),
} satisfies Meta<FigmaArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형 하나를 args 하나로 고른다. Hover·Pressed는 캡처 도구가 마우스로 재현한다.
// MenuCommandButton은 열린 Base UI 메뉴 안에서만 동작하므로, 메뉴를 스토리 루트 안에 열고 단추 하나만 담는다.
export const Figma: Story = { parameters: baseUiFocusGuardParameters };

// @codocs [[디자인 시스템:팝업]]
/** 이름을 접근성 이름으로 갖는 menuitem이다. 고르면 onClick을 부르고, 마우스를 올리면 `이름 (단축키)` 툴팁을 보인다 */
export const Default: Story = {
  parameters: baseUiFocusGuardParameters,
  args: { onClick: fn() },
  render: ({ onClick: handleClick }) => (
    <OpenMenu>
      <MenuCommandButton
        label="잘라내기"
        icon="icons/ic_fluent_open_20_regular.svg"
        shortcut="Ctrl+X"
        onClick={handleClick}
      />
    </OpenMenu>
  ),
  play: async ({ args, canvas, userEvent, step }) => {
    const button = await canvas.findByRole('menuitem', { name: '잘라내기' });

    await step('마우스를 올리면 호버 지연 뒤에 이름과 단축키를 툴팁으로 보인다', async () => {
      await userEvent.hover(button);
      // 마우스로 강조해도 메뉴가 포커스를 옮기지만, 그 포커스로는 툴팁이 뜨지 않고 지연을 기다린다.
      await waitAbout(HOVER_CHECK_MS);
      await expect(button).toHaveFocus();
      await expect(document.body.querySelector('[role="tooltip"]')).toBeNull();
      await waitFor(
        async () => expect(document.body.querySelector('[role="tooltip"]')).not.toBeNull(),
        { timeout: 3000 },
      );
      await expect(document.body.querySelector('[role="tooltip"]')).toHaveTextContent(
        '잘라내기 (Ctrl+X)',
      );
    });

    await step('누르면 onClick을 부른다', async () => {
      await userEvent.click(button);
      await expect(args.onClick).toHaveBeenCalledTimes(1);
    });
  },
};

// @codocs [[컴포넌트 목록:기본 컨트롤]]
/** 단축키가 없으면 툴팁은 이름만 보인다 */
export const WithoutShortcut: Story = {
  parameters: baseUiFocusGuardParameters,
  render: () => (
    <OpenMenu>
      <MenuCommandButton label="삭제" icon="icons/ic_fluent_open_20_regular.svg" />
    </OpenMenu>
  ),
  play: async ({ canvas, userEvent }) => {
    const button = await canvas.findByRole('menuitem', { name: '삭제' });

    await userEvent.hover(button);

    await waitFor(
      async () =>
        expect(document.body.querySelector('[role="tooltip"]')).toHaveTextContent(/^삭제$/u),
      { timeout: 3000 },
    );
  },
};

// @codocs [[디자인 시스템:팝업]]
/** 키보드(방향키)로 단추에 닿으면 호버 지연 없이 바로 툴팁을 보인다 */
export const KeyboardFocus: Story = {
  parameters: baseUiFocusGuardParameters,
  render: () => (
    <OpenMenu>
      <MenuCommandButton label="복사" icon="icons/ic_fluent_open_20_regular.svg" />
      <MenuCommandButton
        label="잘라내기"
        icon="icons/ic_fluent_open_20_regular.svg"
        shortcut="Ctrl+X"
      />
    </OpenMenu>
  ),
  play: async ({ canvas, userEvent }) => {
    const copy = await canvas.findByRole('menuitem', { name: '복사' });
    copy.focus();

    await userEvent.keyboard('{ArrowDown}');

    await expect(canvas.getByRole('menuitem', { name: '잘라내기' })).toHaveFocus();
    // 호버 지연(Base UI 기본 600ms)보다 짧은 시간 안에 떠야 포커스로 뜬 것이다.
    await waitFor(
      async () =>
        expect(document.body.querySelector('[role="tooltip"]')).toHaveTextContent(
          '잘라내기 (Ctrl+X)',
        ),
      { timeout: HOVER_CHECK_MS },
    );
  },
};

/**
 * 주어진 시간만큼 기다린다.
 * @param ms 기다릴 시간(ms)
 */
async function waitAbout(ms: number): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * 스토리 루트 안에 열린 메뉴를 그린다. 단추 크기는 피그마 MenuCommandButton 원본의 크기(견본 크기)로 FigmaFrame이 준다.
 * @param props
 * @param props.args 피그마 변형을 고르는 스토리 args. 동작 스토리는 주지 않는다
 * @param props.children 메뉴 안에 둘 단추
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
                <FigmaFrame source={menuCommandButtonExport} args={props.args}>
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
