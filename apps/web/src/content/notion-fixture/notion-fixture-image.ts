import 'server-only';

import { z } from 'zod';

import type { ImageResolver } from '@/content/post-images/post-images';

import testImage from './notion-test-image.png';

// Next.js가 정적 이미지 import로 주는 값(주소와 원본 크기)
const staticImageSchema = z.object({
  src: z.string().min(1),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

/**
 * fixture 모드의 이미지 바꾸기. fixture 모드(E2E, CI, Storybook)에는 이미지 서버가 없으므로 이미지 서버에 묻지 않고,
 * 모든 이미지 서버 주소를 저장소 안의 시험 이미지(`notion-test-image.png`)로 바꾼다. 주소는 Next.js가 정적 파일로 내보낸
 * 주소이고, 크기는 그 그림의 원본 크기다. 깨진 이미지 없이 운영과 같은 `<img>`(크기, `srcset`)로 그려진다.
 * @codocs [[콘텐츠 원천:읽는 곳]]
 * @codocs [[Notion 이미지 제공:크기]]
 * @returns 이미지 바꾸기
 */
export function createFixtureImageResolver(): ImageResolver {
  const { src, width, height } = staticImageSchema.parse(testImage);
  return () => Promise.resolve({ image: { url: src, width, height }, failure: null });
}
