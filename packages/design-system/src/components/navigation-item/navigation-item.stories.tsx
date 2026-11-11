import type { Meta, StoryObj } from '@storybook/react-vite';
import type { JSX, ReactNode } from 'react';
import { expect, fn, waitFor } from 'storybook/test';

import navigationItemExport from '../../../figma/components/navigation-item/export.json';
import { figmaFrame } from '../../story/figma-frame';
import { NavigationItem } from './navigation-item';

// 피그마 Item icon 속성의 기본 인스턴스(폴더 아이콘)다. Vite와 Next.js가 모두 파일 주소로 바꿔 준다.
const folderIcon = new URL('../../assets/images/file-folder.webp', import.meta.url).href;

// 피그마 NavigationItem의 변형 속성 값이다(정규화한 이름).
// Selected(파랑)와 Selected unfocused(회색)는 prop이 아니라 트리 포커스로 갈리므로, Figma 스토리는 Selected일 때만 그리면서 칸에 포커스를 준다.
const EXPANDS = ['none', 'collapsed', 'expanded'] as const;
const STATES = ['rest', 'hover', 'selected', 'selected-unfocused'] as const;
const LEVELS = ['0', '1', '2', '3'] as const;

/**
 * 그린 칸에 포커스를 준다. 피그마 State=Selected는 트리에 포커스가 있는 모습이다.
 * @param element 칸 요소
 */
function focusOnMount(element: HTMLDivElement | null): void {
  element?.focus();
}

type FigmaArgs = {
  expand: (typeof EXPANDS)[number];
  state: (typeof STATES)[number];
  level: (typeof LEVELS)[number];
  /** 피그마 Current 변형 */
  isCurrent: boolean;
  /** 피그마 BOOLEAN 속성 Has pin */
  hasPin: boolean;
  /** 피그마 TEXT 속성 Label */
  label: string;
  /** 동작 스토리에서 호출 횟수를 확인하는 핸들러 */
  onClick?: () => void;
  /** 동작 스토리에서 꺾쇠 누르기를 확인하는 핸들러 */
  onChevronClick?: () => void;
};

const meta = {
  title: 'Components/NavigationItem',
  // 글자는 피그마 Label 속성의 기본값과 같아야 한다([[피그마 연동:스토리 규칙]]).
  args: {
    expand: 'none',
    state: 'rest',
    level: '0',
    isCurrent: false,
    hasPin: false,
    label: '항목 이름',
  },
  argTypes: {
    expand: { control: 'inline-radio', options: EXPANDS },
    state: { control: 'inline-radio', options: STATES },
    level: { control: 'inline-radio', options: LEVELS },
    isCurrent: { control: 'boolean' },
    hasPin: { control: 'boolean' },
    label: { control: 'text' },
  },
  // 너비는 쓰는 곳이 정하므로 FigmaFrame이 피그마 원본 크기로 감싼다([[디자인 시스템:컴포넌트 조립 규칙]]).
  // treeitem은 tree 안에서만 쓴다. 동작 스토리도 같은 크기로 감싼다.
  decorators: [figmaFrame(navigationItemExport)],
  // 선택 색은 칸을 담은 트리(role="tree")의 포커스로 고른다.
  // 칸은 앱의 트리처럼 포커스를 받을 수 있게 tabIndex를 둔다.
  render: (args) => (
    <div role="tree" aria-label="탐색 창">
      <NavigationItem
        tabIndex={-1}
        ref={args.state === 'selected' ? focusOnMount : undefined}
        expand={args.expand}
        isSelected={args.state === 'selected' || args.state === 'selected-unfocused'}
        isCurrent={args.isCurrent}
        hasPin={args.hasPin}
        level={Number(args.level) as 0 | 1 | 2 | 3}
        label={args.label}
        icon={<img src={folderIcon} alt="" />}
      />
    </div>
  ),
} satisfies Meta<FigmaArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// @codocs [[디자인 시스템:아이콘 자리]]
// @codocs [[파일 탐색기:탐색 창]]
// 피그마 변형 하나를 args 하나로 고른다. Selected는 트리에 포커스가 있는 모습이라 칸에 포커스를 준다.
export const Figma: Story = {};

/**
 * treeitem은 tree 안에서만 쓰므로 동작 스토리도 tree로 감싼다.
 * @param props
 * @param props.children 감쌀 항목
 * @returns tree
 */
function TreeFrame(props: { children: ReactNode }): JSX.Element {
  return (
    <div role="tree" aria-label="탐색 창">
      {props.children}
    </div>
  );
}

