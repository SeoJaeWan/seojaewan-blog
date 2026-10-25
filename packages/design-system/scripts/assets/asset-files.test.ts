// @vitest-environment node
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { sourceAssetsDir } from '../package-paths.ts';
import { expectedAssetFiles } from './asset-files.ts';
import { assetDataModule, parseSvgAsset } from './assets-code.ts';

const SVG = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M8 1L15 15H1Z" fill="currentColor" fill-rule="evenodd"/>
</svg>`;

// @codocs [[피그마 연동:자산]]
describe('자산 생성', () => {
  it('SVG의 viewBox와 요소를 React 속성 이름으로 옮긴다', () => {
    const data = parseSvgAsset(SVG, 'icons/test.svg');
    expect(data.viewBox).toBe('0 0 16 16');
    expect(data.elements).toEqual([
      {
        tag: 'path',
        attributes: { d: 'M8 1L15 15H1Z', fill: 'currentColor', fillRule: 'evenodd' },
      },
    ]);
    expect(assetDataModule(new Map([['icons/test.svg', data]]))).toContain("'icons/test.svg': {");
  });

  it('하이픈 속성 이름은 낙타 표기로 바꾸고 pathLength 같은 이름은 그대로 둔다', () => {
    const svg = `<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M16 1.5C24.0084 1.5 30.5 7.99165 30.5 16" pathLength="1" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-dasharray="1 1"/>
</svg>`;
    expect(parseSvgAsset(svg, 'shapes/trim.svg').elements).toEqual([
      {
        tag: 'path',
        attributes: {
          d: 'M16 1.5C24.0084 1.5 30.5 7.99165 30.5 16',
          pathLength: '1',
          stroke: 'currentColor',
          strokeWidth: '3',
          strokeLinecap: 'round',
          strokeDasharray: '1 1',
        },
      },
    ]);
  });

  it('이름공간 속성은 예외 표의 React 이름으로, 표에 없는 이름공간 속성은 실패한다', () => {
    const use =
      '<svg viewBox="0 0 1 1"><use xlink:href="#a" xml:space="preserve" class="x"/></svg>';
    expect(parseSvgAsset(use, 'icons/use.svg').elements).toEqual([
      { tag: 'use', attributes: { xlinkHref: '#a', xmlSpace: 'preserve', className: 'x' } },
    ]);
    expect(() =>
      parseSvgAsset('<svg viewBox="0 0 1 1"><path foo:bar="1"/></svg>', 'icons/ns.svg'),
    ).toThrow(/foo:bar/u);
  });

  it('g·clipPath·mask·필터 요소를 중첩 그대로 옮긴다', () => {
    const svg = `<svg viewBox="0 0 8 8" xmlns="http://www.w3.org/2000/svg">
<g clip-path="url(#c)" filter="url(#f)">
<path d="M0 0H8V8H0Z" fill="currentColor"/>
</g>
<mask id="m"><rect width="8" height="8"/></mask>
<defs>
<clipPath id="c"><rect width="8" height="8"/></clipPath>
<filter id="f"><feGaussianBlur stdDeviation="2" in="SourceGraphic"/></filter>
<linearGradient id="g" gradientUnits="userSpaceOnUse"><stop stop-color="#fff"/></linearGradient>
</defs>
</svg>`;
    const [group, mask, defs] = parseSvgAsset(svg, 'illustrations/rich.svg').elements;
    expect(group).toEqual({
      tag: 'g',
      attributes: { clipPath: 'url(#c)', filter: 'url(#f)' },
      children: [{ tag: 'path', attributes: { d: 'M0 0H8V8H0Z', fill: 'currentColor' } }],
    });
    expect(mask?.tag).toBe('mask');
    expect(defs?.children?.map((child) => child.tag)).toEqual([
      'clipPath',
      'filter',
      'linearGradient',
    ]);
    expect(defs?.children?.[1]?.children).toEqual([
      { tag: 'feGaussianBlur', attributes: { stdDeviation: '2', in: 'SourceGraphic' } },
    ]);
  });

  it('글자 내용, style 속성, 닫히지 않은 요소는 실패한다', () => {
    const open = '<svg viewBox="0 0 1 1">';
    expect(() => parseSvgAsset(`${open}<text>hi</text></svg>`, 'icons/bad.svg')).toThrow(
      /글자 내용/u,
    );
    expect(() => parseSvgAsset(`${open}<path style="fill:red"/></svg>`, 'icons/bad.svg')).toThrow(
      /style/u,
    );
    expect(() => parseSvgAsset(`${open}<g><path d="M0 0"/></svg>`, 'icons/bad.svg')).toThrow(
      /닫히지/u,
    );
  });

  it('src/assets가 figma/assets와 맞다', () => {
    // 다르면 `pnpm --filter @seojaewan/design-system generate:assets`로 다시 만들어 커밋한다.
    for (const [file, bytes] of expectedAssetFiles()) {
      const name = path.relative(sourceAssetsDir, file);
      expect(existsSync(file), name).toBe(true);
      expect(readFileSync(file).equals(bytes), name).toBe(true);
    }
  });
});
