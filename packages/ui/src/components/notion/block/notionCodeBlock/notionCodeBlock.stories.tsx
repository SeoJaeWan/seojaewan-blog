import type { Meta, StoryObj } from "@storybook/react-vite";

import { NotionCodeBlock } from "./index";

const SAMPLE_CODE = `export const usePins = () => {
  const context = useContext(PinContext);

  if (!context) {
    throw new Error("usePins must be used within a PinProvider");
  }

  return context;
};`;

const meta = {
  title: "Notion/Block/NotionCodeBlock",
  component: NotionCodeBlock,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Notion 코드 블록 visual. 헤더의 언어, 복사 버튼과 copied 상태를 props로 직접 " +
          "표현하고 본문은 가로 스크롤 pre로 그린다. clipboard와 timer는 기능 계층이 연결한다.",
      },
    },
  },
  args: {
    code: SAMPLE_CODE,
    language: "typescript",
  },
  decorators: [
    (Story) => (
      <div className="wb-notion-content">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof NotionCodeBlock>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** clipboard 동작 없이 복사 완료 문구 자체를 고정해서 보여준다 */
export const Copied: Story = {
  args: { copied: true },
};

/** 캡션은 코드 프레임 바깥 아래에 회색으로 붙는다 */
export const WithCaption: Story = {
  args: { caption: "PinProvider 밖에서 호출하면 throw하는 필수 reader" },
};

/** 긴 줄은 줄바꿈 없이 가로 스크롤 */
export const LongLine: Story = {
  args: {
    code: 'const message = "이 줄은 아주 길어서 코드 프레임의 폭을 넘어가며, 줄바꿈 대신 가로 스크롤로 처리된다는 것을 보여주기 위한 예시 문자열입니다.";',
    language: "javascript",
  },
};
