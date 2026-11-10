import breadcrumbMenuExport from '@figma/patterns/explorer/breadcrumb-menu/export.json';
import type { Meta, StoryObj } from '@storybook/react-vite';
import type { JSX, ReactElement } from 'react';
import { expect, screen, within } from 'storybook/test';

import { BreadcrumbItem, ExplorerAddressRow, ImageAsset } from '@seojaewan/design-system';
import { figmaFrame } from '@seojaewan/design-system/story';

import { MenuButton } from '@/shared/components/menu-button/menu-button';
import { menuStoryA11y } from '@/shared/components/menu-popup/story-menu';

import { getBreadcrumbMenuEntries } from './breadcrumb-menu-entries';
import { BREADCRUMB_MENU_TRAIL, breadcrumbMenuTargets } from './story-data';

/** 조립 스토리는 목록에서 골라도 가지 않는다. */
function handleNavigate(): void {}

/**
 * 열린 꺾쇠 목록. 실제 탐색기(`ExplorerWindowLayer`)와 같은 목록 버튼(MenuButton)과 항목 함수로 그리고, 언제나 열려 있다.
 * @param separator 꺾쇠 버튼
 * @returns 꺾쇠와 열린 목록
 */
function renderOpenMenu(separator: ReactElement): JSX.Element {
  return (
    <MenuButton
      trigger={separator}
      items={getBreadcrumbMenuEntries(breadcrumbMenuTargets, handleNavigate)}
      isOpen
    />
  );
}

/**
 * 경로 꺾쇠 목록(피그마 Explorer/BreadcrumbMenu)을 그린다. 주소 줄의 마지막 마디(Blog) 뒤 꺾쇠가 열려 하위 폴더 목록을 보인다.
 * @returns 주소 줄과 열린 목록
 */
function StoryBreadcrumbMenu(): JSX.Element {
  return (
    <ExplorerAddressRow
      device="desktop"
      locationIcon={<ImageAsset name="images/file-folder" />}
      canGoUp
    >
      {BREADCRUMB_MENU_TRAIL.map((label, index) => {
        const isLast = index === BREADCRUMB_MENU_TRAIL.length - 1;
        return (
          <BreadcrumbItem
            key={label}
            label={label}
            isCurrent={isLast}
            isSeparatorOpen={isLast}
            renderSeparator={isLast ? renderOpenMenu : undefined}
          />
        );
      })}
    </ExplorerAddressRow>
  );
}

// @codocs [[피그마 연동:스토리 규칙]]
// 제목은 Patterns/ + 피그마 조립 이름이다. 변형이 없는 조립이라 args가 없다. 목록은 문서 끝(body)에 포털하지만
// 캡처는 프레임 자리를 잘라 찍으므로 프레임 위에 겹친 목록도 함께 찍힌다.
const meta = {
  title: 'Patterns/Explorer/BreadcrumbMenu',
  parameters: { a11y: menuStoryA11y },
  decorators: [figmaFrame(breadcrumbMenuExport)],
  render: () => <StoryBreadcrumbMenu />,
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[파일 탐색기:구성]]
/** 열린 꺾쇠는 아래 꺾쇠(⌄)이고, 목록은 그 마디 폴더의 하위 폴더를 위치 아이콘과 함께 보인다 */
export const Figma: Story = {
  play: async ({ canvasElement }) => {
    const separators = within(canvasElement).getAllByRole('button', { name: '하위 폴더' });
    await expect(separators.map((separator) => separator.getAttribute('data-open'))).toEqual([
      'false',
      'true',
    ]);
    await expect((await screen.findAllByRole('menuitem')).map((item) => item.textContent)).toEqual(
      breadcrumbMenuTargets.map((target) => target.name),
    );
  },
};
