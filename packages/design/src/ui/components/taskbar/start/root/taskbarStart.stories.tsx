import type { ReactNode } from "react";
import { useMemo, useState } from "react";

import type { Meta, StoryObj } from "@storybook/react-vite";

import {
  createHeadlessRuntime,
  createResourceRef,
  createStaticCatalog,
  type HeadlessRuntimeAdapters,
  HeadlessRuntimeProvider,
  type ResourceReaders,
  type ResourceRef,
  type StartSnapshot,
  type StartStoreCommandContext,
  type StartStoreResult,
  type WindowState,
  type WindowStoreResult,
} from "../../../../../headless/index.js";
import {
  type TaskbarPanelsConnection,
  useTaskbarPanelsConnection,
} from "../../panels/connection/index.js";
import { withTaskbarDescription } from "../../taskbarStoryPreview.js";
import { TaskbarStart } from "./index.js";

const folder = createResourceRef("folder", "30000000-0000-4000-8000-000000000001");
const alpha = createResourceRef("content", "30000000-0000-4000-8000-000000000002");
const hangul = createResourceRef("content", "30000000-0000-4000-8000-000000000003");
const shortcut = createResourceRef(
  "external-shortcut",
  "30000000-0000-4000-8000-000000000004",
);
const symbol = createResourceRef(
  "external-shortcut",
  "30000000-0000-4000-8000-000000000005",
);

const resources = Object.freeze({
  folder: createStaticCatalog([{ ref: folder, name: "프로젝트 폴더" }]),
  content: createStaticCatalog([
    {
      ref: alpha,
      title: "Alpha 문서",
      slug: "alpha",
      summary: "Start fixture",
      date: "2026-09-10",
      tags: [],
      cover: null,
      source: { kind: "notion" as const, pageId: "alpha" },
    },
    {
      ref: hangul,
      title: "가나다 아주 긴 문서 제목으로 두 줄 표현 확인",
      slug: "hangul",
      summary: "Start fixture",
      date: "2026-09-09",
      tags: [],
      cover: null,
      source: { kind: "notion" as const, pageId: "hangul" },
    },
  ]),
  externalShortcut: createStaticCatalog([
    { ref: shortcut, name: "7zip", url: "https://example.com/7zip" },
    { ref: symbol, name: "_Tool", url: "https://example.com/tool" },
  ]),
}) satisfies ResourceReaders;

const desktopSnapshot = Object.freeze({
  mode: "desktop",
  workArea: Object.freeze({ x: 0, y: 0, width: 1440, height: 850 }),
  sessions: Object.freeze([]),
  stackingOrder: Object.freeze([]),
  activeSessionId: null,
}) satisfies WindowState;

/** Story의 Start Operation이 실제 Pin commit과 transition 순서를 사용할 local adapter다. */
const createStartAdapter = () => {
  let snapshot = Object.freeze({
    pinnedItems: Object.freeze(
      [folder, alpha, shortcut, hangul, symbol].map((resource) => Object.freeze({ resource })),
    ),
  }) satisfies StartSnapshot;
  const listeners = new Set<() => void>();
  const same = (left: ResourceRef, right: ResourceRef) =>
    left.kind === right.kind && left.id === right.id;
  const commit = (
    pinnedItems: StartSnapshot["pinnedItems"],
    context?: StartStoreCommandContext,
  ): Promise<StartStoreResult> => {
    snapshot = Object.freeze({ pinnedItems: Object.freeze([...pinnedItems]) });
    context?.onCommit(snapshot);
    for (const listener of listeners) listener();
    return Promise.resolve(Object.freeze({ ok: true, value: snapshot }));
  };

  return Object.freeze({
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    isPinned: (resource: ResourceRef) =>
      snapshot.pinnedItems.some((item) => same(item.resource, resource)),
    pin: (resource: ResourceRef, context?: StartStoreCommandContext) =>
      snapshot.pinnedItems.some((item) => same(item.resource, resource))
        ? Promise.resolve(Object.freeze({ ok: false, reason: "no-op" }))
        : commit([...snapshot.pinnedItems, { resource }], context),
    unpin: (resource: ResourceRef, context?: StartStoreCommandContext) =>
      commit(
        snapshot.pinnedItems.filter((item) => !same(item.resource, resource)),
        context,
      ),
    reorder: (
      resource: ResourceRef,
      intent: "first" | "left" | "right" | Readonly<{ type: "index"; index: number }>,
      context?: StartStoreCommandContext,
    ) => {
      const items = [...snapshot.pinnedItems];
      const index = items.findIndex((item) => same(item.resource, resource));
      const [item] = items.splice(index, 1);
      const target =
        typeof intent === "object"
          ? intent.index
          : intent === "first"
            ? 0
            : intent === "left"
              ? index - 1
              : index + 1;
      if (item !== undefined) items.splice(Math.max(0, Math.min(items.length, target)), 0, item);
      return commit(items, context);
    },
  }) as NonNullable<HeadlessRuntimeAdapters["start"]>;
};

