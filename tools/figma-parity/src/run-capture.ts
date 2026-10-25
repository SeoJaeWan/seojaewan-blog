import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { type AffectedSelection, type PatternCode, selectAffected } from './affected.ts';
import { changedFilesSince, gitShow } from './git-files.ts';
import {
  COMPONENTS_SOURCE_DIR,
  defaultResultsDir,
  DESIGN_SYSTEM_INDEX,
  fromRepo,
  repoRoot,
  STORYBOOK_PACKAGES,
  type StorybookName,
  toolRoot,
  WEB_SOURCE_DIR,
} from './paths.ts';
import {
  CAPTURE_RESULT_FILE,
  type CaptureRow,
  CAPTURES_FILE,
  type CaptureSummary,
  RESULTS_DIR_ENV,
  SELECTION_FILE,
} from './results.ts';
import { PATTERN_TITLE_PREFIX } from './story-target.ts';
import { loadTargets, type Target, variantResultDir } from './targets.ts';

// 사용법: node src/run-capture.ts [--affected] [--base <ref>] [--target <대상>]... [--no-build] [--out <폴더>]
//                                [--print-range]
// 캡처할 대상(컴포넌트와 조립)을 고르고 Storybook을 빌드한 뒤 Playwright Test로 캡처한다.
// 결과는 <결과 폴더>/captures.json과 대상·변형마다 figma.png, code.png, diff.png다.
// --target: 대상 이름(`button`, `patterns/menu/folder`)이나 피그마 이름(`Button`, `Menu/Folder`)으로 고른다.
// --affected: 기준 브랜치와 비교해 바뀐 파일로 범위를 정한다([[피그마 연동:캡처 범위]]).
// --print-range: 범위만 정해 JSON 한 줄(`{ targets, storybooks, reason }`)로 출력한다. 빌드·캡처를 하지 않는다.
const AFFECTED_FLAG = '--affected';
const BASE_FLAG = '--base';
const NO_BUILD_FLAG = '--no-build';
const TARGET_FLAG = '--target';
const OUT_FLAG = '--out';
const PRINT_RANGE_FLAG = '--print-range';
const SOURCE_FILE_PATTERN = /\.(ts|tsx)$/u;
const NON_RENDERING_FILE_PATTERN = /\.(test|fixture)\.tsx?$/u;

main();

/**
 * 캡처를 실행한다.
 * @codocs [[피그마 연동:CI]]
 */
function main(): void {
  const argv = process.argv.slice(2);
  const { targets, fileErrors } = loadTargets();
  const selected = selectTargets(targets, argv);
  if (argv.includes(PRINT_RANGE_FLAG)) {
    process.stdout.write(
      `${JSON.stringify({
        targets: selected.targets.map((target) => target.id),
        storybooks: storybooksOf(selected.targets),
        reason: selected.reason,
      })}\n`,
    );
    return;
  }
  const outIndex = argv.indexOf(OUT_FLAG);
  const resultsDir = path.resolve(outIndex >= 0 ? (argv[outIndex + 1] ?? '') : defaultResultsDir);
  rmSync(resultsDir, { recursive: true, force: true });
  mkdirSync(resultsDir, { recursive: true });
  if (selected.targets.length === 0) {
    console.log('[figma-parity] 캡처할 대상이 없다.');
    writeSummary(resultsDir, { rows: [], fileErrors });
    process.exitCode = fileErrors.length > 0 ? 1 : 0;
    return;
  }
  console.log(
    `[figma-parity] 캡처할 대상: ${selected.targets.map((target) => target.id).join(', ')}`,
  );
  if (!argv.includes(NO_BUILD_FLAG)) {
    for (const storybook of storybooksOf(selected.targets)) {
      run('pnpm', ['--filter', `./${STORYBOOK_PACKAGES[storybook]}`, 'run', 'build-storybook'], {
        failure: `${storybook} Storybook 빌드`,
      });
    }
  }
  writeFileSync(
    path.join(resultsDir, SELECTION_FILE),
    `${JSON.stringify(selected.targets.map((target) => target.id))}\n`,
  );
  const status = run('pnpm', ['exec', 'playwright', 'test', '-c', 'playwright.config.ts'], {
    cwd: toolRoot,
    env: { [RESULTS_DIR_ENV]: resultsDir },
  });
  rmSync(path.join(resultsDir, SELECTION_FILE), { force: true });
  const rows = selected.targets.flatMap((target) =>
    target.variants.map((variant) => readRow(resultsDir, target, variant.variant)),
  );
  writeSummary(resultsDir, { rows, fileErrors });
  const failed = rows.filter((row) => row.error !== null);
  console.log(
    `[figma-parity] ${String(rows.length)}개 변형 캡처, ${String(failed.length)}개 실패. 결과: ${resultsDir}`,
  );
  if (status !== 0 || failed.length > 0 || fileErrors.length > 0) {
    process.exitCode = 1;
  }
}

