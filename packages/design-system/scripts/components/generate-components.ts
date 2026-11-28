import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import * as prettier from 'prettier';

import { behaviorSpecOf } from '../../src/behaviors/behavior-specs.ts';
import {
  COMPONENT_SCHEMA_VERSION,
  type ComponentSchema,
} from '../../src/figma-export/component-schema.ts';
import { componentsDir, tokensCssPath } from '../package-paths.ts';
import { componentFiles, type GeneratedFile, tokenCatalog } from './component-files.ts';
import type { BehaviorSource } from './component-model.ts';
import { nameWords, pascalCase } from './component-naming.ts';

// 사용법: node scripts/components/generate-components.ts
// src/components/<이름>/<이름>.json(피그마 스키마)마다 같은 폴더에 생성 파일(이름에 .gen)을 만든다.
// 검증 자료(<이름>.layout.json)는 읽지 않는다. 스키마가 없는 폴더의 생성 파일과 더는 만들지 않는 생성 파일은 지운다.

/** 생성 파일 이름에 드는 표시 */
const GENERATED_MARK = '.gen.';

/** 검증 자료 파일 이름의 끝 */
const LAYOUT_SUFFIX = '.layout.json';

/** 생성 파일에서 `src/`까지의 경로(`src/components/<이름>/`에서) */
const SOURCE_PATH = '../..';

if (import.meta.main) {
  await main();
}

/**
 * 스키마를 모두 읽어 컴포넌트마다 생성 파일을 쓴다.
 * @codocs [[디자인 시스템:세 겹]]
 * @codocs [[디자인 시스템:스키마]]
 */
async function main(): Promise<void> {
  const schemas = readSchemas(componentsDir);
  const files = componentFiles(schemas, {
    behaviors: registryBehaviors(),
    tokens: tokenCatalog(readFileSync(tokensCssPath, 'utf8')),
    paths: { source: SOURCE_PATH },
  });
  const written = await writeGeneratedFiles(componentsDir, files);
  const removed = removeStaleFiles(componentsDir, new Set(written));
  console.log(
    `[components] 스키마 ${String(schemas.length)}개에서 ${String(written.length)}개 파일을 만들고 ${String(removed.length)}개 파일을 지웠다.`,
  );
}

/**
 * 실제 동작 등록부를 생성기의 꼴로 감싼다. 훅은 `behaviors/<종류>/use-<종류>-behavior.ts`의 `use<종류>Behavior`다.
 * @codocs [[디자인 시스템:동작의 종류]]
 * @returns 동작 등록부
 */
export function registryBehaviors(): BehaviorSource {
  return {
    specOf: behaviorSpecOf,
    hookOf: (name) => ({
      module: `${SOURCE_PATH}/behaviors/${name}/use-${name}-behavior`,
      hook: `use${pascalCase(nameWords(name))}Behavior`,
    }),
  };
}

/**
 * 컴포넌트 폴더에서 스키마를 모두 읽는다. 폴더 이름과 같은 `<이름>.json`이 스키마다.
 * @codocs [[디자인 시스템:스키마]]
 * @param root 컴포넌트 폴더들이 있는 곳
 * @returns 스키마
 */
export function readSchemas(root: string): ComponentSchema[] {
  if (!existsSync(root)) {
    return [];
  }
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap(
      /**
       * 폴더 하나에서 스키마를 읽는다.
       * @param entry 폴더 항목
       */
      (entry) => {
        const file = path.join(root, entry.name, `${entry.name}.json`);
        if (!existsSync(file)) {
          return [];
        }
        const value: unknown = JSON.parse(readFileSync(file, 'utf8'));
        if (!isComponentSchema(value)) {
          throw new Error(
            `[components] ${path.relative(root, file)}가 스키마 판 ${String(COMPONENT_SCHEMA_VERSION)}의 꼴이 아니다.`,
          );
        }
        return [value];
      },
    )
    .toSorted((a, b) => a.name.localeCompare(b.name));
}

/**
 * 스키마 파일의 꼴을 본다. 플러그인이 같은 타입으로 쓰므로 판과 큰 틀만 확인한다.
 * @param value 읽은 JSON
 * @returns 스키마면 true
 */
function isComponentSchema(value: unknown): value is ComponentSchema {
  return (
    typeof value === 'object' &&
    value !== null &&
    Reflect.get(value, 'formatVersion') === COMPONENT_SCHEMA_VERSION &&
    typeof Reflect.get(value, 'name') === 'string' &&
    Array.isArray(Reflect.get(value, 'variants')) &&
    Array.isArray(Reflect.get(value, 'properties'))
  );
}

/**
 * 생성 파일을 저장소의 Prettier 설정으로 맞춰 쓴다.
 * @param root 컴포넌트 폴더들이 있는 곳
 * @param files 생성 파일
 * @returns 쓴 파일 경로
 */
export async function writeGeneratedFiles(
  root: string,
  files: readonly GeneratedFile[],
): Promise<string[]> {
  const written: string[] = [];
  for (const file of files) {
    const target = path.join(root, file.folder, file.name);
    const config = (await prettier.resolveConfig(target)) ?? {};
    const text = await prettier.format(file.text, { ...config, filepath: target });
    writeFileSync(target, text);
    written.push(target);
  }
  return written;
}

/**
 * 더는 만들지 않는 생성 파일을 지운다. 이름에 `.gen.`이 든 파일만 본다.
 * @param root 컴포넌트 폴더들이 있는 곳
 * @param keep 이번에 쓴 파일
 * @returns 지운 파일 경로
 */
function removeStaleFiles(root: string, keep: ReadonlySet<string>): string[] {
  if (!existsSync(root)) {
    return [];
  }
  const removed: string[] = [];
  for (const folder of readdirSync(root, { withFileTypes: true })) {
    if (!folder.isDirectory()) {
      continue;
    }
    for (const name of readdirSync(path.join(root, folder.name))) {
      const file = path.join(root, folder.name, name);
      if (name.includes(GENERATED_MARK) && !name.endsWith(LAYOUT_SUFFIX) && !keep.has(file)) {
        rmSync(file);
        removed.push(file);
      }
    }
  }
  return removed;
}
