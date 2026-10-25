import { describe, expect, it } from 'vitest';

import { utf8Encode } from './sha256';
import { monoColorSvg, utf8Decode } from './svg-normalize';
import {
  relativeTransform,
  svgNumber,
  transformPathData,
  trimmedPathSvg,
  type TrimmedVector,
} from './svg-trim';
import {
  ARC_PATH_DATA,
  arcComponentTransform,
  arcVector,
  arcVectorTransform,
  desktopArcSvg,
  serverArcSvg,
} from './svg-trim.fixture';

const ARC_D =
  'M27.5802 7.27352C32.3979 13.6668 31.123 22.7547 24.7321 27.5757C18.3412 32.3966 9.2526 31.1262 4.4285 24.7377C-0.395601 18.3492 0.870199 9.26002 7.2563 4.43272C13.6424 -0.394579 22.7323 0.866721 27.5627 7.25032';

// @codocs [[피그마 연동:모션]]
describe('경로 트림은 벡터 경로와 트림 기본값으로 pathLength="1"·stroke-dasharray 꼴을 직접 만든다', () => {
  it('트림을 경로에 구운 데스크톱 앱 SVG도 피그마 서버 출력과 같은 바이트가 된다', () => {
    expect(trimmedPathSvg(desktopArcSvg, 'progress-ring/Arc', [arcVector()])).toBe(serverArcSvg);
  });

  it('이미 pathLength·dasharray로 나온 피그마 서버 SVG는 그대로다', () => {
    expect(trimmedPathSvg(serverArcSvg, 'progress-ring/Arc', [arcVector()])).toBe(serverArcSvg);
  });

  it('벡터 경로를 자산 컴포넌트 좌표로 옮기면 피그마 서버 출력의 d와 같다', () => {
    const transform = relativeTransform(arcComponentTransform, arcVectorTransform);
    expect(transformPathData(ARC_PATH_DATA, transform)).toBe(ARC_D);
  });

  it('시작이 0이 아니면 dasharray는 끝-시작, dashoffset은 -시작이다', () => {
    const svg = trimmedPathSvg(serverArcSvg, 'progress-ring/Arc', [
      arcVector({ start: 0.25, end: 0.75 }),
    ]);
    expect(svg).toContain('stroke-dasharray="0.5 1" stroke-dashoffset="-0.25"/>');
  });

  it('한 가지 색 자산이면 이후 선 색이 currentColor로 바뀐다', () => {
    const svg = trimmedPathSvg(desktopArcSvg, 'progress-ring/Arc', [arcVector()]);
    expect(utf8Decode(monoColorSvg(utf8Encode(svg)))).toContain(
      'pathLength="1" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-dasharray="0.46 1"/>',
    );
  });

  it('트림 레이어가 없으면 SVG를 바꾸지 않는다', () => {
    expect(trimmedPathSvg(desktopArcSvg, 'progress-ring/Arc', [])).toBe(desktopArcSvg);
  });

  it('숫자는 유효 6자리로 쓰고 끝의 0과 -0을 없앤다', () => {
    expect(svgNumber(0.46000000834465027)).toBe('0.46');
    expect(svgNumber(31.12300000001)).toBe('31.123');
    expect(svgNumber(-0.39560127258)).toBe('-0.395601');
    expect(svgNumber(-0)).toBe('0');
  });
});

// @codocs [[피그마 연동:자산]]
describe('트림 벡터와 SVG 요소의 짝을 확실히 정할 수 없으면 이유와 함께 내보내기를 실패한다', () => {
  function fails(svg: string, vectors: TrimmedVector[]): () => string {
    return () => trimmedPathSvg(svg, 'progress-ring/Arc', vectors);
  }

  it('트림이 걸린 레이어가 여럿이면 실패한다', () => {
    expect(fails(serverArcSvg, [arcVector(), arcVector({ name: 'Arc 2' })])).toThrow(
      /레이어가 여럿/u,
    );
  });

  it('트림 레이어가 벡터가 아니거나 경로가 하나가 아니면 실패한다', () => {
    expect(fails(serverArcSvg, [arcVector({ paths: null })])).toThrow(/벡터가 아니라/u);
    expect(fails(serverArcSvg, [arcVector({ paths: [ARC_PATH_DATA, ARC_PATH_DATA] })])).toThrow(
      /경로가 2개/u,
    );
  });

  it('트림 기본값을 읽지 못했거나 시작이 끝보다 크면 실패한다', () => {
    expect(fails(serverArcSvg, [arcVector({ start: null })])).toThrow(/트림 기본값/u);
    expect(fails(serverArcSvg, [arcVector({ start: 0.8, end: 0.2 })])).toThrow(/트림 기본값/u);
  });

  it('SVG에 선이 있는 path 요소가 하나가 아니면 실패한다', () => {
    const twoStrokes = serverArcSvg.replace('</svg>', '<path d="M0 0L1 1" stroke="#000"/>\n</svg>');
    const noStroke = '<svg><path d="M0 0L1 1" fill="#000"/></svg>';
    expect(fails(twoStrokes, [arcVector()])).toThrow(/2개/u);
    expect(fails(noStroke, [arcVector()])).toThrow(/0개/u);
  });

  it('요소에 transform이 있으면 실패한다', () => {
    const rotated = serverArcSvg.replace('pathLength="1"', 'transform="rotate(10)"');
    expect(fails(rotated, [arcVector()])).toThrow(/transform/u);
  });
});
