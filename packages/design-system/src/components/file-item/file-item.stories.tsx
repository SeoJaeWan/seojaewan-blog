import type { Meta, StoryObj } from '@storybook/react-vite';
import { type ComponentProps, type JSX, type ReactNode, useLayoutEffect } from 'react';
import { expect, userEvent, within } from 'storybook/test';

import { FileItem } from './file-item';

// 피그마 FileItem 기본 인스턴스(폴더 이미지)다. Vite와 Next.js가 모두 파일 주소로 바꿔 준다.
const folderIcon = new URL('../../assets/images/file-folder.webp', import.meta.url).href;

// 피그마 FileItem의 변형 속성 값이다(정규화한 이름). Hover는 캡처 도구가 마우스로, Focused는 Tab 키로 재현한다.
const SURFACES = ['desktop', 'explorer'] as const;
const SIZES = ['large', 'medium', 'small'] as const;
const STATES = [
  'rest',
  'hover',
  'selected',
  'focused',
  'rename',
  'cut',
  'cut-selected',
  'selected-unfocused',
] as const;

type FigmaArgs = {
  surface: (typeof SURFACES)[number];
  size: (typeof SIZES)[number];
  state: (typeof STATES)[number];
  /** 피그마 VARIANT 속성 Current */
  isCurrent: boolean;
  /** 피그마 TEXT 속성 Name */
  name: string;
  /** 동작 스토리가 이름 바꾸기 입력창에 접근성 이름을 달려고 받는다 */
  renameFieldProps?: ComponentProps<typeof FileItem>['renameFieldProps'];
};

/**
 * 바탕화면 항목은 흰 글자라 기본(흰) 화면 위에서는 피그마 그림과 코드 그림이 모두 보이지 않는다.
 * 캡처 도구가 화면(body)의 배경색을 읽어 두 그림을 같은 색 위에 놓으므로, 어두운 바탕을 화면에 깐다.
 * @param props
 * @param props.surface 피그마 Surface
 * @param props.children 그릴 항목
 * @returns 항목
 */
function Backdrop(props: { surface: FigmaArgs['surface']; children: ReactNode }): JSX.Element {
  const { surface, children } = props;
  useLayoutEffect(() => {
    if (surface !== 'desktop') {
      return undefined;
    }
    document.body.style.backgroundColor = 'var(--color-black)';
    return () => {
      document.body.style.backgroundColor = '';
    };
  }, [surface]);
  return <>{children}</>;
}

/**
 * 항목을 그린 뒤 항목에 포커스를 두어 목록 안에 포커스가 있는 모습을 만든다.
 * 항목 안이 이미 포커스를 가졌으면 그대로 둔다. 이름 바꾸기 입력창은 이 뒤(effect)에 포커스를 가져가므로 빼앗기지 않는다.
 * @param item 항목 요소
 */
function focusItem(item: HTMLDivElement | null): void {
  if (item !== null && !item.contains(document.activeElement)) item.focus();
}

const meta = {
  title: 'Components/FileItem',
  // 글자는 피그마 Name 속성의 기본값과 같아야 한다([[피그마 연동:스토리 규칙]]).
  args: { surface: 'desktop', size: 'large', state: 'rest', isCurrent: false, name: '파일 이름' },
  argTypes: {
    surface: { control: 'inline-radio', options: SURFACES },
    size: { control: 'inline-radio', options: SIZES },
    state: { control: 'select', options: STATES },
    isCurrent: { control: 'boolean' },
    name: { control: 'text' },
  },
  // 탐색기 항목의 선택 바탕과 현재 항목 선의 색은 목록(role="listbox") 포커스로 고른다. 피그마 Selected unfocused만 포커스가
  // 목록 밖에 있는 모습이고, 나머지 탐색기 변형은 포커스가 목록 안에 있는 모습이라 ref 콜백으로 항목에 포커스를 둔다.
  // 바탕화면 항목은 목록 포커스를 보지 않고, Focused는 캡처 도구가 Tab으로 포커스를 옮겨 :focus-visible 선을 그린다.
  // 목록 요소가 화면 너비로 늘어나므로 캡처 대상은 항목이다(data-parity-target).
  render: (args) => (
    <Backdrop surface={args.surface}>
      <div role="listbox" aria-label="폴더 내용">
        <FileItem
          ref={
            args.surface === 'explorer' && args.state !== 'selected-unfocused'
              ? focusItem
              : undefined
          }
          data-parity-target
          role="option"
          aria-selected={args.state.includes('selected')}
          tabIndex={0}
          surface={args.surface}
          size={args.size}
          name={args.name}
          icon={<img src={folderIcon} alt="" />}
          isSelected={args.state.includes('selected')}
          isCut={args.state === 'cut' || args.state === 'cut-selected'}
          isRenaming={args.state === 'rename'}
          isCurrent={args.isCurrent}
          renameFieldProps={args.renameFieldProps}
        />
      </div>
    </Backdrop>
  ),
} satisfies Meta<FigmaArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형 하나를 args 하나로 고른다.
export const Figma: Story = {};

