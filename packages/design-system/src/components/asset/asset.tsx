import { createElement, type JSX, type ReactNode, type SVGProps, useId } from 'react';

import { type SvgAssetElement, type SvgAssetName, svgAssets } from '../../assets/asset-data';

type AssetProps = Omit<SVGProps<SVGSVGElement>, 'viewBox' | 'children'> & {
  /** 피그마 자산 파일 경로(figma/assets/ 기준, 예: `icons/ic_fluent_add_20_regular.svg`) */
  name: SvgAssetName;
};

/**
 * 피그마 Foundations / Assets의 SVG 자산을 그린다. 요소는 generate:assets가 피그마 자산 파일에서 만든다.
 * 한 가지 색 자산은 currentColor로 그리므로 색은 글자 색 클래스(`text-*`)로 정하고, 크기는 크기 클래스로 정한다.
 * 여러 색 자산의 그라데이션 ID는 한 화면에 같은 자산이 여럿 있어도 겹치지 않게 요소마다 다른 접두어를 붙인다.
 * 피그마 일치 검사는 data-asset 값으로 같은 자산인지 확인한다.
 * @codocs [[피그마 일치 검사:자산]]
 * @param props
 */
export function Asset(props: AssetProps): JSX.Element {
  const { name, ...svgProps } = props;
  const asset = svgAssets[name];
  const prefix = `asset${useId().replace(/[^a-zA-Z0-9]/gu, '')}`;
  return (
    <svg aria-hidden fill="none" {...svgProps} data-asset={name} viewBox={asset.viewBox}>
      {asset.elements.map((element, index) => renderElement(element, index, prefix))}
    </svg>
  );
}

/**
 * 자산 요소 하나(자식 포함)를 그린다. `id`와 `url(#id)` 참조에 접두어를 붙인다.
 * @param element 자산 요소
 * @param key React key
 * @param prefix ID 접두어
 * @returns React 요소
 */
function renderElement(element: SvgAssetElement, key: number, prefix: string): ReactNode {
  const attributes: Record<string, string> = {};
  for (const [name, value] of Object.entries(element.attributes)) {
    attributes[name] =
      name === 'id'
        ? `${prefix}-${value}`
        : value.replace(/url\(#([^)]+)\)/gu, `url(#${prefix}-$1)`);
  }
  const children = element.children?.map((child, index) => renderElement(child, index, prefix));
  return createElement(element.tag, { key, ...attributes }, children);
}
