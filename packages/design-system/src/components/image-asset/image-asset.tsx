import type { ComponentProps, JSX } from 'react';

// generate:assets가 figma/assets/images/에서 src/assets/images/로 복사한 래스터 자산의 파일 주소다.
// Vite와 Next.js가 `new URL(…, import.meta.url)`을 빌드 결과의 파일 주소로 바꿔 주도록 경로를 글자 그대로 쓴다.
const IMAGE_ASSET_URLS = {
  'images/app-chrome.png': new URL('../../assets/images/app-chrome.png', import.meta.url).href,
  'images/app-file-explorer.png': new URL(
    '../../assets/images/app-file-explorer.png',
    import.meta.url,
  ).href,
  'images/avatar-profile.png': new URL('../../assets/images/avatar-profile.png', import.meta.url)
    .href,
  'images/avatar-profile-placeholder.png': new URL(
    '../../assets/images/avatar-profile-placeholder.png',
    import.meta.url,
  ).href,
  'images/file-document.png': new URL('../../assets/images/file-document.png', import.meta.url)
    .href,
  'images/file-folder.png': new URL('../../assets/images/file-folder.png', import.meta.url).href,
} as const;

/** 래스터 자산 이름(figma/assets/ 기준, 예: `images/file-folder.png`) */
export type ImageAssetName = keyof typeof IMAGE_ASSET_URLS;

type ImageAssetProps = Omit<ComponentProps<'img'>, 'src' | 'alt'> & {
  /** 피그마 자산 파일 경로(figma/assets/ 기준) */
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
