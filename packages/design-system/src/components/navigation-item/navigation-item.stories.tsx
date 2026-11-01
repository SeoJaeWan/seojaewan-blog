import type { Meta, StoryObj } from '@storybook/react-vite';
import type { JSX, ReactNode } from 'react';
import { expect, fn } from 'storybook/test';

import { NavigationItem } from './navigation-item';

// 피그마 Item icon 속성의 기본 인스턴스(폴더 아이콘)다. Vite와 Next.js가 모두 파일 주소로 바꿔 준다.
const folderIcon = new URL('../../assets/images/file-folder.webp', import.meta.url).href;

// 피그마 NavigationItem의 변형 속성 값이다(정규화한 이름). Hover는 캡처 도구가 마우스로 재현한다.
const EXPANDS = ['none', 'collapsed', 'expanded'] as const;
const STATES = ['rest', 'hover', 'selected'] as const;
const LEVELS = ['0', '1', '2', '3'] as const;

type FigmaArgs = {
  expand: (typeof EXPANDS)[number];
  state: (typeof STATES)[number];
  level: (typeof LEVELS)[number];
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
  args: { expand: 'none', state: 'rest', level: '0', label: '항목 이름' },
  argTypes: {
    expand: { control: 'inline-radio', options: EXPANDS },
    state: { control: 'inline-radio', options: STATES },
    level: { control: 'inline-radio', options: LEVELS },
    label: { control: 'text' },
  },
  // 너비는 쓰는 곳이 정하므로 피그마 원본 너비 240으로 감싼다([[디자인 시스템:컴포넌트 조립 규칙]]). treeitem은 tree 안에서만 쓴다.
  render: (args) => (
    <div role="tree" aria-label="탐색 창" className="w-size-navigation-item-width">
      <NavigationItem
        expand={args.expand}
        selected={args.state === 'selected'}
        level={Number(args.level) as 0 | 1 | 2 | 3}
        label={args.label}
        icon={<img src={folderIcon} alt="" className="size-size-icon-sm object-contain" />}
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

/**
 * treeitem은 tree 안에서만 쓰므로 동작 스토리도 tree로 감싼다.
 * @param props
 * @param props.children 감쌀 항목
 * @returns tree
 */
function TreeFrame(props: { children: ReactNode }): JSX.Element {
  return (
    <div role="tree" aria-label="탐색 창" className="w-size-navigation-item-width">
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
/** selected면 선택된 항목이다 */
export const Selected: Story = {
  render: () => (
    <TreeFrame>
      <NavigationItem selected label="문서" icon={<i />} />
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
