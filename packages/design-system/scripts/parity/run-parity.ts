import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import {
  COMPONENT_MANIFEST_FILE,
  FIGMA_COMPONENTS_FOLDER,
  FIGMA_SETTINGS_FILE,
  figmaDir,
  packageRoot,
  parityResultsDir,
  tokensJsonPath,
} from '../package-paths.ts';
import {
  type AffectedSelection,
  componentDependents,
  type FileChange,
  selectAffectedComponents,
} from './affected-components.ts';
import { RESULT_FILE, SELECTION_FILE } from './parity-config.ts';
import { loadParityPlan, type PlanItem } from './parity-plan.ts';
import {
  CAPTURE_RESULT_FILE,
  type CaptureRow,
  CAPTURES_FILE,
  type ParitySummary,
  SUMMARY_FILE,
  type VariantResult,
} from './parity-summary.ts';

// 사용법: node scripts/parity/run-parity.ts [--affected] [--base <ref>] [--no-build] [--component <name>]...
//                                          [--print-range | --capture]
// 비교할 컴포넌트를 고르고 Storybook을 빌드한 뒤 Playwright Test(playwright.config.ts)로 비교한다.
// 결과는 parity-results/summary.json에 모으고, CI는 이 파일로 PR 댓글을 남긴다.
// --print-range: 비교 범위만 정해 JSON 한 줄(`{ components, proof, reason }`)로 출력한다. 빌드·비교를 하지 않는다.
// --capture: 판정하지 않고 캡처 표 이미지를 만들어 parity-results/captures.json에 모은다.
const AFFECTED_FLAG = '--affected';
const BASE_FLAG = '--base';
const NO_BUILD_FLAG = '--no-build';
const COMPONENT_FLAG = '--component';
const PRINT_RANGE_FLAG = '--print-range';
const CAPTURE_FLAG = '--capture';
const DEFAULT_BASES = ['origin/main', 'main'] as const;

main();

/**
 * 피그마 일치 검사를 실행한다.
 * @codocs [[피그마 일치 검사:CI 비교]]
 */
function main(): void {
  const argv = process.argv.slice(2);
  if (argv.includes(PRINT_RANGE_FLAG)) {
    printRange(argv);
    return;
  }
  const isCapture = argv.includes(CAPTURE_FLAG);
  if (!isCapture) {
    rmSync(parityResultsDir, { recursive: true, force: true });
  }
  const fullPlan = loadParityPlan();
  if (fullPlan.items.length === 0) {
    console.log('[parity] figma/에 비교할 변형이 없어 건너뛴다.');
    finishEmpty(isCapture, fullPlan.fileErrors);
    return;
  }
  const components = selectComponents(
    [...new Set(fullPlan.items.map((item) => item.component))],
    argv,
  );
  if (components.length === 0) {
    console.log('[parity] 비교할 컴포넌트가 없다.');
    finishEmpty(isCapture, fullPlan.fileErrors);
    return;
  }
  if (!argv.includes(NO_BUILD_FLAG)) {
    run('pnpm run build-storybook --quiet', 'Storybook 빌드');
  }
  const plan = loadParityPlan(components);
  if (isCapture) {
    // 지난 실행의 캡처 결과가 이번 결과처럼 읽히지 않게 지운다.
    for (const item of plan.items) {
      rmSync(path.join(parityResultsDir, item.component, item.resultName, CAPTURE_RESULT_FILE), {
        force: true,
      });
    }
  }
  const selectionFile = path.join(parityResultsDir, SELECTION_FILE);
  mkdirSync(parityResultsDir, { recursive: true });
  writeFileSync(selectionFile, `${JSON.stringify(components)}\n`);
  const spec = isCapture ? 'capture.spec.ts' : 'parity.spec.ts';
  const status = run(
    `pnpm exec playwright test -c scripts/parity/playwright.config.ts ${spec}`,
    undefined,
  );
  rmSync(selectionFile, { force: true });
  if (isCapture) {
    finishCapture(plan.items, status);
    return;
  }
  const results = plan.items.map((item) => readResult(item));
  const failed = results.filter((result) => result.failures.length > 0).length;
  writeSummary({ total: results.length, failed, results, fileErrors: plan.fileErrors });
  console.log(
    `[parity] ${String(results.length)}개 중 ${String(results.length - failed)}개 통과, ${String(failed)}개 실패`,
  );
  if (status !== 0 || failed > 0 || plan.fileErrors.length > 0) {
    process.exitCode = 1;
  }
}

/**
 * 비교할 것이 없을 때 빈 결과를 남긴다.
 * @param isCapture 캡처 모드면 true
 * @param fileErrors 컴포넌트 폴더 파일 오류
 */
function finishEmpty(isCapture: boolean, fileErrors: string[]): void {
  if (isCapture) {
    writeJson(CAPTURES_FILE, { rows: [] });
    return;
  }
  writeSummary({ total: 0, failed: 0, results: [], fileErrors });
}

