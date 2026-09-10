import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { StartScreenGroupKey } from "../../../../../../../headless/index.js";
import { useTaskbarStartAllNavigation } from "./index.js";

const categoryKeys = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
] as const satisfies readonly StartScreenGroupKey[];

/**
 * controlled index state를 실제 list, heading과 overlay DOM에 연결한다.
 */
const NavigationFixture = ({
  indexOpen,
  onIndexOpenChange,
}: {
  indexOpen: boolean;
  onIndexOpenChange: (open: boolean) => void;
}) => {
  const navigation = useTaskbarStartAllNavigation({ indexOpen, onIndexOpenChange });
  return (
    <div>
      <button onClick={(event) => navigation.openIndex(event.currentTarget)} type="button">
        인덱스 열기
      </button>
      <div data-testid="list" ref={navigation.listRef} tabIndex={-1}>
        {categoryKeys.map((key) => (
          <button
            key={key}
            data-testid={`heading-${key}`}
            ref={(element) => navigation.setHeadingElement(key, element)}
            type="button"
          >
            {key} heading
          </button>
        ))}
      </div>
      <div
        data-testid="overlay"
        onKeyDown={navigation.onOverlayKeyDown}
        onPointerDown={navigation.onOverlayPointerDown}
        ref={navigation.overlayRef}
      >
        {categoryKeys.map((key) => (
          <button
            key={key}
            data-start-index-category={key}
            onClick={() => navigation.selectCategory(key)}
            type="button"
          >
            {key} category
          </button>
        ))}
      </div>
    </div>
  );
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("useTaskbarStartAllNavigation", () => {
  it("index가 열리면 첫 category에 focus하고 닫히면 opener로 복원한다", () => {
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callback(0);
      return 1;
    });
    const onIndexOpenChange = vi.fn();
    const rendered = render(
      <NavigationFixture indexOpen={false} onIndexOpenChange={onIndexOpenChange} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "인덱스 열기" }));
    expect(onIndexOpenChange).toHaveBeenLastCalledWith(true);

    rendered.rerender(<NavigationFixture indexOpen={true} onIndexOpenChange={onIndexOpenChange} />);
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "A category" }));

    rendered.rerender(
      <NavigationFixture indexOpen={false} onIndexOpenChange={onIndexOpenChange} />,
    );
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "인덱스 열기" }));
  });

  it("category 선택은 heading 위치로 scroll한 뒤 닫힘 focus 대상을 해당 heading으로 바꾼다", () => {
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callback(0);
      return 1;
    });
    const onIndexOpenChange = vi.fn();
    const rendered = render(
      <NavigationFixture indexOpen={true} onIndexOpenChange={onIndexOpenChange} />,
    );
    const list = screen.getByTestId("list");
    const heading = screen.getByTestId("heading-E");
    Object.defineProperty(list, "offsetTop", { configurable: true, value: 20 });
    Object.defineProperty(heading, "offsetTop", { configurable: true, value: 220 });
    const scrollTo = vi.fn();
    list.scrollTo = scrollTo;

    fireEvent.click(screen.getByRole("button", { name: "E category" }));
    expect(scrollTo).toHaveBeenCalledExactlyOnceWith({ top: 200 });
    expect(onIndexOpenChange).toHaveBeenLastCalledWith(false);
    rendered.rerender(
      <NavigationFixture indexOpen={false} onIndexOpenChange={onIndexOpenChange} />,
    );
    expect(document.activeElement).toBe(heading);
  });

  it.each([
    ["ArrowRight", false, "F", "A"],
    ["ArrowLeft", false, "A", "F"],
    ["ArrowDown", false, "B", "F"],
    ["ArrowUp", false, "A", "C"],
    ["Home", false, "D", "A"],
    ["End", false, "A", "F"],
    ["Tab", false, "F", "A"],
    ["Tab", true, "A", "F"],
  ] as const)("%s shift=%s는 %s에서 %s category로 순환한다", (key, shiftKey, from, to) => {
    render(<NavigationFixture indexOpen={true} onIndexOpenChange={() => undefined} />);
    const source = screen.getByRole("button", { name: `${from} category` });
    source.focus();

    fireEvent.keyDown(source, { key, shiftKey });

    expect(document.activeElement).toBe(screen.getByRole("button", { name: `${to} category` }));
  });

  it("Escape와 overlay 배경 pointer는 index close를 요청하고 내부 pointer는 무시한다", () => {
    const onIndexOpenChange = vi.fn();
    render(<NavigationFixture indexOpen={true} onIndexOpenChange={onIndexOpenChange} />);
    const overlay = screen.getByTestId("overlay");

    fireEvent.keyDown(overlay, { key: "Escape" });
    expect(onIndexOpenChange).toHaveBeenLastCalledWith(false);
    fireEvent.pointerDown(screen.getByRole("button", { name: "A category" }));
    expect(onIndexOpenChange).toHaveBeenCalledTimes(1);
    fireEvent.pointerDown(overlay);
    expect(onIndexOpenChange).toHaveBeenCalledTimes(2);
  });

  it("index 상태 전환 뒤 unmount하면 예약된 focus frame을 취소한다", () => {
    const requestAnimationFrame = vi
      .spyOn(window, "requestAnimationFrame")
      .mockImplementation(() => 17);
    const cancelAnimationFrame = vi.spyOn(window, "cancelAnimationFrame");
    const rendered = render(
      <NavigationFixture indexOpen={false} onIndexOpenChange={() => undefined} />,
    );

    rendered.rerender(<NavigationFixture indexOpen={true} onIndexOpenChange={() => undefined} />);
    expect(requestAnimationFrame).toHaveBeenCalledTimes(1);
    rendered.unmount();
    expect(cancelAnimationFrame).toHaveBeenCalledWith(17);
  });
});
