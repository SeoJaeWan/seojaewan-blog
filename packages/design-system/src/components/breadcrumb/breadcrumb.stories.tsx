import { Menu } from '@base-ui/react/menu';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, fn, userEvent, waitFor } from 'storybook/test';

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

type EditingArgs = { onValueChange: (value: string) => void; onClear: () => void };

// @codocs [[파일 탐색기:주소창 편집]]
/** 편집 중에는 위치 아이콘·경로 칸 대신 입력칸을 그리고, 포커스를 주어 경로 전체를 선택한다. 지우기 버튼은 입력이 있을 때만 있다 */
export const Editing: StoryObj<EditingArgs> = {
  args: { onValueChange: fn(), onClear: fn() },
  decorators: [figmaFrame(breadcrumbExport)],
  render: (args) => {
    const { onValueChange: handleValueChange, onClear: handleClear } = args;
    return (
      <Breadcrumb
        locationIcon={<img src={folderIcon} alt="" data-testid="location-icon" />}
        isEditing
        onClear={handleClear}
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

    await step('위치 아이콘과 경로 칸은 그리지 않는다', async () => {
      await expect(canvas.queryByText('바탕 화면')).not.toBeInTheDocument();
      await expect(canvas.queryByTestId('location-icon')).not.toBeInTheDocument();
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

    await step('지우기를 누르면 입력을 비우고 포커스는 입력칸에 남는다', async () => {
      await userEvent.click(canvas.getByRole('button', { name: '지우기' }));
      await expect(input).toHaveValue('');
      await expect(input).toHaveFocus();
      await expect(args.onClear).toHaveBeenCalledTimes(1);
    });

    await step('입력이 비면 지우기 버튼이 없고, 다시 입력하면 나타난다', async () => {
      await expect(canvas.queryByRole('button', { name: '지우기' })).not.toBeInTheDocument();
      await userEvent.keyboard('a');
      await expect(canvas.getByRole('button', { name: '지우기' })).toBeInTheDocument();
    });
  },
};

/**
 * 쓰는 곳이 `value`로 값을 정하는 편집 입력칸이다. 지우기는 onClear에서 값을 비운다.
 * @param props 컴포넌트 속성
 * @param props.onClear 지우기 버튼을 눌렀을 때 부른다
 * @returns 값을 쓰는 곳이 정하는 편집 중 Breadcrumb
 */
function ControlledEditingExample({ onClear }: { onClear: () => void }) {
  const [text, setText] = useState(EDITING_PATH);
  /** 지우기: 값을 비우고 알린다. */
  function handleClear() {
    setText('');
    onClear();
  }
  return (
    <Breadcrumb
      locationIcon={<img src={folderIcon} alt="" />}
      isEditing
      onClear={handleClear}
      editFieldProps={{ value: text, onValueChange: setText, 'aria-label': '주소' }}
    />
  );
}

// @codocs [[파일 탐색기:주소창 편집]]
/** `value`로 값을 정하는 쓰는 곳도 onClear에서 값을 비우면 지우기 버튼이 사라지고 포커스가 입력칸에 남는다 */
export const ControlledEditing: StoryObj<{ onClear: () => void }> = {
  args: { onClear: fn() },
  decorators: [figmaFrame(breadcrumbExport)],
  render: (args) => {
    const { onClear: handleClear } = args;
    return <ControlledEditingExample onClear={handleClear} />;
  },
  play: async ({ args, canvas, step }) => {
    const input = canvas.getByRole<HTMLInputElement>('textbox', { name: '주소' });

    await step('지우기를 누르면 onClear를 부르고 값이 빈다', async () => {
      await userEvent.click(canvas.getByRole('button', { name: '지우기' }));
      await expect(args.onClear).toHaveBeenCalledTimes(1);
      await expect(input).toHaveValue('');
      await expect(input).toHaveFocus();
      await expect(canvas.queryByRole('button', { name: '지우기' })).not.toBeInTheDocument();
    });
  },
};

/**
 * 맨 앞 꺾쇠를 Base UI 메뉴 트리거로 감싸고 열림 상태를 isSeparatorOpen으로 넘긴 모습이다.
 * @returns 맨 앞 꺾쇠가 메뉴를 여는 Breadcrumb
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
    <Breadcrumb
      locationIcon={<img src={folderIcon} alt="" />}
      separatorLabel="최상위 항목"
      isSeparatorOpen={isOpen}
      renderSeparator={(separator) => (
        <Menu.Root open={isOpen} modal={false} onOpenChange={handleOpenChange}>
          <Menu.Trigger render={separator} />
          <Menu.Portal>
            <Menu.Positioner>
              <Menu.Popup>
                <Menu.Item>바탕 화면</Menu.Item>
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      )}
    >
      <BreadcrumbItem label="바탕 화면" isCurrent hasSeparator={false} />
    </Breadcrumb>
  );
}

// @codocs [[컴포넌트 목록:상태]]
/** 맨 앞 꺾쇠는 renderSeparator로 메뉴 트리거가 되고, 열린 동안 아래 꺾쇠 모양이다 */
export const SeparatorMenu: Story = {
  render: () => <SeparatorMenuExample />,
  // Base UI 포커스 가드는 aria-hidden이면서 tabindex=0인 span이라 aria-hidden-focus에 걸린다. 외부 라이브러리 구조라 이 규칙만 끈다.
  parameters: { a11y: { config: { rules: [{ id: 'aria-hidden-focus', enabled: false }] } } },
  play: async ({ canvas, step }) => {
    const chevron = canvas.getByRole('button', { name: '최상위 항목' });

    await step('맨 앞 꺾쇠를 누르면 메뉴가 열리고 열림 모양이 된다', async () => {
      await expect(chevron).toHaveAttribute('data-open', 'false');
      await userEvent.click(chevron);
      await waitFor(() => expect(chevron).toHaveAttribute('aria-expanded', 'true'));
      await expect(chevron).toHaveAttribute('data-open', 'true');
    });
  },
};