/**
 * 변형마다 남긴 캡처 결과를 captures.json에 모은다. 캡처하지 못한 변형이 있으면 실패로 끝낸다.
 * @codocs [[피그마 일치 검사:캡처 표]]
 * @param items 캡처한 비교 항목
 * @param status Playwright 종료 코드
 */
function finishCapture(items: readonly PlanItem[], status: number): void {
  const rows = items.map((item) => readCapture(item));
  writeJson(CAPTURES_FILE, { rows });
  const failed = rows.filter((row) => row.error !== null);
  console.log(`[parity] ${String(rows.length)}개 캡처, ${String(failed.length)}개 실패`);
  if (status !== 0 || failed.length > 0) {
    process.exitCode = 1;
  }
}

/**
 * 비교 범위를 정해 JSON 한 줄로 출력한다. CI가 Chromium 설치나 Storybook 빌드 전에 쓴다.
 * 피그마 자료가 있는 컴포넌트만 담는다. 범위가 없으면 `components`가 빈 배열이다.
 * @codocs [[피그마 일치 검사:비교 범위]]
 * @param argv 명령 인자
 */
function printRange(argv: readonly string[]): void {
  const figmaComponents = existsSync(path.join(figmaDir, FIGMA_SETTINGS_FILE))
    ? [...readManifests().keys()]
    : [];
  const selection = figmaComponents.length === 0 ? undefined : affectedSelection(argv);
  const components =
    selection === undefined
      ? []
      : figmaComponents.filter((component) => selection.all || selection.components.has(component));
  const shouldProve = selection?.all === true && selection.proof && components.length > 0;
  const reason = selection?.all === true ? selection.reason : null;
  process.stdout.write(`${JSON.stringify({ components, proof: shouldProve, reason })}\n`);
}

/**
 * 인자와 바뀐 파일로 비교할 컴포넌트를 고른다.
 * @codocs [[피그마 일치 검사:비교 범위]]
 * @param all 피그마 자료가 있는 컴포넌트
 * @param argv 명령 인자
 * @returns 비교할 컴포넌트 폴더 이름
 */
function selectComponents(all: readonly string[], argv: readonly string[]): string[] {
  let selected = [...all];
  const named = argv.flatMap((arg, index) =>
    arg === COMPONENT_FLAG ? [argv[index + 1] ?? ''] : [],
  );
  if (named.length > 0) {
    selected = selected.filter((component) => named.includes(component));
  }
  if (!argv.includes(AFFECTED_FLAG)) {
    return selected;
  }
  const selection = affectedSelection(argv);
  if (selection.all) {
    console.log(`[parity] ${selection.reason}이 바뀌어 모든 컴포넌트를 비교한다.`);
    return selected;
  }
  console.log(`[parity] 영향받는 컴포넌트: ${[...selection.components].join(', ') || '없음'}`);
  return selected.filter((component) => selection.components.has(component));
}

/**
 * 기준 브랜치와의 merge-base 이후 바뀐 파일(커밋하지 않은 변경과 추적하지 않는 새 파일 포함)로 범위를 정한다.
 * @codocs [[피그마 일치 검사:비교 범위]]
 * @param argv 명령 인자
 * @returns 비교 범위
 */
function affectedSelection(argv: readonly string[]): AffectedSelection {
  const baseIndex = argv.indexOf(BASE_FLAG);
  const base = baseIndex >= 0 ? argv[baseIndex + 1] : DEFAULT_BASES.find(hasRef);
  if (base === undefined) {
    throw new Error(`비교 기준 브랜치를 찾지 못했다. ${BASE_FLAG} <ref>로 정한다.`);
  }
  const mergeBase = git(['merge-base', base, 'HEAD']).trim();
  const repoRoot = git(['rev-parse', '--show-toplevel']).trim();
  const changedFiles = [
    ...git(['diff', '--name-only', '--no-renames', '-z', mergeBase]).split('\0'),
    ...git(['ls-files', '--others', '--exclude-standard', '--full-name', '-z']).split('\0'),
  ].filter(Boolean);
  return selectAffectedComponents({
    changedFiles,
    packagePrefix: git(['rev-parse', '--show-prefix']).trim(),
    dependents: componentDependents(readComponentSources()),
    exports: readManifests(),
    tokensJson: existsSync(tokensJsonPath)
      ? parseJson(readFileSync(tokensJsonPath, 'utf8'))
      : undefined,
    readChange: (file): FileChange => ({
      before: gitShow(mergeBase, file),
      after: existsSync(path.join(repoRoot, file))
        ? readFileSync(path.join(repoRoot, file), 'utf8')
        : undefined,
    }),
  });
}

/**
 * 변형 하나의 결과 파일을 읽는다. 테스트가 결과를 남기지 못했으면 실패 결과를 만든다.
 * @param item 비교 항목
 * @returns 변형 결과
 */
