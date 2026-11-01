import imageExternal from 'next/dist/shared/lib/image-external.js';
import type NextImage from 'next/image';

// @codocs [[저장소 구성:앱 폴더 구조]]
// Storybook(Vite)에서 `next/image`의 기본 내보내기를 쓸 수 있게 하는 연결 파일이다.
// `next/image`는 CommonJS 모듈(`module.exports = { __esModule, default }`)이라 Vite가 기본 가져오기에 모듈 전체 객체를 줘서,
// 그대로 그리면 "Element type is invalid"가 난다. 실제 컴포넌트(`default`)를 꺼내 준다.
const nextImage =
  (imageExternal as unknown as { default?: typeof NextImage }).default ?? imageExternal;

export default nextImage;
