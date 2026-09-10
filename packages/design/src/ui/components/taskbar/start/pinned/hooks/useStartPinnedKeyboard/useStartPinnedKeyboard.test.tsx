import { cleanup, createEvent, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { useStartPinnedKeyboard } from "./index.js";

/**
 * 실제 button ref와 keydown을 hook에 연결해 focus 결과를 관찰한다.
 */
const KeyboardGrid = ({ itemCount }: { itemCount: number }) => {
  const keyboard = useStartPinnedKeyboard(itemCount);
  return (
    <div>
      {Array.from({ length: itemCount }, (_, index) => (
        <button
          key={index}
          onKeyDown={(event) => keyboard.handleKeyDown(event, index)}
          ref={keyboard.getItemRef(index)}
          type="button"
        >
          항목 {index + 1}
        </button>
      ))}
    </div>
  );
};

afterEach(() => cleanup());

describe("useStartPinnedKeyboard", () => {
  it.each([
    ["ArrowLeft", 2, 1],
    ["ArrowRight", 2, 3],
    ["ArrowUp", 7, 1],
    ["ArrowDown", 1, 7],
  ] as const)("%s는 6열 grid의 %s번째 항목을 %s번째로 이동한다", (key, from, to) => {
    render(<KeyboardGrid itemCount={8} />);
    const source = screen.getByRole("button", { name: `항목 ${from}` });
    source.focus();

    fireEvent.keyDown(source, { key });

    expect(document.activeElement).toBe(screen.getByRole("button", { name: `항목 ${to}` }));
  });

  it.each([
    ["Home", false, 8, 7],
    ["End", false, 7, 8],
    ["Home", true, 8, 1],
    ["End", true, 1, 8],
  ] as const)("%s의 ctrl=%s 조건은 %s번째 항목을 %s번째로 이동한다", (key, ctrlKey, from, to) => {
    render(<KeyboardGrid itemCount={8} />);
    const source = screen.getByRole("button", { name: `항목 ${from}` });
    source.focus();

    fireEvent.keyDown(source, { ctrlKey, key });

    expect(document.activeElement).toBe(screen.getByRole("button", { name: `항목 ${to}` }));
  });

  it("실제 focus 이동은 기본 동작을 막고 grid 경계의 no-op은 그대로 둔다", () => {
    render(<KeyboardGrid itemCount={2} />);
    const first = screen.getByRole("button", { name: "항목 1" });
    first.focus();
    const move = createEvent.keyDown(first, { cancelable: true, key: "ArrowRight" });
    fireEvent(first, move);
    expect(move.defaultPrevented).toBe(true);

    const last = screen.getByRole("button", { name: "항목 2" });
    const boundary = createEvent.keyDown(last, { cancelable: true, key: "ArrowRight" });
    fireEvent(last, boundary);
    expect(boundary.defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(last);
  });

  it("지원하지 않는 key는 focus와 기본 동작을 변경하지 않는다", () => {
    render(<KeyboardGrid itemCount={2} />);
    const first = screen.getByRole("button", { name: "항목 1" });
    first.focus();
    const event = createEvent.keyDown(first, { cancelable: true, key: "PageDown" });

    fireEvent(first, event);

    expect(event.defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(first);
  });
});
