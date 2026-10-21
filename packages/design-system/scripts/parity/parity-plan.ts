/**
 * 피그마 내보내기 자료(figma/)를 읽어 비교할 항목 목록을 만든다. Playwright Test(parity.spec.ts)와
 * run-parity.ts가 함께 쓴다. 변형 하나, 그리고 BOOLEAN 속성을 하나씩 바꾼 경우(D4) 하나가 항목 하나다.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import {
  COMPONENT_MANIFEST_FILE,
  FIGMA_COMPONENTS_FOLDER,
  FIGMA_SETTINGS_FILE,
  figmaDir,
  sourceDir,
  tokensCssPath,
  tokensJsonPath,
} from '../package-paths.ts';
import { textUtilityVariables } from '../tokens/tokens-css.ts';
import { parseFigmaExport } from './figma-export.ts';
import { type TokenNames, type VariantChecks, variantChecks } from './layer-checks.ts';

/** 비교 항목 하나 */
export type PlanItem = {
  component: string;
  componentName: string;
  variant: string;
  /** BOOLEAN 경우(`showIcon=true`). 변형 기본 모양이면 null */
  caseKey: string | null;
  /** 결과 폴더 이름(parity-results/<컴포넌트>/<이름>/) */
  resultName: string;
  /** 피그마 순서의 변형 속성 */
  properties: [string, string][];
  /** BOOLEAN 경우의 스토리 arg */
  booleanArg: { name: string; value: boolean } | null;
  checks: VariantChecks;
  /** 피그마 변형 PNG 경로 */
  figmaImage: string;
};

/** 비교 계획 */
export type ParityPlan = {
  items: PlanItem[];
  /** 컴포넌트 폴더 파일 오류 */
  fileErrors: string[];
};

/**
 * figma/를 읽어 비교 계획을 만든다. figma.json이 없으면 빈 계획이다.
 * @codocs [[피그마 일치 검사:CI 비교]]
 * @param components 비교할 컴포넌트 폴더 이름. 없으면 모두
 * @returns 비교 계획
 */
export function loadParityPlan(components?: readonly string[]): ParityPlan {
  const settingsPath = path.join(figmaDir, FIGMA_SETTINGS_FILE);
  if (!existsSync(settingsPath)) {
    return { items: [], fileErrors: [] };
  }
  const componentsDir = path.join(figmaDir, FIGMA_COMPONENTS_FOLDER);
  const manifests = readManifests(componentsDir);
  const figmaExport = parseFigmaExport(readJson(settingsPath), manifests);
  const tokens = tokenNames();
  const items: PlanItem[] = [];
  for (const parityCase of figmaExport.cases) {
    if (components !== undefined && !components.includes(parityCase.component)) {
      continue;
    }
    const manifest = asRecord(manifests[parityCase.component]);
    const variants = asRecord(manifest.variants);
    const entry = asRecord(variants[parityCase.variant]);
    const booleans = asRecord(manifest.booleans);
    const figmaImage = path.join(componentsDir, parityCase.component, `${parityCase.variant}.png`);
    items.push({
      ...parityCase,
      caseKey: null,
      resultName: parityCase.variant,
      booleanArg: null,
      checks: variantChecks(asArray(entry.layers), asStrings(entry.hidden), tokens),
      figmaImage,
    });
    for (const [caseKey, value] of Object.entries(asRecord(entry.cases))) {
      const [name = '', flag = ''] = caseKey.split('=');
      if (!(name in booleans) || (flag !== 'true' && flag !== 'false')) {
        throw new Error(
          `${parityCase.component}/${parityCase.variant}: 경우 ${caseKey}가 booleans에 없다.`,
        );
      }
      const caseEntry = asRecord(value);
      items.push({
        ...parityCase,
        caseKey,
        resultName: `${parityCase.variant},${caseKey}`,
        booleanArg: { name, value: flag === 'true' },
        checks: variantChecks(asArray(caseEntry.layers), asStrings(caseEntry.hidden), tokens),
        figmaImage,
      });
    }
  }
  return { items, fileErrors: findFileErrors(componentsDir, manifests, figmaExport.cases) };
}

