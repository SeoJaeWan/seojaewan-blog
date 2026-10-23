import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import {
  FIGMA_COMPONENTS_DIR,
  FIGMA_PATTERNS_DIR,
  FIGMA_SETTINGS_PATH,
  fromRepo,
  MANIFEST_FILE,
  type StorybookName,
} from './paths.ts';
import { parseManifest, type VariantEntry } from './variant-name.ts';

// 저장소의 피그마 내보내기 자료(컴포넌트와 조립 폴더)를 캡처할 대상 목록으로 읽는다.

/** 캡처할 대상(컴포넌트나 조립) */
export type Target = {
  /**
   * 대상 이름. 컴포넌트는 폴더 이름(`button`), 조립은 `patterns/<영역>/<이름>`이다.
   * `parity-captures` 브랜치와 결과 폴더의 경로이기도 하다.
   */
  id: string;
  kind: 'component' | 'pattern';
  /** 피그마 이름(`Button`, `Menu/Folder`) */
  name: string;
  /** 피그마 그림 폴더(저장소 기준) */
  folder: string;
  /** 스토리가 있는 Storybook */
  storybook: StorybookName;
  variants: VariantEntry[];
};

/** 저장소에 있는 대상 */
export type TargetList = {
  targets: Target[];
  /** PNG가 빠졌거나 export.json이 가리키지 않는 파일이 있는 등 폴더 오류 */
  fileErrors: string[];
  /** figma.json의 PNG 배율 */
  scale: number;
};

/**
 * 컴포넌트 폴더(`figma/components/<c>/`)와 조립 폴더(`figma/patterns/<영역>/<이름>/`)를 읽는다.
 * @codocs [[피그마 연동:캡처 표]]
 * @returns 대상, 폴더 오류, 배율
 */
export function loadTargets(): TargetList {
  const targets: Target[] = [];
  const fileErrors: string[] = [];
  /**
   * 대상 폴더의 export.json을 읽어 대상 목록에 더한다.
   * @param target 변형을 뺀 대상
   */
  function add(target: Omit<Target, 'variants'>): void {
    const manifestPath = fromRepo(`${target.folder}/${MANIFEST_FILE}`);
    if (!existsSync(manifestPath)) {
      fileErrors.push(`${target.folder}/에 ${MANIFEST_FILE}이 없다`);
      return;
    }
    const manifest = parseManifest(
      JSON.parse(readFileSync(manifestPath, 'utf8')),
      `${target.folder}/${MANIFEST_FILE}`,
    );
    targets.push({ ...target, name: manifest.name, variants: manifest.variants });
    fileErrors.push(...folderErrors(target.folder, manifest.variants));
  }
  for (const component of subfolders(FIGMA_COMPONENTS_DIR)) {
    add({
      id: component,
      kind: 'component',
      name: component,
      folder: `${FIGMA_COMPONENTS_DIR}/${component}`,
      storybook: 'design-system',
    });
  }
  for (const area of subfolders(FIGMA_PATTERNS_DIR)) {
    for (const name of subfolders(`${FIGMA_PATTERNS_DIR}/${area}`)) {
      add({
        id: `patterns/${area}/${name}`,
        kind: 'pattern',
        name: `${area}/${name}`,
        folder: `${FIGMA_PATTERNS_DIR}/${area}/${name}`,
        storybook: 'web',
      });
    }
  }
  return { targets, fileErrors, scale: figmaScale() };
}

/**
 * 대상의 피그마 변형 PNG 경로를 구한다.
 * @param target 대상
 * @param variant 변형 파일 이름
 * @returns 절대 경로
 */
export function figmaImagePath(target: Target, variant: string): string {
  return fromRepo(`${target.folder}/${variant}.png`);
}

/**
 * 폴더에 빠진 PNG나 export.json이 가리키지 않는 파일이 있는지 찾는다.
 * @param folder 대상 폴더(저장소 기준)
 * @param variants 변형 목록
 * @returns 오류 메시지
 */
function folderErrors(folder: string, variants: readonly VariantEntry[]): string[] {
  const wanted = new Set([MANIFEST_FILE, ...variants.map((item) => `${item.variant}.png`)]);
  const present = new Set(readdirSync(fromRepo(folder)));
  return [
    ...[...wanted].filter((file) => !present.has(file)).map((file) => `${folder}/${file}이 없다`),
    ...[...present]
      .filter((file) => !wanted.has(file))
      .map((file) => `${folder}/${file}은 ${MANIFEST_FILE}이 가리키지 않는 파일이다`),
  ];
}

/**
 * 폴더 아래 폴더 이름을 정렬해 구한다. 폴더가 없으면 빈 목록이다.
 * @param folder 저장소 기준 폴더
 * @returns 폴더 이름
 */
function subfolders(folder: string): string[] {
  const dir = fromRepo(folder);
  if (!existsSync(dir)) {
    return [];
  }
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

/**
 * figma.json의 PNG 배율을 읽는다.
 * @returns 배율(없으면 1)
 */
function figmaScale(): number {
  const file = fromRepo(FIGMA_SETTINGS_PATH);
  if (!existsSync(file)) {
    return 1;
  }
  const value: unknown = Reflect.get(Object(JSON.parse(readFileSync(file, 'utf8'))), 'scale');
  return typeof value === 'number' && value > 0 ? value : 1;
}

/**
 * 결과 폴더 안 변형 폴더 경로를 구한다.
 * @param resultsDir 결과 폴더
 * @param target 대상
 * @param variant 변형 파일 이름
 * @returns 절대 경로
 */
export function variantResultDir(resultsDir: string, target: Target, variant: string): string {
  return path.join(resultsDir, ...target.id.split('/'), variant);
}