// @codocs [[컴포넌트 목록:Windows 화면 요소]]
// @codocs [[디자인 시스템:아이콘 자리]]
/** label을 이름으로 갖는 treeitem이다. 꺾쇠가 없으면(expand none) 펼침 상태를 알리지 않고, icon 슬롯을 그린다 */
export const Default: Story = {
  render: () => (
    <TreeFrame>
      <NavigationItem label="문서" icon={<i>아이콘</i>} />
    </TreeFrame>
  ),
  play: async ({ canvas }) => {
    const item = canvas.getByRole('treeitem', { name: /문서/u });
    await expect(canvas.getByText('아이콘')).toBeInTheDocument();
    await expect(item).not.toHaveAttribute('aria-expanded');
    await expect(item).toHaveAttribute('aria-selected', 'false');
  },
};

// @codocs [[컴포넌트 목록:Windows 화면 요소]]
/** expand에 따라 접힘·펼침 상태를 aria-expanded로 알리고, chevron 슬롯을 그린다 */
export const Expandable: Story = {
  render: () => (
    <TreeFrame>
      <NavigationItem label="접힘" expand="collapsed" icon={<i />} chevron={<i>꺾쇠</i>} />
      <NavigationItem label="펼침" expand="expanded" icon={<i />} />
    </TreeFrame>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('treeitem', { name: /접힘/u })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    await expect(canvas.getByRole('treeitem', { name: /펼침/u })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    await expect(canvas.getByText('꺾쇠')).toBeInTheDocument();
  },
};

// @codocs [[컴포넌트 목록:Windows 화면 요소]]
/** isSelected면 선택된 항목이다 */
export const Selected: Story = {
  render: () => (
    <TreeFrame>
      <NavigationItem isSelected label="문서" icon={<i />} />
    </TreeFrame>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('treeitem', { name: /문서/u })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  },
};

// @codocs [[컴포넌트 목록:Windows 화면 요소]]
/** 꺾쇠를 누르면 onChevronClick만 부르고 항목 누르기(onClick)로 올리지 않는다 */
export const ChevronClick: Story = {
  args: { onClick: fn(), onChevronClick: fn() },
  render: ({ onClick: handleClick, onChevronClick: handleChevronClick }) => (
    <TreeFrame>
      <NavigationItem
        expand="collapsed"
        label="문서"
        icon={<i />}
        chevron={<i>꺾쇠</i>}
        onChevronClick={handleChevronClick}
        onClick={handleClick}
      />
    </TreeFrame>
  ),
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByText('꺾쇠'));

    await expect(args.onChevronClick).toHaveBeenCalledTimes(1);
    await expect(args.onClick).not.toHaveBeenCalled();
  },
};

// @codocs [[파일 탐색기:탐색 창]]
/** 선택 바탕과 현재 칸 선은 트리에 포커스가 있을 때와 없을 때 색이 다르고, 포커스를 받아도 브라우저 기본 외곽선을 그리지 않는다 */
export const SelectionFollowsTreeFocus: Story = {
  render: () => (
    <>
      <TreeFrame>
        <NavigationItem tabIndex={0} isSelected isCurrent label="문서" icon={<i />} />
      </TreeFrame>
      <button type="button">트리 밖</button>
    </>
  ),
  play: async ({ canvas }) => {
    const item = canvas.getByRole('treeitem', { name: /문서/u });
    // getComputedStyle은 살아 있는 값이라 지금 색은 배열로 따로 남긴다.
    const unfocused = getComputedStyle(item);
    const unfocusedColors = [unfocused.backgroundColor, unfocused.borderTopColor];

    item.focus();
    // 바탕은 상태 전환 모션으로 바뀌므로 끝날 때까지 기다린다.
    await waitFor(() =>
      expect([unfocused.backgroundColor, unfocused.borderTopColor]).not.toEqual(unfocusedColors),
    );
    await expect(unfocused.outlineStyle).toBe('none');

    canvas.getByRole('button', { name: '트리 밖' }).focus();
    await waitFor(() =>
      expect([unfocused.backgroundColor, unfocused.borderTopColor]).toEqual(unfocusedColors),
    );
  },
};

// @codocs [[고정:즐겨찾기 고정]]
/** hasPin이면 이름 뒤에 압정 아이콘 자리를 하나 더 그린다 */
export const Pinned: Story = {
  render: () => (
    <TreeFrame>
      <NavigationItem label="고정" hasPin icon={<i />} />
      <NavigationItem label="보통" icon={<i />} />
    </TreeFrame>
  ),
  play: async ({ canvas }) => {
    const pinned = canvas.getByRole('treeitem', { name: /고정/u });
    const plain = canvas.getByRole('treeitem', { name: /보통/u });
    await expect(pinned.children).toHaveLength(plain.children.length + 1);
    await expect(pinned.lastElementChild?.querySelector('svg')).not.toBeNull();
  },
};
