import type { ComponentProps, JSX } from 'react';

import { type ImageAssetName, imageAssets } from '../../assets/image-data';

export type { ImageAssetName };

/** 래스터 자산 하나의 파일 주소와 원본 크기(픽셀). `next/image`에 그대로 펼쳐 넘길 수 있다 */
export type ImageAssetData = { src: string; width: number; height: number };

/**
 * 래스터 자산의 파일 주소와 원본 너비·높이를 돌려준다. generate:assets가 만든 지도(`src/assets/image-data.ts`)에서 찾는다.
 * 앱이 `next/image` 같은 이미지 컴포넌트로 큰 이미지를 그릴 때 쓴다.
 * @codocs [[피그마 연동:자산]]
 * @param name 래스터 자산 이름(figma/assets/ 기준, 확장자 없음)
 * @returns 파일 주소와 원본 크기
 */
export function getImageAsset(name: ImageAssetName): ImageAssetData {
  return imageAssets[name];
}

type ImageAssetProps = Omit<ComponentProps<'img'>, 'src' | 'alt'> & {
  /** 래스터 자산 이름(figma/assets/ 기준, 확장자 없음) */
  name: ImageAssetName;
  /** 대체 글자. 장식 이미지면 빈 글자(기본값)로 둔다 */
  alt?: string;
};

/**
 * 피그마 Foundations / Assets의 래스터 자산(폴더·문서·앱 아이콘 등)을 그린다. 크기는 쓰는 곳이 크기 클래스로 정하고,
 * 클래스가 없으면 자산 원본 크기를 `width`·`height`로 달아 원본 비율을 지킨다.
 * 앱은 디자인 시스템 내부 경로를 import할 수 없으므로 이 컴포넌트로 래스터 자산을 쓴다.
 * @codocs [[피그마 연동:자산]]
 * @param props
 */
export function ImageAsset(props: ImageAssetProps): JSX.Element {
  const { name, alt = '', ...imgProps } = props;
  const { src, width, height } = getImageAsset(name);
  return <img alt={alt} width={width} height={height} {...imgProps} src={src} />;
}
