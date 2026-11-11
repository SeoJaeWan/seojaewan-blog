import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import fileRowExport from '../../../figma/components/file-row/export.json';
import { figmaFrame } from '../../story/figma-frame';
import { FileRow } from './file-row';

// 피그마 FileRow Icon 속성의 기본 인스턴스(폴더 이미지)다. Vite와 Next.js가 모두 파일 주소로 바꿔 준다.
const folderIcon = new URL('../../assets/images/file-folder.webp', import.meta.url).href;

/**
 * 줄을 그린 뒤 줄에 포커스를 두어 목록 안에 포커스가 있는 모습을 만든다.
 * 줄 안이 이미 포커스를 가졌으면 그대로 둔다. 이름 바꾸기 입력창은 이 뒤(effect)에 포커스를 가져가므로 빼앗기지 않는다.
 * @param row 줄 요소
 */
function focusRow(row: HTMLDivElement | null): void {
  if (row !== null && !row.contains(document.activeElement)) row.focus();
}

// 피그마 FileRow의 변형 속성 값이다(정규화한 이름). Hover는 캡처 도구가 마우스로 재현한다.
const VIEWS = ['default', 'recycle-bin'] as const;
const STATES = [
  'rest',
  'hover',
  'selected',
  'rename',
  'cut',
  'cut-selected',
  'selected-unfocused',
] as const;

type FigmaArgs = {
  view: (typeof VIEWS)[number];
  state: (typeof STATES)[number];
  /** 피그마 VARIANT 속성 Current */
  isCurrent: boolean;
  /** 피그마 TEXT 속성 Name */
  name: string;
  /** 피그마 TEXT 속성 Date */
  date: string;
  /** 피그마 TEXT 속성 Type */
  type: string;
  /** 피그마 TEXT 속성 Location */
  location: string;
  /** 피그마 BOOLEAN 속성 Has location */
  hasLocation: boolean;
  /** 피그마 TEXT 속성 Original location */
  originalLocation: string;
  /** 피그마 TEXT 속성 Deleted date */
  deletedDate: string;
};

const meta = {
  title: 'Components/FileRow',
  parameters: { layout: 'padded' },
  // 글자는 피그마 속성의 기본값과 같아야 한다([[피그마 연동:스토리 규칙]]).
  args: {
    view: 'default',
    state: 'rest',
    isCurrent: false,
    name: '파일 이름',
    date: '수정한 날짜',
    type: '유형',
    location: '위치',
    hasLocation: false,
    originalLocation: '원래 위치',
    deletedDate: '삭제한 날짜',
  },
  argTypes: {
    view: { control: 'inline-radio', options: VIEWS },
    state: { control: 'select', options: STATES },
    isCurrent: { control: 'boolean' },
    name: { control: 'text' },
    date: { control: 'text' },
    type: { control: 'text' },
    location: { control: 'text' },
    hasLocation: { control: 'boolean' },
    originalLocation: { control: 'text' },
    deletedDate: { control: 'text' },
  },
  // 줄 너비는 칸 너비의 합(HUG)이고, FigmaFrame이 피그마 원본의 크기 방식대로 감싼다.
  decorators: [figmaFrame(fileRowExport)],
  // 선택 바탕과 현재 항목 선의 색은 목록(role="listbox") 포커스로 고른다. 피그마 Selected unfocused만 포커스가 목록 밖에 있는
  // 모습이고, 나머지 변형은 포커스가 목록 안에 있는 모습이라 ref 콜백으로 줄에 포커스를 둔다.
  render: (args) => (
    <div role="listbox" aria-label="폴더 내용">
      <FileRow
        ref={args.state === 'selected-unfocused' ? undefined : focusRow}
        role="option"
        aria-selected={args.state.includes('selected')}
        tabIndex={0}
        view={args.view}
        name={args.name}
        date={args.date}
        type={args.type}
        location={args.location}
        hasLocation={args.hasLocation}
        originalLocation={args.originalLocation}
        deletedDate={args.deletedDate}
        icon={<img src={folderIcon} alt="" />}
        isSelected={args.state.includes('selected')}
        isCut={args.state === 'cut' || args.state === 'cut-selected'}
        isRenaming={args.state === 'rename'}
        isCurrent={args.isCurrent}
      />
    </div>
  ),
} satisfies Meta<FigmaArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// @codocs [[디자인 시스템:아이콘 자리]]
// 피그마 변형 하나를 args 하나로 고른다.
export const Figma: Story = {};

// @codocs [[컴포넌트 목록:상태]]
// @codocs [[디자인 시스템:아이콘 자리]]
/** 기본 글자와 icon 슬롯을 그린다. 위치 칸은 hasLocation을 켜기 전에는 없다 */
export const Default: Story = {
  render: () => <FileRow icon={<i>아이콘</i>} />,
  play: async ({ canvas }) => {
    await expect(canvas.getByText('파일 이름')).toBeInTheDocument();
    await expect(canvas.getByText('수정한 날짜')).toBeInTheDocument();
    await expect(canvas.getByText('유형')).toBeInTheDocument();
    await expect(canvas.getByText('아이콘')).toBeInTheDocument();
    await expect(canvas.queryByText('위치')).not.toBeInTheDocument();
  },
};

