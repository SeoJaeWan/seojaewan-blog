// 이 파일은 scripts/assets/generate-assets.ts가 figma/assets/에서 만든다. 손으로 고치지 않는다.
// 다시 만들기: pnpm --filter @seojaewan/design-system generate:assets

/** 래스터 자산 이름(figma/assets/ 기준 경로에서 확장자를 뺀 이름) → 파일 주소와 원본 크기(픽셀) */
export const imageAssets = {
  'images/app-chrome': {
    src: new URL('./images/app-chrome.webp', import.meta.url).href,
    width: 256,
    height: 256,
  },
  'images/app-file-explorer': {
    src: new URL('./images/app-file-explorer.webp', import.meta.url).href,
    width: 256,
    height: 256,
  },
  'images/avatar-profile': {
    src: new URL('./images/avatar-profile.webp', import.meta.url).href,
    width: 48,
    height: 48,
  },
  'images/avatar-profile-placeholder': {
    src: new URL('./images/avatar-profile-placeholder.webp', import.meta.url).href,
    width: 48,
    height: 48,
  },
  'images/equation-quadratic-formula': {
    src: new URL('./images/equation-quadratic-formula.webp', import.meta.url).href,
    width: 400,
    height: 112,
  },
  'images/file-document': {
    src: new URL('./images/file-document.webp', import.meta.url).href,
    width: 256,
    height: 256,
  },
  'images/file-folder': {
    src: new URL('./images/file-folder.webp', import.meta.url).href,
    width: 256,
    height: 256,
  },
  'images/file-recycle-bin-empty': {
    src: new URL('./images/file-recycle-bin-empty.webp', import.meta.url).href,
    width: 256,
    height: 256,
  },
  'images/file-recycle-bin-full': {
    src: new URL('./images/file-recycle-bin-full.webp', import.meta.url).href,
    width: 256,
    height: 256,
  },
  'images/wallpaper-bloom': {
    src: new URL('./images/wallpaper-bloom.webp', import.meta.url).href,
    width: 3840,
    height: 2400,
  },
} as const satisfies Record<string, { src: string; width: number; height: number }>;

/** 래스터 자산 이름 */
export type ImageAssetName = keyof typeof imageAssets;
