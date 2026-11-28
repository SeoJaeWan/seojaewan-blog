import { listAssetComponents } from '../figma-reader';
import { rasterExtension } from '../image-format';
import { assetFile } from '../naming';
import { monoColorSvg, normalizeSvgBytes, utf8Decode } from '../svg-normalize';
import { relativeTransform, trimmedPathSvg, type TrimmedVector } from '../svg-trim';
import { utf8Encode } from '../utf8';
import { assetKinds } from './asset-groups';
import type { Violation } from './check-structure';

// Foundations의 자산 컴포넌트를 모두 원본 파일(SVG, 래스터)로 내보낸다. GitHub와 UI를 모르고 파일을 쓰지 않는다.

// 피그마가 사용자 기능 플래그로 막은 API를 부르면 나오는 오류 문장이다.
const UNSUPPORTED_API_TEXT = 'is not a supported API';

/**
 * 자산 내보내기 결과.
 * - files: 자산 폴더(`src/assets/`) 기준 파일 경로(`icons/ic_fluent_add_20_regular.svg`) → 내용
 * - violations: 파일로 만들 수 없는 자산. 하나라도 있으면 자산 PR을 만들지 않는다
 */
export type AssetsExport = {
  files: Map<string, Uint8Array>;
  violations: Violation[];
};

/** 내보낸 자산 파일의 내용과 확장자. extension: 바이트의 실제 형식에 맞는 확장자(`svg`, `png`, `jpg` 등) */
export type AssetFileExport = {
  bytes: Uint8Array;
  extension: string;
};

/**
 * Foundations의 자산 컴포넌트를 모두 원본 파일로 내보낸다. 한 가지 색 자산은 색을 `currentColor`로, SVG 안의 id는
 * 내용으로 정해지는 이름으로 바꾼다. 이미지는 이미지 칠 하나면 원본 바이트, 아니면 1배 PNG다.
 * 같은 파일 이름이 되는 자산이 둘 이상이면 막는다.
 * @codocs [[디자인 시스템:자산]]
 * @codocs [[디자인 시스템:피그마 플러그인]]
 * @returns 자산 파일과 위반
 */
export async function exportAssets(): Promise<AssetsExport> {
  const files = new Map<string, Uint8Array>();
  const violations: Violation[] = [];
  const owners = new Map<string, string>();
  for (const { ref, node } of await listAssetComponents()) {
    const owner = owners.get(ref.file);
    if (owner !== undefined) {
      violations.push({
        where: `자산 / ${ref.group} / ${ref.name}`,
        reason: `자산 파일 이름 \`${ref.file}\`이 ${owner}와 겹친다`,
        fix: '자산 컴포넌트 이름이 파일 이름으로 바꿨을 때 겹치지 않게 고친다.',
        nodeId: node.id,
      });
      continue;
    }
    owners.set(ref.file, `${ref.group} / ${ref.name}`);
    try {
      const exported = await exportAssetFile(node, assetKinds[ref.group]);
      files.set(assetFile(ref.file, exported.extension), exported.bytes);
    } catch (error) {
      violations.push({
        where: `자산 / ${ref.group} / ${ref.name}`,
        reason: error instanceof Error ? error.message : String(error),
        fix: '자산 원본을 고친다.',
        nodeId: node.id,
      });
    }
  }
  return { files, violations };
}

/**
 * 자산 원본 컴포넌트 하나를 파일로 내보낸다. 경로 트림이 걸린 벡터는 벡터 경로와 트림 기본값으로 요소를 직접 만든다.
 * @codocs [[디자인 시스템:자산]]
 * @codocs [[디자인 시스템:모션]]
 * @param node 자산 컴포넌트
 * @param kind 묶음의 처리 방식
 * @returns 파일 내용과 확장자
 */
export async function exportAssetFile(
  node: ComponentNode,
  kind: 'mono' | 'color' | 'raster',
): Promise<AssetFileExport> {
  if (kind === 'raster') {
    return rasterAsset(node);
  }
  const exported = normalizeSvgBytes(
    await node.exportAsync({ format: 'SVG', svgOutlineText: true, svgIdAttribute: false }),
  );
  const trims = trimmedVectors(node);
  const svg =
    trims.length === 0
      ? exported
      : utf8Encode(trimmedPathSvg(utf8Decode(exported), node.name, trims));
  return { bytes: kind === 'mono' ? monoColorSvg(svg) : svg, extension: 'svg' };
}

