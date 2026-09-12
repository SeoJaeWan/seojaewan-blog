/**
 * @file Resource 검색의 입력과 일치 단계만 정의한다.
 *
 * 원본, 후보 범위와 제품 화면 상태는 기존 Resource 모델과 소비 제품이 소유한다.
 */
import type { ResourceRef } from "../../model/index.js";
import type { ResourceReaders } from "../../resourceLookup/index.js";

/**
 * name/title 전체 문구와 단어 AND, metadata 필요 여부로 구분한 일치 단계다.
 *
 * 낮은 단계가 먼저 표시되며, fuzzy 점수나 제품별 결과 개수는 포함하지 않는다.
 */
export type ResourceSearchTier =
  /**
   * 정규화한 전체 name/title이 일반 문자·초성·혼합 문구와 일치한다.
   */
  | "exact"
  /**
   * 전체 문구가 name/title의 시작에서 일치한다.
   */
  | "prefix"
  /**
   * 전체 문구가 name/title 안에서 연속으로 일치한다.
   */
  | "contains"
  /**
   * 전체 문구는 불일치하지만 모든 단어가 name/title에서 일치한다.
   */
  | "words"
  /**
   * Content tags/slug가 있어야 모든 단어가 일치한다.
   */
  | "metadata";

/**
 * 검색 후보의 기존 ref와 일치 단계를 전달하는 읽기 전용 결과다.
 *
 * title, name, 경로와 icon은 복제하지 않으며 제품 selector가 typed reader로 파생한다.
 */
export type ResourceSearchMatch = Readonly<{
  ref: ResourceRef;
  tier: ResourceSearchTier;
}>;

/**
 * 제품이 허용한 후보 ref와 현재 원본 reader, 검색용 원문을 전달한다.
 *
 * reader는 호출 시 조회 가능해야 하며 후보 범위, 주소 분류와 debounce는 소비 제품 책임이다.
 */
export type ResourceSearchInput = Readonly<{
  query: string;
  candidates: readonly ResourceRef[];
  readers: ResourceReaders;
}>;