/**
 * 스토리가 그린 항목(캡처 대상)을 찾는다.
 * @param canvasElement 스토리 캔버스
 * @returns 항목 요소
 */
function getItem(canvasElement: HTMLElement): HTMLElement {
  const item = canvasElement.querySelector('[data-parity-target]');
  if (!(item instanceof HTMLElement)) throw new Error('항목이 없다');
  return item;
}

// @codocs [[컴포넌트 목록:Windows 화면 요소]]
export const Default: Story = {
  args: { name: '긴 이름' },
  play: async ({ canvasElement, step }) => {
    const item = getItem(canvasElement);

    // @codocs [[컴포넌트 목록:상태]]
    await step('포커스를 받아도 선택 모습은 바뀌지 않는다', async () => {
      await userEvent.tab();
      await expect(item).toHaveFocus();
      await expect(item).toHaveAttribute('data-selected', 'false');
      await expect(item).toHaveAttribute('data-cut', 'false');
    });
  },
};

// @codocs [[컴포넌트 목록:Windows 화면 요소]]
export const Selected: Story = {
  args: { surface: 'explorer', state: 'selected', name: '긴 이름' },
  play: async ({ canvasElement, step }) => {
    // @codocs [[컴포넌트 목록:Windows 화면 요소]]
    await step('isSelected면 선택된 항목으로 알린다', async () => {
      await expect(getItem(canvasElement)).toHaveAttribute('data-selected', 'true');
    });
  },
};

// @codocs [[컴포넌트 목록:Windows 화면 요소]]
// 잘라낸 항목은 아이콘과 이름을 흐리게 그려 이름 글자의 색 대비가 모자라다.
// 색은 바꾸지 않는다. Windows 모양을 유지하기로 함([[접근성:색 대비]]).
export const Cut: Story = {
  args: { surface: 'explorer', state: 'cut', name: '긴 이름' },
  parameters: { a11y: { config: { rules: [{ id: 'color-contrast', enabled: false }] } } },
  play: async ({ canvasElement, step }) => {
    // @codocs [[컴포넌트 목록:Windows 화면 요소]]
    await step('isCut이면 잘라낸 항목으로 알린다', async () => {
      await expect(getItem(canvasElement)).toHaveAttribute('data-cut', 'true');
    });
  },
};

// @codocs [[컴포넌트 목록:Windows 화면 요소]]
export const Renaming: Story = {
  // 목록 항목(option) 안에 입력창이 들어가 nested-interactive에 걸린다. 앱의 바탕화면·탐색기 목록도 같은 구조다.
  parameters: { a11y: { config: { rules: [{ id: 'nested-interactive', enabled: false }] } } },
  args: {
    surface: 'explorer',
    state: 'rename',
    name: '문서',
    renameFieldProps: { 'aria-label': '새 이름' },
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    // @codocs [[컴포넌트 목록:Windows 화면 요소]]
    await step('isRenaming이면 이름 대신 name을 처음 값으로 가진 입력창을 그린다', async () => {
      await expect(canvas.getByRole('textbox')).toHaveValue('문서');
      await expect(canvas.queryByText('문서', { selector: 'span' })).not.toBeInTheDocument();
    });

    // @codocs [[컴포넌트 목록:Windows 화면 요소]]
    await step('renameFieldProps를 이름 바꾸기 입력창에 넘긴다', async () => {
      await expect(canvas.getByRole('textbox', { name: '새 이름' })).toHaveValue('문서');
    });

    // @codocs [[바탕화면 검수:1. 이름 바꾸기 입력창의 줄 바꿈]]
    await step('아이콘 보기의 입력창은 여러 줄 입력창이다', async () => {
      await expect(canvas.getByRole('textbox').tagName).toBe('TEXTAREA');
    });
  },
};

// @codocs [[바탕화면 검수:1. 이름 바꾸기 입력창의 줄 바꿈]]
/** 긴 이름의 입력창은 항목 너비 안에서 글자 단위로 줄을 바꾸며 아래로 길어지고 스크롤하지 않는다 */
export const RenamingLongName: Story = {
  // 목록 항목(option) 안에 입력창이 들어가 nested-interactive에 걸린다. 앱의 바탕화면·탐색기 목록도 같은 구조다.
  parameters: { a11y: { config: { rules: [{ id: 'nested-interactive', enabled: false }] } } },
  args: {
    surface: 'explorer',
    size: 'medium',
    state: 'rename',
    name: '아주아주긴폴더이름입니다abcdefghijklmnopqrstuvwxyz',
    renameFieldProps: { 'aria-label': '새 이름' },
  },
  play: async ({ canvasElement, canvas }) => {
    const item = getItem(canvasElement);
    const field = canvas.getByRole('textbox', { name: '새 이름' });
    const itemContentWidth = item.clientWidth - 2 * parseFloat(getComputedStyle(item).paddingLeft);
    await expect(field.offsetWidth).toBeLessThanOrEqual(itemContentWidth);
    await expect(field.offsetHeight).toBeGreaterThan(22 * 2);
    await expect(field.scrollHeight).toBe(field.clientHeight);
  },
};

