import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent } from 'storybook/test';

import breadcrumbExport from '../../../figma/components/breadcrumb/export.json';
import { figmaFrame } from '../../story/figma-frame';
import { BreadcrumbItem } from '../breadcrumb-item/breadcrumb-item';
import { Breadcrumb } from './breadcrumb';

const folderIcon = new URL('../../assets/images/file-folder.webp', import.meta.url).href;

// 피그마 Breadcrumb의 변형 속성 값이다(정규화한 이름).
const STATES = ['rest', 'editing'] as const;

// 피그마 `State=Editing`의 경로 글자다.
const EDITING_PATH = '바탕 화면\\Blog\\JavaScript';

type FigmaArgs = {
  state: (typeof STATES)[number];
};

const meta = {
  title: 'Components/Breadcrumb',
  args: { state: 'rest' },
  argTypes: {
    state: { control: 'inline-radio', options: STATES },
  },
  // Breadcrumb은 너비를 갖지 않고 쓰는 곳이 정한다. FigmaFrame이 피그마 원본 크기로 감싼다.
  // `Location icon`에는 피그마 기본 인스턴스(file/Folder)를 넣는다. `State=Editing`은 isEditing으로 바꿔 넘긴다.
  decorators: [figmaFrame(breadcrumbExport)],
  render: (args) => (
    <Breadcrumb
      locationIcon={<img src={folderIcon} alt="" />}
      isEditing={args.state === 'editing'}
      editFieldProps={{ defaultValue: EDITING_PATH, 'aria-label': '주소' }}
    >
      {/* 피그마 Items 슬롯의 기본 내용이다. */}
      <BreadcrumbItem label="바탕 화면" />
      <BreadcrumbItem label="Blog" isCurrent hasSeparator={false} />
    </Breadcrumb>
  ),
} satisfies Meta<FigmaArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형 하나를 args 하나로 고른다.
export const Figma: Story = {};

type EditingArgs = { onValueChange: (value: string) => void };

// @codocs [[파일 탐색기:주소창 편집]]
/** 편집 중에는 경로 칸 대신 입력칸을 그리고, 포커스를 주어 경로 전체를 선택한다 */
export const Editing: StoryObj<EditingArgs> = {
  args: { onValueChange: fn() },
  decorators: [figmaFrame(breadcrumbExport)],
  render: (args) => {
    const { onValueChange: handleValueChange } = args;
    return (
      <Breadcrumb
        locationIcon={<img src={folderIcon} alt="" />}
        isEditing
        editFieldProps={{
          defaultValue: EDITING_PATH,
          'aria-label': '주소',
          onValueChange: handleValueChange,
        }}
      >
        <BreadcrumbItem label="바탕 화면" />
      </Breadcrumb>
    );
  },
  play: async ({ args, canvas, step }) => {
    const input = canvas.getByRole<HTMLInputElement>('textbox', { name: '주소' });

    await step('경로 칸은 그리지 않는다', async () => {
      await expect(canvas.queryByText('바탕 화면')).not.toBeInTheDocument();
    });

    await step('입력칸이 포커스를 받고 경로 전체를 선택한다', async () => {
      await expect(input).toHaveFocus();
      await expect(input.selectionStart).toBe(0);
      await expect(input.selectionEnd).toBe(EDITING_PATH.length);
    });

    await step('입력하면 바뀐 값을 넘긴다', async () => {
      await userEvent.keyboard('Blog');
      await expect(input).toHaveValue('Blog');
      await expect(args.onValueChange).toHaveBeenLastCalledWith('Blog', expect.anything());
    });
  },
};
