/** 요청한 이미지가 없다. 없는 블록·페이지, 이미지가 아닌 블록, 지금 Notion과 다른 버전이다 */
export class ImageNotFoundError extends Error {
  override name = 'ImageNotFoundError';
}

/** 이미지를 가져오지 못했다. Notion 호출, 이미지 내려받기, 변환이 실패했다. 알림을 보낸다 */
export class ImageUpstreamError extends Error {
  override name = 'ImageUpstreamError';
}
