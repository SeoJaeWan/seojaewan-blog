import { describe, expect, it } from "vitest";

import { createResourceRef } from "../../../resources/index.js";
import {
  areFolderViewSettingsEqual,
  areFolderViewSettingsLocationsEqual,
  DEFAULT_FOLDER_VIEW_SETTINGS,
  parseFolderViewSettings,
  parseFolderViewSettingsLocation,
} from "./index.js";

const folder = createResourceRef("folder", "10000000-0000-4000-8000-000000000001");

describe("Folder view settings model", () => {
  it("Medium Icons·이름 오름차순과 고정 column 폭을 immutable 기본값으로 제공한다", () => {
    expect(DEFAULT_FOLDER_VIEW_SETTINGS).toEqual({
      viewMode: "medium-icons",
      sortKey: "name",
      sortDirection: "ascending",
      detailsColumnWidths: { modified: 160, type: 120 },
    });
    expect(Object.isFrozen(DEFAULT_FOLDER_VIEW_SETTINGS)).toBe(true);
    expect(Object.isFrozen(DEFAULT_FOLDER_VIEW_SETTINGS.detailsColumnWidths)).toBe(true);
  });

  it("Desktop null과 Folder ref만 새 immutable location으로 복원한다", () => {
    expect(parseFolderViewSettingsLocation(null)).toBeNull();
    const parsed = parseFolderViewSettingsLocation({ ...folder });
    expect(parsed).toEqual(folder);
    expect(parsed).not.toBe(folder);
    expect(Object.isFrozen(parsed)).toBe(true);
    expect(() =>
      parseFolderViewSettingsLocation(
        createResourceRef("content", "10000000-0000-4000-8000-000000000002"),
      ),
    ).toThrow();
  });

  it("여덟 view와 두 정렬 축 및 양의 유한한 column 폭을 strict하게 검증한다", () => {
    const parsed = parseFolderViewSettings({
      viewMode: "details",
      sortKey: "date",
      sortDirection: "descending",
      detailsColumnWidths: { modified: 200, type: 144 },
    });

    expect(parsed).toEqual({
      viewMode: "details",
      sortKey: "date",
      sortDirection: "descending",
      detailsColumnWidths: { modified: 200, type: 144 },
    });
    expect(Object.isFrozen(parsed.detailsColumnWidths)).toBe(true);
    expect(() => parseFolderViewSettings({ ...parsed, viewMode: "gallery" })).toThrow();
    expect(() =>
      parseFolderViewSettings({ ...parsed, detailsColumnWidths: { modified: 0, type: 144 } }),
    ).toThrow();
    expect(() => parseFolderViewSettings({ ...parsed, query: "react" })).toThrow();
  });

  it("location identity와 중첩 설정 값을 객체 reference와 무관하게 비교한다", () => {
    expect(areFolderViewSettingsLocationsEqual(folder, { ...folder })).toBe(true);
    expect(areFolderViewSettingsLocationsEqual(null, null)).toBe(true);
    expect(
      areFolderViewSettingsEqual(DEFAULT_FOLDER_VIEW_SETTINGS, {
        ...DEFAULT_FOLDER_VIEW_SETTINGS,
        detailsColumnWidths: { ...DEFAULT_FOLDER_VIEW_SETTINGS.detailsColumnWidths },
      }),
    ).toBe(true);
  });
});