// @codocs [[바탕화면 검수:2. 이름 바꾸는 동안의 선택 바탕]]
/** 바탕화면에서 이름을 바꾸는 중이면 선택돼 있어도 바탕이 없다 */
export const DesktopRenaming: Story = {
  render: () => (
    <Backdrop surface="desktop">
      <FileItem
        data-testid="renaming"
        icon={<i />}
        isSelected
        isRenaming
        renameFieldProps={{ 'aria-label': '새 이름' }}
      />
      <FileItem data-testid="rest" icon={<i />} />
    </Backdrop>
  ),
  play: async ({ canvas }) => {
    await expect(getComputedStyle(canvas.getByTestId('renaming')).backgroundColor).toBe(
      getComputedStyle(canvas.getByTestId('rest')).backgroundColor,
    );
  },
};

// @codocs [[바탕화면 검수:12. 탐색기 항목의 포커스 테두리]]
// @codocs [[바탕화면 검수:13. 포커스가 없는 선택은 회색]]
/**
 * 탐색기 항목의 선택 바탕과 현재 항목 선의 색은 목록(role="listbox")에 포커스가 있는지로 바뀐다.
 * 현재 항목 선은 포커스가 목록을 떠나도 남고, 현재 항목이 아닌 항목에는 없다. 선은 크기에 넣지 않는다
 */
export const ListFocus: Story = {
  render: () => (
    <div role="listbox" aria-label="폴더 내용">
      <FileItem
        data-testid="current"
        role="option"
        aria-selected
        tabIndex={0}
        surface="explorer"
        icon={<i />}
        name="현재"
        isSelected
        isCurrent
      />
      <FileItem
        data-testid="other"
        role="option"
        aria-selected={false}
        tabIndex={-1}
        surface="explorer"
        icon={<i />}
        name="다른 항목"
      />
    </div>
  ),
  play: async ({ canvas, userEvent: user, step }) => {
    const current = canvas.getByTestId('current');
    const other = canvas.getByTestId('other');
    const { offsetWidth, offsetHeight } = current;
    const unfocusedBackground = getComputedStyle(current).backgroundColor;
    const unfocusedLine = getComputedStyle(current, '::before').backgroundColor;

    await step(
      '포커스가 목록 밖이어도 현재 항목 선은 있고, 현재 항목이 아닌 항목에는 없다',
      async () => {
        await expect(getComputedStyle(current, '::before').content).not.toBe('none');
        await expect(getComputedStyle(other, '::before').content).toBe('none');
      },
    );

    await step('포커스가 목록 안에 들어오면 선택 바탕과 선 색이 바뀌고 크기는 같다', async () => {
      await user.tab();
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

// @codocs [[바탕화면 검수:3. 끄는 복제본의 선택 바탕]]
/** 목록 밖에 그리는 항목(끄는 복제본)은 isListFocused면 목록에 포커스가 있는 항목과 같은 파란 바탕·검은 선이다 */
export const ListFocusedOutsideList: Story = {
  render: () => (
    <>
      <div role="listbox" aria-label="폴더 내용">
        <FileItem
          data-testid="in-list"
          role="option"
          aria-selected
          tabIndex={0}
          surface="explorer"
          icon={<i />}
          isSelected
          isCurrent
        />
      </div>
      <FileItem
        data-testid="ghost"
        aria-hidden="true"
        surface="explorer"
        icon={<i />}
        isSelected
        isCurrent
        isListFocused
      />
    </>
  ),
  play: async ({ canvas, userEvent: user }) => {
    const inList = canvas.getByTestId('in-list');
    const ghost = canvas.getByTestId('ghost');
    await expect(getComputedStyle(ghost).backgroundColor).not.toBe(
      getComputedStyle(inList).backgroundColor,
    );

    await user.tab();
    await expect(inList).toHaveFocus();
    await expect(getComputedStyle(ghost).backgroundColor).toBe(
      getComputedStyle(inList).backgroundColor,
    );
    await expect(getComputedStyle(ghost, '::before').backgroundColor).toBe(
      getComputedStyle(inList, '::before').backgroundColor,
    );
  },
};
