import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ComponentProps } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';

import { BrowserTab } from './browser-tab';

// 피그마 BrowserTab 기본 인스턴스(file/Document 파비콘)다. Vite와 Next.js가 모두 파일 주소로 바꿔 준다.
const faviconImage = new URL('../../assets/images/file-document.webp', import.meta.url).href;

// 피그마 BrowserTab의 변형 속성 값이다(정규화한 이름). Hover는 캡처 도구가 마우스로 재현한다.
const STATES = ['rest', 'hover', 'active'] as const;

type FigmaArgs = {
  state: (typeof STATES)[number];
  /** 피그마 TEXT 속성 Title */
  title: string;
  /** 피그마 불리언 속성 Show separator */
  showSeparator: boolean;
  /** 동작 스토리가 쓴다 */
  tabIndex?: number;
  onClick?: ComponentProps<typeof BrowserTab>['onClick'];
  onClose?: ComponentProps<typeof BrowserTab>['onClose'];
};

// 닫기 버튼이 tablist 안에 있어 aria-required-children에 걸린다. 구조를 바꿀지 사람이 정할 때까지 이 규칙만 끈다
// (임의 작업 문서의 "탭 닫기 버튼" 항목).
const closeButtonA11y = {
  a11y: { config: { rules: [{ id: 'aria-required-children', enabled: false }] } },
};

const meta = {
  title: 'Components/BrowserTab',
  // 글자는 피그마 Title 속성의 기본값과 같아야 한다([[피그마 연동:스토리 규칙]]).
  args: { state: 'rest', title: '페이지 제목', showSeparator: true },
  argTypes: {
    state: { control: 'inline-radio', options: STATES },
    title: { control: 'text' },
    showSeparator: { control: 'boolean' },
  },
  // 탭은 tablist 안에서만 쓴다. 감싸는 요소는 크기를 더하지 않는다.
  render: (args) => {
    const { onClick: handleClick, onClose: handleClose } = args;
    return (
      <div role="tablist" aria-label="탭">
        <BrowserTab
          active={args.state === 'active'}
          title={args.title}
          showSeparator={args.showSeparator}
          tabIndex={args.tabIndex}
          favicon={<img src={faviconImage} alt="" className="size-icon-16 object-contain" />}
          onClick={handleClick}
          onClose={handleClose}
        />
      </div>
    );
  },
} satisfies Meta<FigmaArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// @codocs [[디자인 시스템:아이콘 자리]]
// 피그마 변형 하나를 args 하나로 고른다.
// 닫기 버튼이 tablist 안에 있어 aria-required-children에 걸린다. 구조를 바꿀지 사람이 정할 때까지 이 규칙만 끈다
// (임의 작업 문서의 "탭 닫기 버튼" 항목).
export const Figma: Story = {
  parameters: closeButtonA11y,
};

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
// @codocs [[디자인 시스템:아이콘 자리]]
export const Default: Story = {
  args: { title: '문서', tabIndex: 0, onClick: fn(), onClose: fn() },
  parameters: closeButtonA11y,
  play: async ({ args, canvasElement, step }) => {
    const canvas = within(canvasElement);
    const tab = canvas.getByRole('tab', { name: /문서/u });
    const closeButton = canvas.getByRole('button', { name: '탭 닫기' });

    // @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
    await step('기본은 선택되지 않은 탭이고 구분선을 그린다', async () => {
      await expect(tab).toHaveAttribute('aria-selected', 'false');
      await expect(tab.parentElement).toHaveAttribute('data-separator', 'true');
    });

    // @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
    await step('닫기 버튼은 탭(role="tab") 안이 아니라 옆에 둔다', async () => {
      await expect(tab).not.toContainElement(closeButton);
    });

    // @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
    await step('tabIndex는 탭(role="tab")이 받는다', async () => {
      await expect(tab).toHaveAttribute('tabindex', '0');
    });

    // @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
    await step('닫기 버튼은 onClose만 부르고 탭의 onClick은 부르지 않는다', async () => {
      await userEvent.click(closeButton);
      await expect(args.onClose).toHaveBeenCalledTimes(1);
      await expect(args.onClick).not.toHaveBeenCalled();
    });
  },
};

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
export const Selected: Story = {
  args: { state: 'active' },
  parameters: closeButtonA11y,
  play: async ({ canvasElement, step }) => {
    const tab = within(canvasElement).getByRole('tab');

    // @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
    await step('active면 선택된 탭이고 구분선을 그리지 않는다', async () => {
      await expect(tab).toHaveAttribute('aria-selected', 'true');
      await expect(tab.parentElement).toHaveAttribute('data-separator', 'false');
    });
  },
};

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
export const WithoutSeparator: Story = {
  args: { showSeparator: false },
  parameters: closeButtonA11y,
  play: async ({ canvasElement, step }) => {
    // @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
    await step('showSeparator=false면 선택되지 않은 탭도 구분선을 그리지 않는다', async () => {
      const tab = within(canvasElement).getByRole('tab');
      await expect(tab).toHaveAttribute('aria-selected', 'false');
      await expect(tab.parentElement).toHaveAttribute('data-separator', 'false');
    });
  },
};
