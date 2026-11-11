import { Tabs } from '@base-ui/react/tabs';
import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ComponentProps } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';

import { ExplorerTab } from './explorer-tab';

// 피그마 ExplorerTab 기본 인스턴스(폴더 아이콘)다. Vite와 Next.js가 모두 파일 주소로 바꿔 준다.
const folderIcon = new URL('../../assets/images/file-folder.webp', import.meta.url).href;

// 피그마 ExplorerTab의 변형 속성 값이다(정규화한 이름).
const STATES = ['rest', 'hover', 'selected'] as const;

type FigmaArgs = {
  state: (typeof STATES)[number];
  /** 피그마 TEXT 속성 Title */
  title: string;
  /** 피그마 불리언 속성 Has separator */
  hasSeparator: boolean;
  onClick?: ComponentProps<typeof ExplorerTab>['onClick'];
  onClose?: ComponentProps<typeof ExplorerTab>['onClose'];
};

const meta = {
  title: 'Components/ExplorerTab',
  // 글자는 피그마 Title 속성의 기본값과 같아야 한다([[피그마 연동:스토리 규칙]]).
  args: { state: 'rest', title: '폴더 이름', hasSeparator: true },
  argTypes: {
    state: { control: 'inline-radio', options: STATES },
    title: { control: 'text' },
    hasSeparator: { control: 'boolean' },
  },
  // 탭은 tablist 안에서만 쓴다. 감싸는 요소는 크기를 더하지 않는다.
  render: (args) => {
    const { onClick: handleClick, onClose: handleClose } = args;
    return (
      <Tabs.Root value={args.state === 'selected' ? 0 : null}>
        <Tabs.List aria-label="탭">
          <ExplorerTab
            value={0}
            isSelected={args.state === 'selected'}
            title={args.title}
            hasSeparator={args.hasSeparator}
            icon={<img src={folderIcon} alt="" />}
            onClick={handleClick}
            onClose={handleClose}
          />
        </Tabs.List>
      </Tabs.Root>
    );
  },
} satisfies Meta<FigmaArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// @codocs [[디자인 시스템:아이콘 자리]]
// 피그마 변형 하나를 args 하나로 고른다.
export const Figma: Story = {};

// @codocs [[컴포넌트 목록:Windows 화면 요소]]
// @codocs [[디자인 시스템:아이콘 자리]]
export const Default: Story = {
  args: { title: '문서', onClick: fn(), onClose: fn() },
  play: async ({ args, canvasElement, step }) => {
    const canvas = within(canvasElement);
    const tab = canvas.getByRole('tab', { name: /문서/u });
    const closeButton = canvas.getByLabelText('탭 닫기');

    // @codocs [[컴포넌트 목록:Windows 화면 요소]]
    await step('기본은 선택되지 않은 탭이고 오른쪽 구분선을 그린다', async () => {
      await expect(tab).toHaveAttribute('aria-selected', 'false');
      await expect(tab.parentElement).toHaveAttribute('data-separator', 'true');
    });

    // @codocs [[컴포넌트 목록:Windows 화면 요소]]
    await step('닫기 버튼은 탭(role="tab") 안이 아니라 옆에 둔다', async () => {
      await expect(tab).not.toContainElement(closeButton);
    });

    // @codocs [[접근성:역할]]
    await step(
      '닫기 버튼은 마우스 전용이라 Tab으로 닿지 않고 보조 기술에 드러나지 않는다',
      async () => {
        await expect(closeButton).toHaveAttribute('tabindex', '-1');
        await expect(closeButton).toHaveAttribute('aria-hidden', 'true');
      },
    );

    // @codocs [[컴포넌트 목록:Windows 화면 요소]]
    await step('닫기 버튼은 onClose만 부르고 탭의 onClick은 부르지 않는다', async () => {
      await userEvent.click(closeButton);
      await expect(args.onClose).toHaveBeenCalledTimes(1);
      await expect(args.onClick).not.toHaveBeenCalled();
    });
  },
};

// @codocs [[컴포넌트 목록:Windows 화면 요소]]
export const Selected: Story = {
  args: { state: 'selected' },
  play: async ({ canvasElement, step }) => {
    const tab = within(canvasElement).getByRole('tab');

    // @codocs [[컴포넌트 목록:Windows 화면 요소]]
    await step('selected면 선택된 탭이고 오른쪽 구분선을 그리지 않는다', async () => {
      await expect(tab).toHaveAttribute('aria-selected', 'true');
      await expect(tab.parentElement).toHaveAttribute('data-separator', 'false');
    });
  },
};

// @codocs [[컴포넌트 목록:Windows 화면 요소]]
export const WithoutSeparator: Story = {
  args: { hasSeparator: false },
  play: async ({ canvasElement, step }) => {
    // @codocs [[컴포넌트 목록:Windows 화면 요소]]
    await step('hasSeparator=false면 선택되지 않은 탭도 구분선을 그리지 않는다', async () => {
      const tab = within(canvasElement).getByRole('tab');
      await expect(tab).toHaveAttribute('aria-selected', 'false');
      await expect(tab.parentElement).toHaveAttribute('data-separator', 'false');
    });
  },
};
