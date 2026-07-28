import { useState } from "react";

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useWindowPanelViewContext } from "./hooks/useWindowPanelViewContext";
import { WindowPanelView } from "./index";

const BrowseProbe = () => {
  const navigation = useWindowPanelViewContext();

  return (
    <>
      <output>{navigation.view}</output>
      <button onClick={navigation.showAll} type="button">
        모두
      </button>
    </>
  );
};

const RouteHarness = () => {
  const [searchActive, setSearchActive] = useState(false);

  return (
    <>
      <button onClick={() => setSearchActive((active) => !active)} type="button">
        검색 전환
      </button>
      <WindowPanelView.Root>
        {searchActive ? <output>search</output> : <BrowseProbe />}
      </WindowPanelView.Root>
    </>
  );
};

describe("WindowPanelView.Root", () => {
  it("검색 route를 거친 뒤에도 기존 browse 화면을 보존한다", () => {
    render(<RouteHarness />);

    fireEvent.click(screen.getByRole("button", { name: "모두" }));
    expect(screen.getByText("all")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "검색 전환" }));
    expect(screen.getByText("search")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "검색 전환" }));
    expect(screen.getByText("all")).toBeTruthy();
  });
});