/** WindowSession을 만들지 않는 고정 desktop reader와 명시적 open 결과를 제공한다. */
const createStartRuntime = (onOpen: (label: string) => void) => {
  const noOp = (): Promise<WindowStoreResult> =>
    Promise.resolve(Object.freeze({ ok: true, changed: false, reason: "no-op", value: desktopSnapshot }));
  const windows = {
    getSnapshot: () => desktopSnapshot,
    subscribe: () => () => undefined,
    openFolder: () => {
      onOpen("folder: 프로젝트 폴더");
      return noOp();
    },
    openContent: (resource: ResourceRef) => {
      onOpen(`content: ${resources.content.get(resource.id)?.title ?? resource.id}`);
      return noOp();
    },
  } as unknown as NonNullable<HeadlessRuntimeAdapters["windows"]>;
  return createHeadlessRuntime({
    adapters: { start: createStartAdapter(), windows },
    externalNavigation: {
      openNewTab: (intent) => {
        onOpen(`external: ${intent.url}`);
        return Object.freeze({ status: "succeeded" });
      },
    },
  });
};

/** 실제 Start connection의 제품 state를 Story 결과 영역과 함께 표시한다. */
const ConnectedStart = () => {
  const panels = useTaskbarPanelsConnection({ resources });
  return (
    <StartStoryLayout panels={panels}>
      <TaskbarStart
        connection={panels.start}
        renderSearchBody={(query) => (
          <section aria-label="Start Search 후속 경계">
            <p>HDJG-47 Search 결과 경계</p>
            <output aria-label="Start Search query">{query}</output>
          </section>
        )}
      />
    </StartStoryLayout>
  );
};

/** 제품 part와 외부 focus 대상, 관찰 결과를 분리해 배치한다. */
const StartStoryLayout = ({
  children,
  panels,
}: {
  children: ReactNode;
  panels: TaskbarPanelsConnection;
}) => (
  <div
    lang="ko-KR"
    style={{ background: "linear-gradient(135deg, #c9def4, #eef4f8)", minHeight: "100vh" }}
  >
    <button style={{ left: 16, position: "fixed", top: 16 }} type="button">
      패널 밖
    </button>
    <nav
      aria-label="작업 표시줄"
      style={{
        alignItems: "center",
        background: "rgb(255 255 255 / 80%)",
        bottom: 0,
        display: "flex",
        height: 50,
        justifyContent: "center",
        left: 0,
        position: "fixed",
        right: 0,
        zIndex: 2147483647,
      }}
    >
      {children}
    </nav>
    <div style={{ position: "fixed", right: 16, top: 16 }}>
      <p>
        Start 상태:{" "}
        <output aria-label="Start panel 상태">{panels.start.widget.open ? "열림" : "닫힘"}</output>
      </p>
      <p>
        Start view:{" "}
        <output aria-label="Start browse view">{panels.start.screen.snapshot.view}</output>
      </p>
      <p>
        시작 메뉴 검색어:{" "}
        <output aria-label="시작 메뉴 검색어">{panels.start.query || "(비어 있음)"}</output>
      </p>
    </div>
  </div>
);

/** production Provider, runtime adapters와 Start 제품 part를 한 번 조합한다. */
const StartStory = () => {
  const [lastOpen, setLastOpen] = useState("없음");
  const runtime = useMemo(() => createStartRuntime(setLastOpen), []);
  return (
    <HeadlessRuntimeProvider runtime={runtime}>
      <ConnectedStart />
      <output aria-label="마지막 open 결과" hidden>
        {lastOpen}
      </output>
    </HeadlessRuntimeProvider>
  );
};

const meta = {
  title: "Design/Components/Taskbar/Start",
  component: TaskbarStart,
  tags: ["autodocs"],
  decorators: [withTaskbarDescription],
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component:
          "실제 runtime의 Start Pin, pinned/All/Index state, Resource open 결과와 panel lifecycle을 연결한다. query가 있으면 HDJG-47이 채울 명시적 Search body 경계만 표시한다.",
      },
      story: { iframeHeight: 700, inline: false },
    },
    layout: "fullscreen",
  },
  args: { connection: {} as TaskbarPanelsConnection["start"] },
} satisfies Meta<typeof TaskbarStart>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  name: "전체 Start 제품 흐름",
  parameters: {
    taskbarDescription:
      "pinned grid에서 keyboard와 drag를 사용하고, 모두 보기와 index를 연 뒤 Resource를 선택해 성공 close와 reopen reset을 확인할 수 있다. query body는 후속 Search 경계를 명시한다.",
  },
  render: () => <StartStory />,
};
