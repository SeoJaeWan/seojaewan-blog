import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ComponentProps, ReactNode } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';

import { ExplorerAddressRow } from './explorer-address-row';

// 피그마 Breadcrumb `Location icon` 기본 인스턴스(폴더 아이콘)다. Vite와 Next.js가 모두 파일 주소로 바꿔 준다.
const folderIcon = new URL('../../assets/images/file-folder.webp', import.meta.url).href;

// 피그마 ExplorerAddressRow의 변형 속성 값이다(정규화한 이름). desktop에는 search=open 변형이 없다.
const DEVICES = ['desktop', 'mobile'] as const;
const SEARCHES = ['closed', 'open'] as const;

// 컴포넌트는 너비를 갖지 않으므로 피그마 원본 너비로 감싸 그린다.
const WIDTHS = { desktop: 798, mobile: 388 } as const;

type RowProps = ComponentProps<typeof ExplorerAddressRow>;

type ParityArgs = {
  device: (typeof DEVICES)[number];
  search: (typeof SEARCHES)[number];
  /** 동작 스토리가 쓴다. 주지 않으면 피그마 Items 슬롯의 미리보기 크기 100×100의 빈 요소를 넣는다 */
  items?: ReactNode;
  backDisabled?: boolean;
  forwardDisabled?: boolean;
  upDisabled?: boolean;
  searchPlaceholder?: string;
  searchValue?: string;
  onBack?: RowProps['onBack'];
  onForward?: RowProps['onForward'];
  onUp?: RowProps['onUp'];
  onRefresh?: RowProps['onRefresh'];
  onSearchChange?: RowProps['onSearchChange'];
  onSearch?: RowProps['onSearch'];
  onSearchClose?: RowProps['onSearchClose'];
};

const meta = {
  title: 'Components/ExplorerAddressRow',
  parameters: { layout: 'padded' },
  args: { device: 'desktop', search: 'closed' },
  argTypes: {
    device: { control: 'inline-radio', options: DEVICES },
    search: { control: 'inline-radio', options: SEARCHES },
  },
  render: (args) => {
    const {
      onBack: handleBack,
      onForward: handleForward,
      onUp: handleUp,
      onRefresh: handleRefresh,
      onSearchChange: handleSearchChange,
      onSearch: handleSearch,
      onSearchClose: handleSearchClose,
    } = args;
    return (
      <div style={{ width: WIDTHS[args.device] }}>
        <ExplorerAddressRow
          device={args.device}
          search={args.search}
          locationIcon={<img src={folderIcon} alt="" className="size-full object-contain" />}
          backDisabled={args.backDisabled}
          forwardDisabled={args.forwardDisabled}
          upDisabled={args.upDisabled}
          searchPlaceholder={args.searchPlaceholder}
          searchValue={args.searchValue}
          onBack={handleBack}
          onForward={handleForward}
          onUp={handleUp}
          onRefresh={handleRefresh}
          onSearchChange={handleSearchChange}
          onSearch={handleSearch}
          onSearchClose={handleSearchClose}
        >
          {args.items ?? (
            // 피그마 Items 슬롯의 미리보기 크기다. 칠 없는 빈 요소로 채운다
            <div className="shrink-0" style={{ width: 100, height: 100 }} />
          )}
        </ExplorerAddressRow>
      </div>
    );
  },
} satisfies Meta<ParityArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// @codocs [[디자인 시스템:아이콘 자리]]
// 피그마 변형 하나를 args 하나로 고른다.
export const Parity: Story = {};

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
export const Default: Story = {
  args: {
    items: <span>경로 칸</span>,
    searchPlaceholder: 'Blog 검색',
    onBack: fn(),
    onForward: fn(),
    onUp: fn(),
    onRefresh: fn(),
    onSearchChange: fn(),
  },
  play: async ({ args, canvasElement, step }) => {
    const canvas = within(canvasElement);
    const searchbox = canvas.getByRole('searchbox', { name: '검색' });

    // @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
    await step('desktop은 이동 버튼 넷과 검색 상자, 경로 슬롯을 그린다', async () => {
      for (const name of ['뒤로', '앞으로', '위로', '새로 고침']) {
        await expect(canvas.getByRole('button', { name })).toBeInTheDocument();
      }
      await expect(searchbox).toBeInTheDocument();
      await expect(canvas.getByText('경로 칸')).toBeInTheDocument();
    });

    // @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
    await step('searchPlaceholder로 검색 상자의 안내 글자를 바꾼다', async () => {
      await expect(searchbox).toHaveAttribute('placeholder', 'Blog 검색');
    });

    // @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
    await step('버튼을 누르면 맞는 동작을 부른다', async () => {
      await userEvent.click(canvas.getByRole('button', { name: '뒤로' }));
      await userEvent.click(canvas.getByRole('button', { name: '앞으로' }));
      await userEvent.click(canvas.getByRole('button', { name: '위로' }));
      await userEvent.click(canvas.getByRole('button', { name: '새로 고침' }));
      await expect(args.onBack).toHaveBeenCalledTimes(1);
      await expect(args.onForward).toHaveBeenCalledTimes(1);
      await expect(args.onUp).toHaveBeenCalledTimes(1);
      await expect(args.onRefresh).toHaveBeenCalledTimes(1);
    });

    // @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
    await step('검색 입력을 알린다', async () => {
      await userEvent.type(searchbox, 'ab');
      await expect(args.onSearchChange).toHaveBeenLastCalledWith('ab');
    });
  },
};

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
export const Disabled: Story = {
  args: { backDisabled: true, forwardDisabled: true, upDisabled: true },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    // @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
    await step('비활성으로 둔 이동 버튼은 누를 수 없다', async () => {
      for (const name of ['뒤로', '앞으로', '위로']) {
        await expect(canvas.getByRole('button', { name })).toBeDisabled();
      }
      await expect(canvas.getByRole('button', { name: '새로 고침' })).toBeEnabled();
    });
  },
};

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
export const Searching: Story = {
  args: { searchValue: '리액트', onSearchChange: fn() },
  play: async ({ canvasElement, step }) => {
    // @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
    await step('searchValue로 검색 상자의 입력값을 정한다', async () => {
      await expect(within(canvasElement).getByRole('searchbox', { name: '검색' })).toHaveValue(
        '리액트',
      );
    });
  },
};

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
export const Mobile: Story = {
  args: { device: 'mobile', onSearch: fn() },
  play: async ({ args, canvasElement, step }) => {
    const canvas = within(canvasElement);

    // @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
    await step('mobile은 뒤로 버튼과 검색 버튼만 그린다', async () => {
      await expect(canvas.getByRole('button', { name: '뒤로' })).toBeInTheDocument();
      await expect(canvas.getByRole('button', { name: '검색' })).toBeInTheDocument();
      await expect(canvas.queryByRole('button', { name: '앞으로' })).not.toBeInTheDocument();
      await expect(canvas.queryByRole('searchbox')).not.toBeInTheDocument();
    });

    // @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
    await step('검색 버튼을 누르면 onSearch를 부른다', async () => {
      await userEvent.click(canvas.getByRole('button', { name: '검색' }));
      await expect(args.onSearch).toHaveBeenCalledTimes(1);
    });
  },
};

