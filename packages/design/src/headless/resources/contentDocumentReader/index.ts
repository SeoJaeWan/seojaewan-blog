/**
 * @file Content Resource의 metadata와 body document를 읽는 비동기 port를 정의한다.
 *
 * Resource 존재 확인과 목록 조회는 이 파일의 책임이 아니다.
 */
import type { ContentDocument, ContentResourceRef } from "../model/index.js";

/**
 * `ContentResourceRef`에 해당하는 metadata와 body document를 비동기로 읽는다.
 *
 * Resource 존재 여부와 목록 조회는 소유하지 않으며, 그 경우에는 `ResourceLookup`이나
 * Content Catalog reader를 사용한다.
 */
export type ContentDocumentReader = Readonly<{
  /**
   * 지정한 Content의 metadata와 본문을 읽고 없으면 undefined를 반환한다.
   *
   * 실제 데이터 접근과 조회 실패 처리는 Application 구현이 소유한다.
   */
  readContentDocument(ref: ContentResourceRef): Promise<ContentDocument | undefined>;
}>;
