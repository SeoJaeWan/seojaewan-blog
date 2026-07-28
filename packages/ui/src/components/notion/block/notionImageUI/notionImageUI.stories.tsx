import type { Meta, StoryObj } from "@storybook/react-vite";

import windowsWallpaperSrc from "../../../../assets/windows.webp";
import { NotionImageUI } from "./index";

const meta = {
  title: "Notion/Block/NotionImageUI",
  component: NotionImageUI,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Notion 이미지 블록. src는 sync 단계에서 자산화된 경로(만료 없는 자체 자산)를 " +
          "받는다 — 만료되는 Notion 서명 URL은 ui에 도달하지 않는다. 캡션은 NotionRichTextUI로 " +
          "그리고, 클릭 확대(라이트박스)는 후속.",
      },
    },
  },
  args: { src: windowsWallpaperSrc },
  decorators: [
    (Story) => (
      <div className="wb-notion-content" style={{ maxWidth: 640 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof NotionImageUI>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** 캡션 — annotation/링크도 쓸 수 있다 */
export const WithCaption: Story = {
  args: {
    alt: "Windows 11 기본 배경화면",
    caption: [
      { text: "Windows 11 기본 배경화면 — " },
      { annotations: { italic: true }, text: "블로그 데스크톱의 바탕이 되는 이미지" },
    ],
  },
};
