import type { Meta, StoryObj } from "@storybook/react-vite";

import type { WindowItem } from "../../../../types/windowItem";
import type { WindowItemActionState } from "../../../../types/windowItemAction";
import type { SearchPanelSection } from "./index";
import { SearchPanel } from "./index";

const RECOMMENDED_ITEMS: WindowItem[] = [
  { id: "component-vs-css", title: "Component VS CSS 세분화" },
  { id: "ssr-csr", title: "SSR에서 CSR 왜 바꿨을까?" },
  { id: "data-type", title: "데이터 타입을 공부하고" },
  { id: "js-data-type", title: "자바스크립트 데이터 타입" },
  { id: "wooacon", title: "우아콘 2025" },
  { id: "yeolong", title: "얼롱 – 여행 순간 기록·공유 서비스" },
  { id: "notion-api", title: "Notion API 어떻게 불러와야 할까?" },
  { id: "my-homepage", title: "나만의 홈페이지를 만들고" },
  { id: "js-jit", title: "JavaScript JIT가 뭐야?" },
  { id: "critical-js", title: "Critical JavaScript. 언제, 어떻게" },
];

const BEST_SECTIONS: SearchPanelSection[] = [
  {
    items: [
      { id: "media-list", title: "미디어 리스트 속도 개선기" },
      { id: "2025-retro", title: "2025를 보내며" },
      { id: "cookie-networking", title: "쿠키... 네트워킹 처리의 고민" },
      { id: "my-homepage-best", title: "나만의 홈페이지를 만들고" },
      { id: "component-vs-css-best", title: "Component VS CSS 세분화" },
      { id: "notion-api-best", title: "Notion API 어떻게 불러와야 할까?" },
    ],
    title: "최고의 블로그글",
  },
  {
    items: [
      { id: "neu-blog", title: "NEU - Windows 테마 개인 블로그" },
      { id: "itgo", title: "잇고잇고 – 이력 관리 서비스" },
      { id: "yeolong-best", title: "얼롱 – 여행 순간 기록·공유 서비스" },
    ],
    title: "최고의 프로젝트",
  },
];

const RESULTS: WindowItem[] = [
  { description: "블로그", id: "server-count", title: "서버 증설 횟수" },
  { description: "소개", id: "resume", title: "서재완 - 이력서" },
  {
    description: "블로그",
    id: "ssr-csr-result",
    title: "SSR에서 CSR 왜 바꿨을까?",
  },
];

const DETAIL_ACTIONS: WindowItemActionState[] = [
  { id: "open" },
  { id: "openLocation" },
  { id: "pinToStart" },
  { id: "pinToTaskbar" },
];

const meta = {
  title: "Taskbar/Panel/SearchPanel",
  component: SearchPanel,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "taskbar 검색(TaskbarSearch)에서 열리는 검색 패널. 검색어가 없으면 추천/최고 목록을, " +
          "있으면 TaskSearchResultView 결과를 보여준다. 각 Story는 추천, 결과, 상세 선택 상태를 " +
          "고정 props로 바로 표시한다.",
      },
    },
  },
  args: {
    bestSections: BEST_SECTIONS,
    recommendedItems: RECOMMENDED_ITEMS,
    // Storybook 캔버스에서는 viewport 기반 반응형 폭 대신 고정 폭으로 확인
    style: { width: 620 },
  },
} satisfies Meta<typeof SearchPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const SearchResults: Story = {
  args: {
    results: RESULTS,
    searchValue: "서",
  },
};

export const SearchResultDetail: Story = {
  args: {
    detailActions: DETAIL_ACTIONS,
    detailItemId: "server-count",
    onDetailAction: () => undefined,
    results: RESULTS,
    searchValue: "서",
  },
};
