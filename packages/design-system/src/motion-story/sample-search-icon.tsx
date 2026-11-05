import type { JSX } from 'react';

import { Asset } from '../components/asset/asset';

type SampleSearchIconProps = {
  motionClassName: string;
};

/**
 * 검색 돋보기 모션 견본(motion-search-box-focus)의 `icon-color/Search Focus`(64x64)를 그리고 모션 클래스를 건다.
 * @codocs [[피그마 연동:모션]]
 * @returns 견본 돋보기
 * @param props 컴포넌트 속성
 * @param props.motionClassName 모션 클래스
 */
export function SampleSearchIcon({ motionClassName }: SampleSearchIconProps): JSX.Element {
  return (
    <Asset
      name="illustrations/icon-color-search-focus.svg"
      className={`size-size-icon-3xl ${motionClassName}`}
    />
  );
}