// @codocs [[파일 탐색기:폴더 안 검색]]
export const MobileSearchOpen: Story = {
  args: {
    device: 'mobile',
    search: 'open',
    items: <span>경로 칸</span>,
    onSearchChange: fn(),
    onSearchClose: fn(),
  },
  play: async ({ args, canvasElement, step }) => {
    const canvas = within(canvasElement);

    // @codocs [[파일 탐색기:폴더 안 검색]]
    await step(
      'search=open이면 ← 버튼과 검색 상자만 그리고 검색 상자에 포커스를 준다',
      async () => {
        await expect(canvas.getByRole('button', { name: '검색 닫기' })).toBeInTheDocument();
        await expect(canvas.queryByRole('button', { name: '뒤로' })).not.toBeInTheDocument();
        await expect(canvas.queryByRole('button', { name: '검색' })).not.toBeInTheDocument();
        await expect(canvas.queryByText('경로 칸')).not.toBeInTheDocument();
        await expect(canvas.getByRole('searchbox', { name: '검색' })).toHaveFocus();
      },
    );

    // @codocs [[파일 탐색기:폴더 안 검색]]
    await step('← 버튼과 입력을 알린다', async () => {
      await userEvent.type(canvas.getByRole('searchbox'), 'ab');
      await expect(args.onSearchChange).toHaveBeenLastCalledWith('ab');
      await userEvent.click(canvas.getByRole('button', { name: '검색 닫기' }));
      await expect(args.onSearchClose).toHaveBeenCalledTimes(1);
    });
  },
};

// @codocs [[파일 탐색기:폴더 안 검색]]
export const DesktopSearchOpen: Story = {
  args: { search: 'open' },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    // @codocs [[파일 탐색기:폴더 안 검색]]
    await step('desktop은 search 값과 상관없이 주소 줄을 그린다', async () => {
      await expect(canvas.getByRole('button', { name: '뒤로' })).toBeInTheDocument();
      await expect(canvas.queryByRole('button', { name: '검색 닫기' })).not.toBeInTheDocument();
    });
  },
};