// @codocs [[컴포넌트 목록:상태]]
/** hasLocation을 켜면 위치 칸을 그린다 */
export const WithLocation: Story = {
  render: () => <FileRow icon={<i />} hasLocation />,
  play: async ({ canvas }) => {
    await expect(canvas.getByText('위치')).toBeInTheDocument();
  },
};

// @codocs [[컴포넌트 목록:상태]]
/** recycle-bin 보기는 원래 위치와 삭제한 날짜 칸을 그리고 수정한 날짜·유형·위치 칸은 그리지 않는다 */
export const RecycleBin: Story = {
  render: () => <FileRow icon={<i />} view="recycle-bin" hasLocation />,
  play: async ({ canvas }) => {
    await expect(canvas.getByText('원래 위치')).toBeInTheDocument();
    await expect(canvas.getByText('삭제한 날짜')).toBeInTheDocument();
    await expect(canvas.queryByText('수정한 날짜')).not.toBeInTheDocument();
    await expect(canvas.queryByText('유형')).not.toBeInTheDocument();
    await expect(canvas.queryByText('위치')).not.toBeInTheDocument();
  },
};

// @codocs [[컴포넌트 목록:상태]]
/** isSelected면 선택된 줄이다 */
export const Selected: Story = {
  render: () => <FileRow data-testid="row" icon={<i />} isSelected />,
  play: async ({ canvas }) => {
    await expect(canvas.getByTestId('row')).toHaveAttribute('data-state', 'selected');
  },
};

// @codocs [[컴포넌트 목록:상태]]
// 색은 바꾸지 않는다. Windows 모양을 유지하기로 함([[접근성:색 대비]]).
/** isCut이면 잘라낸 줄이다 */
export const Cut: Story = {
  render: () => <FileRow data-testid="row" icon={<i />} isCut />,
  parameters: { a11y: { config: { rules: [{ id: 'color-contrast', enabled: false }] } } },
  play: async ({ canvas }) => {
    await expect(canvas.getByTestId('row')).toHaveAttribute('data-state', 'cut');
  },
};

// @codocs [[컴포넌트 목록:상태]]
/** isRenaming이면 이름 대신 입력 상자를 이름으로 채워 그리고, renameFieldProps를 입력창에 넘긴다 */
export const Renaming: Story = {
  render: () => (
    <FileRow
      data-testid="row"
      icon={<i />}
      name="보고서"
      isRenaming
      renameFieldProps={{ 'aria-label': '새 이름' }}
    />
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('textbox', { name: '새 이름' })).toHaveValue('보고서');
    await expect(canvas.queryByText('보고서')).not.toBeInTheDocument();
    await expect(canvas.getByTestId('row')).toHaveAttribute('data-state', 'rename');
  },
};

// @codocs [[파일 탐색기:조작]]
// @codocs [[컴포넌트 목록:상태]]
/**
 * 선택 바탕과 현재 항목 선의 색은 목록(role="listbox")에 포커스가 있는지로 바뀐다. 현재 항목 선은 포커스가 목록을 떠나도 남고,
 * 현재 항목이 아닌 줄에는 없다. 선은 크기에 넣지 않는다
 */
export const ListFocus: Story = {
  render: () => (
    <div role="listbox" aria-label="폴더 내용">
      <FileRow
        data-testid="current"
        role="option"
        aria-selected
        tabIndex={0}
        icon={<i />}
        name="현재"
        isSelected
        isCurrent
      />
      <FileRow
        data-testid="other"
        role="option"
        aria-selected={false}
        tabIndex={-1}
        icon={<i />}
        name="다른 항목"
      />
    </div>
  ),
  play: async ({ canvas, userEvent, step }) => {
    const current = canvas.getByTestId('current');
    const other = canvas.getByTestId('other');
    const { offsetWidth, offsetHeight } = current;
    const unfocusedBackground = getComputedStyle(current).backgroundColor;
    const unfocusedLine = getComputedStyle(current, '::before').backgroundColor;

    await step(
      '포커스가 목록 밖이어도 현재 항목 선은 있고, 현재 항목이 아닌 줄에는 없다',
      async () => {
        await expect(getComputedStyle(current, '::before').content).not.toBe('none');
        await expect(getComputedStyle(other, '::before').content).toBe('none');
      },
    );

    await step('포커스가 목록 안에 들어오면 선택 바탕과 선 색이 바뀌고 크기는 같다', async () => {
      await userEvent.tab();
      await expect(current).toHaveFocus();
      await expect(getComputedStyle(current).backgroundColor).not.toBe(unfocusedBackground);
      await expect(getComputedStyle(current, '::before').backgroundColor).not.toBe(unfocusedLine);
      await expect(current.offsetWidth).toBe(offsetWidth);
      await expect(current.offsetHeight).toBe(offsetHeight);
    });

    await step('포커스가 목록을 떠나면 회색으로 돌아가고 선은 남는다', async () => {
      current.blur();
      await expect(current).not.toHaveFocus();
      await expect(getComputedStyle(current).backgroundColor).toBe(unfocusedBackground);
      await expect(getComputedStyle(current, '::before').backgroundColor).toBe(unfocusedLine);
    });
  },
};
