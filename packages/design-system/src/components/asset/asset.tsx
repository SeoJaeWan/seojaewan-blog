import { createElement, type JSX, type SVGProps } from 'react';

import { type SvgAssetName, svgAssets } from '../../assets/asset-data';

type AssetProps = Omit<SVGProps<SVGSVGElement>, 'viewBox' | 'children'> & {
  /** 피그마 자산 파일 경로(figma/assets/ 기준, 예: `icons/ic_fluent_add_20_regular.svg`) */
  name: SvgAssetName;
};

/**
 * 피그마 Foundations / Assets의 SVG 자산을 그린다. 요소는 generate:assets가 피그마 자산 파일에서 만든다.
 * 한 가지 색 자산은 currentColor로 그리므로 색은 글자 색 클래스(`text-*`)로 정하고, 크기는 크기 클래스로 정한다.
 * 피그마 일치 검사는 data-asset 값으로 같은 자산인지 확인한다.
 * @codocs [[피그마 일치 검사:자산]]
 * @param props
 */
export function Asset(props: AssetProps): JSX.Element {
  const { name, ...svgProps } = props;
  const asset = svgAssets[name];
  return (
    <svg aria-hidden fill="none" {...svgProps} data-asset={name} viewBox={asset.viewBox}>
      {asset.elements.map((element, index) =>
        createElement(element.tag, { key: index, ...element.attributes }),
      )}
    </svg>
  );
}
