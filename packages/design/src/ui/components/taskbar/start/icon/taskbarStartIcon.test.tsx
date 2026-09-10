import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createResourceRef } from "../../../../../headless/index.js";
import { TaskbarStartIcon } from "./index.js";

const folder = createResourceRef("folder", "10000000-0000-4000-8000-000000000001");
const content = createResourceRef("content", "10000000-0000-4000-8000-000000000002");
const shortcut = createResourceRef("external-shortcut", "10000000-0000-4000-8000-000000000003");

afterEach(() => cleanup());

describe("TaskbarStartIcon", () => {
  it("Application resolver가 반환한 Resource icon을 fallback보다 우선한다", () => {
    const resolveIcon = vi.fn(() => <img alt="Chrome" src="/chrome.png" />);
    const { container } = render(
      <TaskbarStartIcon resource={content} resolveIcon={resolveIcon} variant="pinned" />,
    );

    expect(resolveIcon).toHaveBeenCalledExactlyOnceWith(content);
    expect(container.querySelector('img[alt="Chrome"]')).not.toBeNull();
    expect(container.querySelector("svg")).toBeNull();
  });

  it("Folder에는 Taskbar File Explorer fallback을 렌더링한다", () => {
    const { container } = render(<TaskbarStartIcon resource={folder} variant="pinned" />);
    const image = container.querySelector<HTMLImageElement>("img");

    expect(image?.src).toContain("file-explorer.png");
    expect(image?.draggable).toBe(false);
  });

  it.each([
    ["content", content],
    ["external shortcut", shortcut],
  ] as const)(
    "%s fallback은 All과 Pinned variant에 맞는 glyph 크기를 사용한다",
    (_name, resource) => {
      const { container, rerender } = render(
        <TaskbarStartIcon resource={resource} variant="all" />,
      );
      expect(container.querySelector("svg")?.getAttribute("viewBox")).toBe("0 0 24 24");

      rerender(<TaskbarStartIcon resource={resource} variant="pinned" />);
      expect(container.querySelector("svg")?.getAttribute("viewBox")).toBe("0 0 32 32");
    },
  );

  it("Content와 ExternalShortcut은 서로 다른 Document와 Link fallback을 사용한다", () => {
    const contentIcon = render(<TaskbarStartIcon resource={content} variant="all" />);
    const contentGlyph = contentIcon.container.querySelector("svg")?.innerHTML;
    contentIcon.unmount();
    const shortcutIcon = render(<TaskbarStartIcon resource={shortcut} variant="all" />);
    const shortcutGlyph = shortcutIcon.container.querySelector("svg")?.innerHTML;

    expect(contentGlyph).toBeDefined();
    expect(shortcutGlyph).toBeDefined();
    expect(contentGlyph).not.toBe(shortcutGlyph);
  });

  it("resolver가 icon을 제공하지 않으면 Resource fallback을 유지한다", () => {
    const resolveIcon = vi.fn(() => undefined);
    const { container } = render(
      <TaskbarStartIcon resource={shortcut} resolveIcon={resolveIcon} variant="all" />,
    );

    expect(resolveIcon).toHaveBeenCalledExactlyOnceWith(shortcut);
    expect(container.querySelector("svg")).not.toBeNull();
  });
});
