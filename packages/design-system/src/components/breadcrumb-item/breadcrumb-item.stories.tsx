import { Menu } from '@base-ui/react/menu';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { type ComponentProps, useState } from 'react';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import { BreadcrumbItem } from './breadcrumb-item';

// 피그마 BreadcrumbItem의 변형 속성 값이다(정규화한 이름).
const STATES = ['rest', 'hover', 'pressed'] as const;

type FigmaArgs = {
  state: (typeof STATES)[number];
  hasSeparator: boolean;
  /** 동작 스토리가 쓰는 값이다. 주지 않으면 피그마 기본 글자다 */
  label?: string;
  /** 코드 전용 속성이다. 피그마 변형에는 없다 */
  isCurrent?: boolean;
  onLabelClick?: ComponentProps<typeof BreadcrumbItem>['onLabelClick'];
};

const meta = {
  title: 'Components/BreadcrumbItem',
  args: { state: 'rest', hasSeparator: true },
  argTypes: {
    hasSeparator: { control: 'boolean' },
    state: { control: 'inline-radio', options: STATES },
  },
  render: (args) => {
    const { onLabelClick: handleLabelClick } = args;
    return (
      <BreadcrumbItem
        isCurrent={args.isCurrent}
        label={args.label}
        hasSeparator={args.hasSeparator}
        onLabelClick={handleLabelClick}
      />
    );
  },
} satisfies Meta<FigmaArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형 하나를 args 하나로 고른다.
export const Figma: Story = {};

// @codocs [[컴포넌트 목록:상태]]
export const Default: Story = {
  args: { onLabelClick: fn() },
  play: async ({ args, canvasElement, step }) => {
    const button = within(canvasElement).getByRole('button', { name: '위치 이름' });

    // @codocs [[컴포넌트 목록:상태]]
    await step('기본은 현재 위치가 아니고 구분자를 그린다', async () => {
      await expect(button).not.toHaveAttribute('aria-current');
      await expect(canvasElement.firstElementChild).toHaveAttribute('data-separator', 'true');
    });

    // @codocs [[컴포넌트 목록:상태]]
    await step('위치 이름 버튼을 누르면 onLabelClick을 부른다', async () => {
      await userEvent.click(button);
      await expect(args.onLabelClick).toHaveBeenCalledTimes(1);
    });
  },
};

// @codocs [[컴포넌트 목록:상태]]
export const Current: Story = {
  args: { isCurrent: true, label: '문서', hasSeparator: false },
  play: async ({ canvasElement, step }) => {
    // @codocs [[컴포넌트 목록:상태]]
    await step('isCurrent는 aria-current를 붙이고 hasSeparator를 끄면 구분자가 없다', async () => {
      await expect(within(canvasElement).getByRole('button', { name: '문서' })).toHaveAttribute(
        'aria-current',
        'page',
      );
      await expect(canvasElement.firstElementChild).toHaveAttribute('data-separator', 'false');
    });
  },
};

// 피그마 컴포넌트 설명의 `@runtime` 줄: 공간이 모자라면 위치 이름 끝을 …로 줄인다.
// @codocs [[테스트 작성 규칙:테스트 지침]]
export const Truncated: Story = {
  args: {
    label:
      '아주 긴 폴더 이름은 최대 너비를 넘으면 끝이 줄어든다 아주 긴 폴더 이름은 최대 너비를 넘으면 끝이 줄어든다',
  },
  play: async ({ args, canvasElement, step }) => {
    const button = within(canvasElement).getByRole('button', { name: args.label });
    const text = button.firstElementChild as HTMLElement;

    await step('이름이 최대 너비를 넘으면 끝을 …로 줄인다', async () => {
      await expect(text.scrollWidth).toBeGreaterThan(text.clientWidth);
      await expect(getComputedStyle(text).textOverflow).toBe('ellipsis');
    });
  },
};

/**
 * 꺾쇠 구분자를 Base UI 메뉴 트리거로 감싸고 열림 상태를 isSeparatorOpen으로 넘긴 모습이다.
 * @returns 꺾쇠가 메뉴를 여는 경로 칸
 */
function SeparatorMenuExample() {
  const [isOpen, setIsOpen] = useState(false);
  /**
   * 메뉴가 열고 닫히려 할 때 열림 상태를 바꾼다.
   * @param isNextOpen 바뀔 열림 상태
   */
  function handleOpenChange(isNextOpen: boolean) {
    setIsOpen(isNextOpen);
  }
  return (
    <BreadcrumbItem
      label="문서"
      separatorLabel="문서 하위 폴더"
      isSeparatorOpen={isOpen}
      renderSeparator={(separator) => (
        <Menu.Root open={isOpen} modal={false} onOpenChange={handleOpenChange}>
          <Menu.Trigger render={separator} />
          <Menu.Portal>
            <Menu.Positioner>
              <Menu.Popup>
                <Menu.Item>하위 폴더 이름</Menu.Item>
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      )}
    />
  );
}

// @codocs [[컴포넌트 목록:상태]]
/** 꺾쇠 구분자는 renderSeparator로 메뉴 트리거가 되고, 열린 동안 아래 꺾쇠 모양이다 */
export const SeparatorMenu: Story = {
  render: () => <SeparatorMenuExample />,
  // Base UI 포커스 가드는 aria-hidden이면서 tabindex=0인 span이라 aria-hidden-focus에 걸린다. 외부 라이브러리 구조라 이 규칙만 끈다.
  parameters: { a11y: { config: { rules: [{ id: 'aria-hidden-focus', enabled: false }] } } },
  play: async ({ canvasElement, step }) => {
    const chevron = within(canvasElement).getByRole('button', { name: '문서 하위 폴더' });

    await step('꺾쇠를 누르면 메뉴가 열리고 열림 모양이 된다', async () => {
      await expect(chevron).toHaveAttribute('data-open', 'false');
      await userEvent.click(chevron);
      await waitFor(() => expect(chevron).toHaveAttribute('aria-expanded', 'true'));
      await expect(chevron).toHaveAttribute('data-open', 'true');
    });
  },
};
