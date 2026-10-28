import type { ComponentProps, JSX } from 'react';

// generate:assets가 figma/assets/images/의 원본(PNG·JPEG 등)에서 src/assets/images/에 만든 WebP의 파일 주소다.
// 자산 이름에는 확장자를 넣지 않는다. 피그마 원본의 형식(확장자)이 바뀌어도 쓰는 곳은 그대로다.
// Vite와 Next.js가 `new URL(…, import.meta.url)`을 빌드 결과의 파일 주소로 바꿔 주도록 경로를 글자 그대로 쓴다.
// @codocs [[피그마 연동:자산]]
const IMAGE_ASSET_URLS = {
  'images/app-chrome': new URL('../../assets/images/app-chrome.webp', import.meta.url).href,
  'images/app-file-explorer': new URL('../../assets/images/app-file-explorer.webp', import.meta.url)
    .href,
  'images/avatar-profile': new URL('../../assets/images/avatar-profile.webp', import.meta.url).href,
  'images/avatar-profile-placeholder': new URL(
    '../../assets/images/avatar-profile-placeholder.webp',
    import.meta.url,
  ).href,
  'images/equation-quadratic-formula': new URL(
    '../../assets/images/equation-quadratic-formula.webp',
    import.meta.url,
  ).href,
  'images/file-document': new URL('../../assets/images/file-document.webp', import.meta.url).href,
  'images/file-folder': new URL('../../assets/images/file-folder.webp', import.meta.url).href,
  'images/file-recycle-bin-empty': new URL(
    '../../assets/images/file-recycle-bin-empty.webp',
    import.meta.url,
  ).href,
  'images/file-recycle-bin-full': new URL(
    '../../assets/images/file-recycle-bin-full.webp',
    import.meta.url,
  ).href,
  'images/wallpaper-bloom': new URL('../../assets/images/wallpaper-bloom.webp', import.meta.url)
    .href,
} as const;

/** 래스터 자산 이름(figma/assets/ 기준 경로에서 확장자를 뺀 이름, 예: `images/file-folder`) */
export type ImageAssetName = keyof typeof IMAGE_ASSET_URLS;

type ImageAssetProps = Omit<ComponentProps<'img'>, 'src' | 'alt'> & {
  /** 래스터 자산 이름(figma/assets/ 기준, 확장자 없음) */
  name: ImageAssetName;
  /** 대체 글자. 장식 이미지면 빈 글자(기본값)로 둔다 */
  alt?: string;
};

/**
 * 피그마 Foundations / Assets의 래스터 자산(폴더·문서·앱 아이콘 등)을 그린다. 크기는 쓰는 곳이 크기 클래스로 정한다.
 * 앱은 디자인 시스템 내부 경로를 import할 수 없으므로 이 컴포넌트로 래스터 자산을 쓴다.
 * @codocs [[피그마 연동:자산]]
 * @param props
 */
export function ImageAsset(props: ImageAssetProps): JSX.Element {
  const { name, alt = '', ...imgProps } = props;
  return <img alt={alt} {...imgProps} src={IMAGE_ASSET_URLS[name]} />;
}