/**
 * 자산 컴포넌트 안에서 경로 트림 키프레임(PATH_TRIM_START·PATH_TRIM_END)이 걸린 레이어를 읽는다.
 * 경로는 벡터의 `vectorPaths`(트림 전 전체), 위치는 두 노드의 `absoluteTransform`, 보이는 범위는 트랙의 기본값(baseValue)이다.
 * @codocs [[디자인 시스템:모션]]
 * @param component 자산 컴포넌트
 * @returns 트림 레이어
 */
function trimmedVectors(component: ComponentNode): TrimmedVector[] {
  let nodes: SceneNode[];
  try {
    nodes = component.findAll((node) => {
      const tracks = trimTracks(node);
      return tracks.start !== undefined || tracks.end !== undefined;
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes(UNSUPPORTED_API_TEXT)) {
      throw new Error(
        '모션 API를 쓸 수 없어 경로 트림을 확인할 수 없다. 모션 기능을 쓸 수 있는 계정으로 내보낸다.',
      );
    }
    throw error;
  }
  return nodes.map(
    /**
     * 트림 레이어 하나를 순수 데이터로 옮긴다.
     * @param node 트림 레이어
     * @returns 트림 벡터
     */
    (node) => {
      const tracks = trimTracks(node);
      return {
        name: node.name,
        paths: node.type === 'VECTOR' ? node.vectorPaths.map((path) => path.data) : null,
        transform: relativeTransform(component.absoluteTransform, node.absoluteTransform),
        start: trimBase(tracks.start, 0),
        end: trimBase(tracks.end, 1),
      };
    },
  );
}

/**
 * 노드의 경로 트림 트랙을 꺼낸다.
 * @param node 노드
 * @returns 시작·끝 트랙(없으면 undefined)
 */
function trimTracks(node: SceneNode): {
  start: ManualKeyframeBinding | undefined;
  end: ManualKeyframeBinding | undefined;
} {
  if (!('manualKeyframeTracks' in node)) {
    return { start: undefined, end: undefined };
  }
  const tracks = node.manualKeyframeTracks;
  return { start: tracks.PATH_TRIM_START, end: tracks.PATH_TRIM_END };
}

/**
 * 트림 트랙의 기본값을 읽는다.
 * @param track 트림 트랙
 * @param fallback 트랙이 없을 때의 값
 * @returns 기본값, 숫자가 아니면 null
 */
function trimBase(track: ManualKeyframeBinding | undefined, fallback: number): number | null {
  if (track === undefined) {
    return fallback;
  }
  return track.baseValue.type === 'FLOAT' ? track.baseValue.value : null;
}

/**
 * 이미지 자산의 바이트를 읽는다. 이미지 칠 하나만 있으면 원본 이미지를, 아니면 1배 PNG를 쓴다.
 * 확장자는 바이트의 매직넘버로 정한다(JPEG 원본이면 `jpg`). 원본이 알 수 없는 형식이면 1배 PNG로 내보낸다.
 * @codocs [[디자인 시스템:자산]]
 * @param node 자산 컴포넌트
 * @returns 이미지 바이트와 확장자
 */
async function rasterAsset(node: ComponentNode): Promise<AssetFileExport> {
  const fills =
    node.fills === figma.mixed ? [] : node.fills.filter((fill) => fill.visible !== false);
  const [fill] = fills;
  if (fills.length === 1 && fill?.type === 'IMAGE' && fill.imageHash !== null) {
    const image = figma.getImageByHash(fill.imageHash);
    if (image !== null) {
      const bytes = await image.getBytesAsync();
      const extension = rasterExtension(bytes);
      if (extension !== undefined) {
        return { bytes, extension };
      }
    }
  }
  const png = await node.exportAsync({ format: 'PNG', constraint: { type: 'SCALE', value: 1 } });
  return { bytes: png, extension: 'png' };
}
