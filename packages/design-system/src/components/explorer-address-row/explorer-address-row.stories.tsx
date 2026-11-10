import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ComponentProps, ReactNode } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';

import explorerAddressRowExport from '../../../figma/components/explorer-address-row/export.json';
import { FigmaFrame } from '../../story/figma-frame';
import { BreadcrumbItem } from '../breadcrumb-item/breadcrumb-item';
import { ExplorerAddressRow } from './explorer-address-row';

// 피그마 Breadcrumb `Location icon` 기본 인스턴스(폴더 아이콘)다. Vite와 Next.js가 모두 파일 주소로 바꿔 준다.
const folderIcon = new URL('../../assets/images/file-folder.webp', import.meta.url).href;

// 피그마 ExplorerAddressRow의 변형 속성 값이다(정규화한 이름). desktop에는 search=open 변형이 없다.
const DEVICES = ['desktop', 'mobile'] as const;
const SEARCHES = ['closed', 'open'] as const;

// 피그마 Breadcrumb Items 슬롯의 기본 내용이다.
const figmaItems = (
  <>
    <BreadcrumbItem label="바탕 화면" />
    <BreadcrumbItem label="Blog" isCurrent hasSeparator={false} />
  </>
);

type RowProps = ComponentProps<typeof ExplorerAddressRow>;

type FigmaArgs = {
  device: (typeof DEVICES)[number];
  search: (typeof SEARCHES)[number];
  items: ReactNode;
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
  args: { device: 'desktop', search: 'closed', items: figmaItems },
  argTypes: {
    device: { control: 'inline-radio', options: DEVICES },
    search: { control: 'inline-radio', options: SEARCHES },
  },
  // 컴포넌트는 너비를 갖지 않으므로 FigmaFrame이 피그마 원본 너비(실제로 놓이는 탐색기 본문 너비)로 감싼다.
  // 너비는 device만 가르고, desktop에는 search=open 변형이 없어 device로만 고른다.
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
      <FigmaFrame source={explorerAddressRowExport} args={{ device: args.device }}>
        <ExplorerAddressRow
          device={args.device}
          search={args.search}
          locationIcon={<img src={folderIcon} alt="" />}
          onBack={handleBack}
          onForward={handleForward}
          onUp={handleUp}
          onRefresh={handleRefresh}
          onSearchChange={handleSearchChange}
          onSearch={handleSearch}
          onSearchClose={handleSearchClose}
        >
          {args.items}
        </ExplorerAddressRow>
      </FigmaFrame>
    );
  },
} satisfies Meta<FigmaArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// @codocs [[디자인 시스템:아이콘 자리]]
// 피그마 변형 하나를 args 하나로 고른다.
export const Figma: Story = {};

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
export const Default: Story = {
  args: {
    onBack: fn(),
    onForward: fn(),
    onUp: fn(),
    onRefresh: fn(),
    onSearchChange: fn(),
  },
  play: async ({ args, canvasElement, step }) => {
    const canvas = within(canvasElement);

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
      await userEvent.type(canvas.getByRole('searchbox', { name: '검색' }), 'ab');
      await expect(args.onSearchChange).toHaveBeenLastCalledWith('ab');
    });
  },
};

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
export const Mobile: Story = {
  args: { device: 'mobile', onSearch: fn() },
  play: async ({ args, canvasElement, step }) => {
    const canvas = within(canvasElement);

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
        await expect(canvas.queryByRole('button', { name: 'Blog' })).not.toBeInTheDocument();
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

type BreadcrumbPassThroughArgs = {
  onBreadcrumbClear: () => void;
};

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
/** 안쪽 Breadcrumb의 맨 앞 꺾쇠와 편집 입력칸의 지우기 동작을 그대로 넘긴다 */
export const BreadcrumbPassThrough: StoryObj<BreadcrumbPassThroughArgs> = {
  args: { onBreadcrumbClear: fn() },
  render: (args) => {
    const { onBreadcrumbClear: handleBreadcrumbClear } = args;
    return (
      <>
        <FigmaFrame source={explorerAddressRowExport} args={{ device: 'desktop' }}>
          <ExplorerAddressRow
            locationIcon={<img src={folderIcon} alt="" />}
            breadcrumbSeparatorLabel="최상위 위치"
            isBreadcrumbSeparatorOpen
            renderBreadcrumbSeparator={(separator) => (
              <span data-testid="root-menu">{separator}</span>
            )}
          >
            {figmaItems}
          </ExplorerAddressRow>
        </FigmaFrame>
        <FigmaFrame source={explorerAddressRowExport} args={{ device: 'desktop' }}>
          <ExplorerAddressRow
            locationIcon={<img src={folderIcon} alt="" />}
            isBreadcrumbEditing
            breadcrumbEditFieldProps={{ defaultValue: '바탕 화면\\Blog', 'aria-label': '주소' }}
            onBreadcrumbClear={handleBreadcrumbClear}
          />
        </FigmaFrame>
      </>
    );
  },
  play: async ({ args, canvasElement, step }) => {
    const canvas = within(canvasElement);

    // @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
    await step('맨 앞 꺾쇠의 이름·열림·감싸기를 넘긴다', async () => {
      const chevron = within(canvas.getByTestId('root-menu')).getByRole('button', {
        name: '최상위 위치',
      });
      await expect(chevron).toHaveAttribute('data-open', 'true');
    });

    // @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
    await step('지우기 버튼을 누르면 onBreadcrumbClear를 부른다', async () => {
      await userEvent.click(canvas.getByRole('button', { name: '지우기' }));
      await expect(args.onBreadcrumbClear).toHaveBeenCalledTimes(1);
      await expect(canvas.getByRole('textbox', { name: '주소' })).toHaveValue('');
    });
  },
};
