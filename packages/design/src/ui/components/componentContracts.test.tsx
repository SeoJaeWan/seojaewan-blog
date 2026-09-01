import { describe, expect, it } from "vitest";

import * as packageApi from "../../index";
import * as uiApi from "../index";
import * as componentApi from "./index";

const componentRecord = componentApi as Readonly<Record<string, unknown>>;
const discoveredPublicComponents = Object.keys(componentRecord).filter((name) =>
  name.endsWith("UI"),
);

describe("Component discovery public contract", () => {
  it("discovers at least one production Component", () => {
    expect(discoveredPublicComponents.length).toBeGreaterThan(0);
  });

  it.each([
    ["global UI entry", uiApi],
    ["package entry", packageApi],
  ])("re-exports every discovered Component from the %s", (_, api) => {
    const apiRecord = api as Readonly<Record<string, unknown>>;
    for (const component of discoveredPublicComponents) {
      expect(apiRecord[component]).toBe(componentRecord[component]);
    }
  });

  it.each([
    ["component family aggregate", componentApi],
    ["global UI entry", uiApi],
    ["package entry", packageApi],
  ])("keeps WindowResizeHandlesUI private in the %s", (_, api) => {
    expect(api).not.toHaveProperty("WindowResizeHandlesUI");
  });
});
