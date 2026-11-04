import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ComponentProps } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';

import browserToolbarExport from '../../../figma/components/browser-toolbar/export.json';
import { figmaFrame } from '../../story/figma-frame';
import { BrowserToolbar } from './browser-toolbar';

const meta = {
  title: 'Components/BrowserToolbar',
  // 피그마 BrowserToolbar는 변형이 없다.
  // 컴포넌트는 너비를 갖지 않고 쓰는 곳이 정한다. FigmaFrame이 피그마 원본의 미리보기 너비로 감싼다.
  decorators: [figmaFrame(browserToolbarExport)],
  render: (args) => {
    const {
      onBack: handleBack,
      onForward: handleForward,
      onRefresh: handleRefresh,
      onMenu: handleMenu,
      onUrlChange: handleUrlChange,
      ...props
    } = args;
    return (
      <BrowserToolbar
        {...props}
        onBack={handleBack}
        onForward={handleForward}
        onRefresh={handleRefresh}
        onMenu={handleMenu}
        onUrlChange={handleUrlChange}
      />
    );
  },
} satisfies Meta<ComponentProps<typeof BrowserToolbar>>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형 하나를 고른다. 변형이 없는 컴포넌트라 args가 없다.
export const Figma: Story = {};

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
export const Default: Story = {
  args: { onBack: fn(), onForward: fn(), onRefresh: fn(), onMenu: fn() },
  play: async ({ args, canvasElement, step }) => {
    const canvas = within(canvasElement);

    // @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
    await step('뒤로·앞으로·새로고침·더보기 버튼과 주소 입력창을 그린다', async () => {
      await expect(canvas.getByRole('button', { name: '뒤로' })).toBeInTheDocument();
      await expect(canvas.getByRole('button', { name: '앞으로' })).toBeInTheDocument();
      await expect(canvas.getByRole('button', { name: '새로고침' })).toBeInTheDocument();
      await expect(canvas.getByRole('button', { name: '더보기' })).toBeInTheDocument();
      await expect(canvas.getByRole('textbox', { name: '주소' })).toHaveValue('웹 주소');
    });

    // @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
    await step('버튼을 누르면 각 동작을 부른다', async () => {
      await userEvent.click(canvas.getByRole('button', { name: '뒤로' }));
      await userEvent.click(canvas.getByRole('button', { name: '앞으로' }));
      await userEvent.click(canvas.getByRole('button', { name: '새로고침' }));
      await userEvent.click(canvas.getByRole('button', { name: '더보기' }));
      await expect(args.onBack).toHaveBeenCalledTimes(1);
      await expect(args.onForward).toHaveBeenCalledTimes(1);
      await expect(args.onRefresh).toHaveBeenCalledTimes(1);
      await expect(args.onMenu).toHaveBeenCalledTimes(1);
    });
  },
};

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
export const WithUrl: Story = {
  args: { url: 'example.com', onUrlChange: fn() },
  play: async ({ args, canvasElement, step }) => {
    const input = within(canvasElement).getByRole('textbox', { name: '주소' });

    // @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
    await step('url로 주소창의 처음 값을 정한다', async () => {
      await expect(input).toHaveValue('example.com');
    });

    // @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
    await step('주소를 입력하면 onUrlChange를 부른다', async () => {
      await userEvent.clear(input);
      await userEvent.type(input, '/a');
      await expect(args.onUrlChange).toHaveBeenLastCalledWith('/a', expect.anything());
    });
  },
};

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
export const WithoutForwardRefresh: Story = {
  args: { hasForward: false, hasRefresh: false },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    // @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
    await step('hasForward·hasRefresh가 false면 앞으로·새로고침 버튼을 그리지 않는다', async () => {
      await expect(canvas.queryByRole('button', { name: '앞으로' })).not.toBeInTheDocument();
      await expect(canvas.queryByRole('button', { name: '새로고침' })).not.toBeInTheDocument();
      await expect(canvas.getByRole('button', { name: '뒤로' })).toBeInTheDocument();
    });
  },
};

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
export const Disabled: Story = {
  args: { canGoBack: false, canGoForward: false },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    // @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
    await step('canGoBack·canGoForward가 false면 뒤로·앞으로 버튼이 비활성이다', async () => {
      await expect(canvas.getByRole('button', { name: '뒤로' })).toBeDisabled();
      await expect(canvas.getByRole('button', { name: '앞으로' })).toBeDisabled();
      await expect(canvas.getByRole('button', { name: '새로고침' })).toBeEnabled();
    });
  },
};

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
export const Customized: Story = {
  args: {
    addressBar: <input aria-label="내 주소창" />,
    renderMenuButton: (button) => (
      <div role="group" aria-label="메뉴 묶음">
        {button}
      </div>
    ),
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    // @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
    await step('addressBar를 주면 기본 주소창 대신 그 자리를 그린다', async () => {
      await expect(canvas.getByRole('textbox', { name: '내 주소창' })).toBeInTheDocument();
      await expect(canvas.queryByRole('textbox', { name: '주소' })).not.toBeInTheDocument();
    });

    // @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
    await step('renderMenuButton은 더보기 버튼을 받아 감싸 그린다', async () => {
      await expect(canvas.getByRole('group', { name: '메뉴 묶음' })).toContainElement(
        canvas.getByRole('button', { name: '더보기' }),
      );
    });
  },
};