/**
 * tokens.css·theme.css의 변수와 유틸리티 이름, 글자 스타일 유틸리티 변수를 읽는다.
 * @returns 토큰 이름 정보
 */
function tokenNames(): TokenNames {
  const css = [tokensCssPath, path.join(sourceDir, 'theme.css')]
    .filter((file) => existsSync(file))
    .map((file) => readFileSync(file, 'utf8'))
    .join('\n');
  const variables = new Set(
    [...css.matchAll(/(--[a-z0-9-]+)\s*:/gu)].map((match) => match[1] ?? ''),
  );
  const utilities = new Set(
    [...css.matchAll(/@utility\s+([a-z0-9-]+)\s*\{/gu)].map((match) => match[1] ?? ''),
  );
  return { variables, utilities, textUtilities: textUtilityVariables(readJson(tokensJsonPath)) };
}

/**
 * 컴포넌트 폴더마다 export.json을 읽는다.
 * @param componentsDir figma/components
 * @returns 폴더 이름 → export.json
 */
function readManifests(componentsDir: string): Record<string, unknown> {
  const manifests: Record<string, unknown> = {};
  if (!existsSync(componentsDir)) {
    return manifests;
  }
  for (const component of readdirSync(componentsDir).sort()) {
    const file = path.join(componentsDir, component, COMPONENT_MANIFEST_FILE);
    if (existsSync(file)) {
      manifests[component] = readJson(file);
    }
  }
  return manifests;
}

/**
 * 컴포넌트 폴더에 빠진 파일이나 가리키지 않는 파일이 있는지 찾는다.
 * @param componentsDir figma/components
 * @param manifests 폴더 이름 → export.json
 * @param cases 변형 목록
 * @returns 오류 메시지
 */
function findFileErrors(
  componentsDir: string,
  manifests: Readonly<Record<string, unknown>>,
  cases: readonly { component: string; variant: string }[],
): string[] {
  const errors: string[] = [];
  if (!existsSync(componentsDir)) {
    return errors;
  }
  for (const component of readdirSync(componentsDir).sort()) {
    if (!(component in manifests)) {
      errors.push(`${FIGMA_COMPONENTS_FOLDER}/${component}/에 ${COMPONENT_MANIFEST_FILE}이 없다`);
      continue;
    }
    const wanted = new Set([
      COMPONENT_MANIFEST_FILE,
      ...cases.filter((item) => item.component === component).map((item) => `${item.variant}.png`),
    ]);
    const present = new Set(readdirSync(path.join(componentsDir, component)));
    for (const file of wanted) {
      if (!present.has(file)) {
        errors.push(`${FIGMA_COMPONENTS_FOLDER}/${component}/${file}이 없다`);
      }
    }
    for (const file of present) {
      if (!wanted.has(file)) {
        errors.push(
          `${FIGMA_COMPONENTS_FOLDER}/${component}/${file}은 export.json이 가리키지 않는 파일이다`,
        );
      }
    }
  }
  return errors;
}

/**
 * JSON 파일을 읽는다.
 * @param file 파일 경로
 * @returns 파싱한 값
 */
function readJson(file: string): unknown {
  return JSON.parse(readFileSync(file, 'utf8'));
}

/**
 * 객체로 본다(아니면 빈 객체).
 * @param value 값
 * @returns 객체
 */
function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value))
    : {};
}

/**
 * 배열로 본다(아니면 빈 배열).
 * @param value 값
 * @returns 배열
 */
function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? [...(value as unknown[])] : [];
}

/**
 * 문자열 배열로 본다.
 * @param value 값
 * @returns 문자열 배열
 */
function asStrings(value: unknown): string[] {
  return asArray(value).filter((item): item is string => typeof item === 'string');
}