/**
 * 인자와 바뀐 파일로 캡처할 대상을 고른다.
 * @codocs [[피그마 연동:캡처 범위]]
 * @param targets 피그마 자료가 있는 대상
 * @param argv 명령 인자
 * @returns 고른 대상과 전체로 정한 이유
 */
function selectTargets(
  targets: readonly Target[],
  argv: readonly string[],
): { targets: Target[]; reason: string | null } {
  let selected = [...targets];
  const named = argv.flatMap((arg, index) => (arg === TARGET_FLAG ? [argv[index + 1] ?? ''] : []));
  if (named.length > 0) {
    selected = selected.filter(
      (target) => named.includes(target.id) || named.includes(target.name),
    );
  }
  if (!argv.includes(AFFECTED_FLAG) && !argv.includes(PRINT_RANGE_FLAG)) {
    return { targets: selected, reason: null };
  }
  const selection = affectedSelection(argv, targets);
  if (selection.all) {
    return { targets: selected, reason: selection.reason };
  }
  return {
    targets: selected.filter((target) =>
      target.kind === 'component'
        ? selection.components.has(target.id)
        : selection.patterns.has(target.name),
    ),
    reason: null,
  };
}

/**
 * 기준 브랜치와의 merge-base 이후 바뀐 파일(커밋하지 않은 변경과 추적하지 않는 새 파일 포함)로 범위를 정한다.
 * @param argv 명령 인자
 * @param targets 피그마 자료가 있는 대상
 * @returns 캡처 범위
 */
function affectedSelection(argv: readonly string[], targets: readonly Target[]): AffectedSelection {
  const baseIndex = argv.indexOf(BASE_FLAG);
  const { mergeBase, files: changedFiles } = changedFilesSince(
    baseIndex >= 0 ? argv[baseIndex + 1] : undefined,
  );
  return selectAffected({
    changedFiles,
    componentSources: readComponentSources(),
    patterns: readPatternCode(),
    patternAreas: new Map(
      targets
        .filter((target) => target.kind === 'pattern')
        .map((target) => [target.name, target.id.split('/')[1] ?? '']),
    ),
    readChange: (file) => ({
      before: gitShow(mergeBase, file),
      after: existsSync(fromRepo(file)) ? readFileSync(fromRepo(file), 'utf8') : undefined,
    }),
  });
}

/**
 * 컴포넌트 소스(테스트 제외, 스토리 포함)를 읽는다.
 * @returns 컴포넌트 폴더 이름 → 소스 목록
 */
function readComponentSources(): Map<string, string[]> {
  const sources = new Map<string, string[]>();
  const dir = fromRepo(COMPONENTS_SOURCE_DIR);
  if (!existsSync(dir)) {
    return sources;
  }
  for (const component of readdirSync(dir)) {
    sources.set(
      component,
      listSources(path.join(dir, component)).map((file) => readFileSync(file, 'utf8')),
    );
  }
  return sources;
}

/**
 * 앱의 조립 스토리(제목이 `Patterns/`로 시작)마다 스토리와 그 스토리가 import하는 앱 파일, 쓰는 디자인 시스템
 * 컴포넌트를 모은다.
 * @returns 조립 이름 → 조립 코드
 */
function readPatternCode(): Map<string, PatternCode> {
  const exported = designSystemExports();
  const patterns = new Map<string, PatternCode>();
  for (const story of listSources(fromRepo(WEB_SOURCE_DIR)).filter((file) =>
    file.endsWith('.stories.tsx'),
  )) {
    const title = new RegExp(`title:\\s*['"]${PATTERN_TITLE_PREFIX}([^'"]+)['"]`, 'u').exec(
      readFileSync(story, 'utf8'),
    )?.[1];
    if (title === undefined) {
      continue;
    }
    const files = importClosure(story);
    const sources = [...files].map((file) => readFileSync(file, 'utf8'));
    const components = new Set<string>();
    for (const source of sources) {
      for (const match of source.matchAll(
        /import\s+(?:type\s+)?\{([^}]*)\}\s+from\s+['"]@seojaewan\/design-system['"]/gu,
      )) {
        for (const name of (match[1] ?? '').split(',').map((part) => part.trim())) {
          const component = exported.get(name.replace(/^type\s+/u, ''));
          if (component !== undefined) {
            components.add(component);
          }
        }
      }
    }
    patterns.set(title, {
      files: new Set(
        [...files].map((file) => path.relative(repoRoot, file).split(path.sep).join('/')),
      ),
      sources,
      components,
    });
  }
  return patterns;
}

/**
 * 파일에서 시작해 상대 경로·`@/` 별칭 import를 따라간 앱 파일을 모은다.
 * @param entry 시작 파일(절대 경로)
 * @returns 절대 경로 집합
 */