function readResult(item: PlanItem): VariantResult {
  const file = path.join(parityResultsDir, item.component, item.resultName, RESULT_FILE);
  if (!existsSync(file)) {
    return {
      component: item.component,
      variant: item.resultName,
      failures: [{ layer: 'test', message: '테스트가 결과를 남기지 못했다(Playwright 출력 확인)' }],
      notes: [],
    };
  }
  return JSON.parse(readFileSync(file, 'utf8')) as VariantResult;
}

/**
 * 변형 하나의 캡처 결과 파일을 읽는다. 테스트가 결과를 남기지 못했으면 실패 줄을 만든다.
 * @param item 비교 항목
 * @returns 캡처 표 줄
 */
function readCapture(item: PlanItem): CaptureRow {
  const file = path.join(parityResultsDir, item.component, item.resultName, CAPTURE_RESULT_FILE);
  if (!existsSync(file)) {
    return {
      component: item.component,
      variant: item.resultName,
      baseVariant: item.variant,
      isCase: item.caseKey !== null,
      figma: null,
      code: null,
      error: '캡처 테스트가 결과를 남기지 못했다(Playwright 출력 확인)',
    };
  }
  return JSON.parse(readFileSync(file, 'utf8')) as CaptureRow;
}

/**
 * 명령을 실행한다. 고정된 명령 문자열 하나로 넘겨 Windows(pnpm.cmd)에서도 셸로 실행한다.
 * @param command 명령
 * @param failureName 실패하면 멈출 때 쓸 이름. 없으면 종료 코드만 돌려준다
 * @returns 종료 코드
 */
function run(command: string, failureName: string | undefined): number {
  const result = spawnSync(command, { cwd: packageRoot, stdio: 'inherit', shell: true });
  const status = result.status ?? 1;
  if (status !== 0 && failureName !== undefined) {
    throw new Error(`${failureName}가 실패했다.`);
  }
  return status;
}

/**
 * 컴포넌트 소스를 읽는다(영향 범위 계산용).
 * @returns 컴포넌트 폴더 이름 → 소스 목록
 */
function readComponentSources(): Map<string, string[]> {
  const componentsDir = path.join(packageRoot, 'src', 'components');
  const sources = new Map<string, string[]>();
  if (!existsSync(componentsDir)) {
    return sources;
  }
  for (const component of readdirSync(componentsDir)) {
    const dir = path.join(componentsDir, component);
    const files = readdirSync(dir).filter((file) => /(?<!\.test|\.stories)\.tsx?$/u.test(file));
    sources.set(
      component,
      files.map((file) => readFileSync(path.join(dir, file), 'utf8')),
    );
  }
  return sources;
}

/**
 * 컴포넌트 폴더마다 export.json을 읽는다(영향 범위 계산용). 읽을 수 없는 파일은 undefined다.
 * @returns 컴포넌트 폴더 이름 → export.json
 */
function readManifests(): Map<string, unknown> {
  const componentsDir = path.join(figmaDir, FIGMA_COMPONENTS_FOLDER);
  const manifests = new Map<string, unknown>();
  if (!existsSync(componentsDir)) {
    return manifests;
  }
  for (const component of readdirSync(componentsDir).sort()) {
    const file = path.join(componentsDir, component, COMPONENT_MANIFEST_FILE);
    if (existsSync(file)) {
      manifests.set(component, parseJson(readFileSync(file, 'utf8')));
    }
  }
  return manifests;
}

/**
 * 결과 요약을 쓴다.
 * @param summary 결과 요약
 */
function writeSummary(summary: ParitySummary): void {
  writeJson(SUMMARY_FILE, summary);
}

/**
 * parity-results/에 JSON 파일을 쓴다.
 * @param name 파일 이름
 * @param value 값
 */
function writeJson(name: string, value: unknown): void {
  mkdirSync(parityResultsDir, { recursive: true });
  writeFileSync(path.join(parityResultsDir, name), `${JSON.stringify(value, null, 2)}\n`);
}

/**
 * JSON을 읽는다.
 * @param text JSON 글자
 * @returns 파싱한 값. 읽을 수 없으면 undefined
 */
function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

/**
 * git 명령을 실행한다.
 * @param args 인자
 * @returns 표준 출력
 */
function git(args: readonly string[]): string {
  return execFileSync('git', args, {
    cwd: packageRoot,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
}

/**
 * 커밋의 파일 내용을 읽는다.
 * @param commit 커밋
 * @param file 저장소 기준 경로
 * @returns 내용. 그 커밋에 파일이 없으면 undefined
 */
function gitShow(commit: string, file: string): string | undefined {
  try {
    return execFileSync('git', ['show', `${commit}:${file}`], {
      cwd: packageRoot,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    return undefined;
  }
}

/**
 * git 참조가 있는지 본다.
 * @param ref 참조
 * @returns 있으면 true
 */
function hasRef(ref: string): boolean {
  try {
    git(['rev-parse', '--verify', '--quiet', ref]);
    return true;
  } catch {
    return false;
  }
}
