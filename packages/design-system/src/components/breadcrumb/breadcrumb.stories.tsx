import type { Meta, StoryObj } from '@storybook/react-vite';

import { BreadcrumbItem } from '../breadcrumb-item/breadcrumb-item';
import { Breadcrumb } from './breadcrumb';

const folderIcon = new URL('../../assets/images/file-folder.webp', import.meta.url).href;

const meta = {
  title: 'Components/Breadcrumb',
  // 변형 속성이 없다.
  render: () => (
    // Breadcrumb은 너비를 갖지 않고 쓰는 곳이 정한다. 피그마 원본의 미리보기 너비 480으로 감싼다.
    <div className="w-size-breadcrumb-width">
      {/* 피그마 `Location icon` 기본 인스턴스(file/Folder)다. */}
      <Breadcrumb
        locationIcon={<img src={folderIcon} alt="" className="size-full object-contain" />}
      >
        {/* 피그마 Items 슬롯의 기본 내용이다. */}
        <BreadcrumbItem label="바탕 화면" />
        <BreadcrumbItem label="Blog" current showSeparator={false} />
      </Breadcrumb>
    </div>
  ),
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형 하나(default)를 그린다.
export const Figma: Story = {};