function importClosure(entry: string): Set<string> {
  const appSource = fromRepo(WEB_SOURCE_DIR);
  const found = new Set<string>();
  const queue = [entry];
  for (let file = queue.shift(); file !== undefined; file = queue.shift()) {
    if (found.has(file)) {
      continue;
    }
    found.add(file);
    for (const match of readFileSync(file, 'utf8').matchAll(/from\s+['"]([^'"]+)['"]/gu)) {
      const specifier = match[1] ?? '';
      const base = specifier.startsWith('@/')
        ? path.join(appSource, specifier.slice(2))
        : specifier.startsWith('.')
          ? path.resolve(path.dirname(file), specifier)
          : undefined;
      const resolved =
        base === undefined
          ? undefined
          : [base, `${base}.ts`, `${base}.tsx`].find(
              (candidate) => existsSync(candidate) && SOURCE_FILE_PATTERN.test(candidate),
            );
      if (resolved !== undefined) {
        queue.push(resolved);
      }
    }
  }
  return found;
}

/**
 * 디자인 시스템 공개 진입점에서 이름 → 컴포넌트 폴더 표를 만든다.
 * @returns 공개 이름 → 컴포넌트 폴더 이름
 */
function designSystemExports(): Map<string, string> {
  const names = new Map<string, string>();
  const index = fromRepo(DESIGN_SYSTEM_INDEX);
  if (!existsSync(index)) {
    return names;
  }
  for (const match of readFileSync(index, 'utf8').matchAll(
    /export\s+(?:type\s+)?\{([^}]*)\}\s+from\s+['"]\.\/components\/([^/'"]+)\//gu,
  )) {
    for (const name of (match[1] ?? '').split(',').map((part) => part.trim())) {
      if (name !== '') {
        names.set(name, match[2] ?? '');
      }
    }
  }
  return names;
}

/**
 * 폴더 아래 소스 파일(테스트·fixture 제외)을 모두 찾는다.
 * @param dir 폴더
 * @returns 절대 경로 목록
 */
function listSources(dir: string): string[] {
  if (!existsSync(dir)) {
    return [];
  }
  return readdirSync(dir, { withFileTypes: true }).flatMap(
    /**
     * 폴더면 그 안을, 소스 파일이면 그 파일을 돌려준다.
     * @param entry 폴더 항목
     * @returns 절대 경로 목록
     */
    (entry) => {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return listSources(file);
      }
      return SOURCE_FILE_PATTERN.test(entry.name) && !NON_RENDERING_FILE_PATTERN.test(entry.name)
        ? [file]
        : [];
    },
  );
}

/**
 * 대상들의 Storybook을 구한다.
 * @param targets 대상
 * @returns Storybook 이름
 */
function storybooksOf(targets: readonly Target[]): StorybookName[] {
  return [...new Set(targets.map((target) => target.storybook))].sort();
}

/**
 * 변형 하나의 캡처 결과 파일을 읽는다. 테스트가 결과를 남기지 못했으면 실패 줄을 만든다.
 * @param resultsDir 결과 폴더
 * @param target 대상
 * @param variant 변형 파일 이름
 * @returns 캡처 표 줄
 */
function readRow(resultsDir: string, target: Target, variant: string): CaptureRow {
  const file = path.join(variantResultDir(resultsDir, target, variant), CAPTURE_RESULT_FILE);
  if (!existsSync(file)) {
    return {
      target: target.id,
      name: target.name,
      variant,
      figma: null,
      code: null,
      diff: null,
      error: '캡처 테스트가 결과를 남기지 못했다(Playwright 출력 확인)',
    };
  }
  return JSON.parse(readFileSync(file, 'utf8')) as CaptureRow;
}

/**
 * captures.json을 쓴다.
 * @param resultsDir 결과 폴더
 * @param summary 캡처 결과
 */
function writeSummary(resultsDir: string, summary: CaptureSummary): void {
  writeFileSync(path.join(resultsDir, CAPTURES_FILE), `${JSON.stringify(summary, null, 2)}\n`);
}

/**
 * 명령을 실행한다. Windows(pnpm.cmd)에서도 찾도록 셸로 실행한다.
 * @param command 명령
 * @param args 인자(공백 없는 고정 값)
 * @param options 작업 폴더, 더할 환경 변수, 실패하면 멈출 때 쓸 이름
 * @param options.cwd 작업 폴더(기본은 저장소 루트)
 * @param options.env 더할 환경 변수
 * @param options.failure 실패하면 멈출 때 쓸 이름. 없으면 종료 코드만 돌려준다
 * @returns 종료 코드
 */
function run(
  command: string,
  args: readonly string[],
  options: { cwd?: string; env?: Record<string, string>; failure?: string },
): number {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? repoRoot,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, ...options.env },
  });
  const status = result.status ?? 1;
  if (status !== 0 && options.failure !== undefined) {
    throw new Error(`${options.failure}가 실패했다.`);
  }
  return status;
}
