import type { Meta, StoryObj } from '@storybook/react-vite';

import popoverExport from '../../../figma/components/popover/export.json';
import { FigmaFrame } from '../../story/figma-frame';
import { Flyout } from '../flyout/flyout';
import { IconButton } from '../icon-button/icon-button';
import { MenuItem } from '../menu-item/menu-item';
import { MenuSeparator } from '../menu-separator/menu-separator';
import { Popover } from './popover';

// 피그마 Popover의 변형 속성 값이다(정규화한 이름).
const PLACEMENTS = [
  'bottom-start',
  'bottom-center',
  'bottom-end',
  'top-center',
  'top-end',
  'right-start',
] as const;
const STATES = ['closed', 'open'] as const;

// 피그마 Popup 슬롯 기본 내용(Flyout)의 Content 슬롯 경로다. 메뉴 항목은 이 안에서 메뉴 너비로 고정이다.
const FLYOUT_CONTENT = 'Popup/Flyout/Content';

type FigmaArgs = {
  placement: (typeof PLACEMENTS)[number];
  state: (typeof STATES)[number];
};

const meta = {
  title: 'Components/Popover',
  // 위·오른쪽으로 뜨는 팝업이 화면 밖으로 나가지 않도록 가운데에 둔다.
  parameters: { layout: 'centered' },
  args: { placement: 'bottom-start', state: 'closed' },
  argTypes: {
    placement: { control: 'select', options: PLACEMENTS },
    state: { control: 'inline-radio', options: STATES },
  },
  // Trigger·Popup 슬롯에는 피그마 슬롯 기본 내용과 같은 전원 버튼(IconButton Subtle)과
  // 메뉴 항목 넷과 구분선을 담은 Flyout을 넣는다. Flyout은 너비가 없어 내용에 맞추므로,
  // 피그마에서 메뉴 항목은 메뉴 너비(size/menu/width)로 고정이라 FigmaFrame이 그 노드의 크기로 감싸고,
  // 구분선은 Flyout이 그 너비로 채운다. 팝업은 열렸을 때만 그려진다.
  render: (args) => (
    <Popover
      placement={args.placement}
      open={args.state === 'open'}
      trigger={
        <IconButton variant="subtle" label="전원" icon="icons/ic_fluent_power_20_regular.svg" />
      }
      popup={
        <Flyout>
          <FigmaFrame source={popoverExport} args={args} node={`${FLYOUT_CONTENT}/item 열기`}>
            <MenuItem isStandalone label="열기" icon="icons/ic_fluent_open_20_regular.svg" />
          </FigmaFrame>
          <FigmaFrame
            source={popoverExport}
            args={args}
            node={`${FLYOUT_CONTENT}/item 새 창에서 열기`}
          >
            <MenuItem
              isStandalone
              label="새 창에서 열기"
              icon="icons/ic_fluent_window_20_regular.svg"
            />
          </FigmaFrame>
          <MenuSeparator />
          <FigmaFrame
            source={popoverExport}
            args={args}
            node={`${FLYOUT_CONTENT}/item 이름 바꾸기`}
          >
            <MenuItem
              isStandalone
              label="이름 바꾸기"
              icon="icons/ic_fluent_rename_20_regular.svg"
              shortcut="F2"
            />
          </FigmaFrame>
          <FigmaFrame source={popoverExport} args={args} node={`${FLYOUT_CONTENT}/item 삭제`}>
            <MenuItem
              isStandalone
              label="삭제"
              icon="icons/ic_fluent_delete_20_regular.svg"
              shortcut="Delete"
            />
          </FigmaFrame>
        </Flyout>
      }
    />
  ),
} satisfies Meta<FigmaArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형 하나를 args 하나로 고른다.
export const Figma: Story = {};
