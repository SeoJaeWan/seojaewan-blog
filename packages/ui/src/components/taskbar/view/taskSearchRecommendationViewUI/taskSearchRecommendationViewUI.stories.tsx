import type { Meta, StoryObj } from "@storybook/react-vite";

import type { WindowItem } from "../../../../types/windowItem";
import type { TaskSearchRecommendationSection } from "./index";
import { TaskSearchRecommendationViewUI } from "./index";

const RECOMMENDED_ITEMS: WindowItem[] = [
  { id: "component-vs-css", title: "Component VS CSS 세분화" },
  { id: "ssr-csr", title: "SSR에서 CSR 왜 바꿨을까?" },
  { id: "data-type", title: "데이터 타입을 공부하고" },
  { id: "js-data-type", title: "자바스크립트 데이터 타입" },
  { id: "wooacon", title: "우아콘 2025" },
  { id: "notion-api", title: "Notion API 어떻게 불러와야 할까?" },
];

const BEST_SECTIONS: TaskSearchRecommendationSection[] = [
  {
    items: [
      { id: "media-list", title: "미디어 리스트 속도 개선기" },
      { id: "2025-retro", title: "2025를 보내며" },
      { id: "cookie-networking", title: "쿠키... 네트워킹 처리의 고민" },
      { id: "my-homepage", title: "나만의 홈페이지를 만들고" },
      { id: "component-vs-css-best", title: "Component VS CSS 세분화" },
      { id: "notion-api-best", title: "Notion API 어떻게 불러와야 할까?" },
    ],
    title: "최고의 블로그글",
  },
  {
    items: [
      { id: "neu-blog", title: "NEU - Windows 테마 개인 블로그" },
      { id: "itgo", title: "잇고잇고 – 이력 관리 서비스" },
      { id: "yeolong", title: "얼롱 – 여행 순간 기록·공유 서비스" },
    ],
    title: "최고의 프로젝트",
  },
];

const meta = {
  title: "Taskbar/View/TaskSearchRecommendationViewUI",
  component: TaskSearchRecommendationViewUI,
  decorators: [
    (Story) => (
      <div style={{ fontSize: 14, height: 420, width: 620 }}>
        <Story />
      </div>
    ),
  ],
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "SearchPanelUI이 검색어가 없을 때 사용하는 추천 visual이다. " +
          "추천 목록과 best section을 controlled props로 렌더링한다.",
      },
    },
  },
  args: {
    bestSections: BEST_SECTIONS,
    recommendedItems: RECOMMENDED_ITEMS,
  },
} satisfies Meta<typeof TaskSearchRecommendationViewUI>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
