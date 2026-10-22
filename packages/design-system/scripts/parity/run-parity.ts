import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { packageRoot, parityResultsDir } from '../package-paths.ts';
import { componentDependents, selectAffectedComponents } from './affected-components.ts';
import { RESULT_FILE, SELECTION_FILE } from './parity-config.ts';
import { loadParityPlan, type PlanItem } from './parity-plan.ts';
import { type ParitySummary, SUMMARY_FILE, type VariantResult } from './parity-summary.ts';

// 사용법: node scripts/parity/run-parity.ts [--affected] [--base <ref>] [--no-build] [--component <name>]...
// 비교할 컴포넌트를 고르고 Storybook을 빌드한 뒤 Playwright Test(playwright.config.ts)로 비교한다.
// 결과는 parity-results/summary.json에 모으고, CI는 이 파일로 PR 댓글을 남긴다.
const AFFECTED_FLAG = '--affected';
const BASE_FLAG = '--base';
const NO_BUILD_FLAG = '--no-build';
const COMPONENT_FLAG = '--component';
const DEFAULT_BASES = ['origin/main', 'main'] as const;

main();

/**
 * 피그마 일치 검사를 실행한다.
 * @codocs [[피그마 일치 검사:CI 비교]]
 */
function main(): void {
  const argv = process.argv.slice(2);
  rmSync(parityResultsDir, { recursive: true, force: true });
  const fullPlan = loadParityPlan();
  if (fullPlan.items.length === 0) {
    console.log('[parity] figma/에 비교할 변형이 없어 건너뛴다.');
    writeSummary({ total: 0, failed: 0, results: [], fileErrors: fullPlan.fileErrors });
    return;
  }
  const components = selectComponents(
    [...new Set(fullPlan.items.map((item) => item.component))],
    argv,
  );
  if (components.length === 0) {
    console.log('[parity] 비교할 컴포넌트가 없다.');
    writeSummary({ total: 0, failed: 0, results: [], fileErrors: fullPlan.fileErrors });
    return;
  }
  if (!argv.includes(NO_BUILD_FLAG)) {
    run('pnpm run build-storybook --quiet', 'Storybook 빌드');
  }
  const selectionFile = path.join(parityResultsDir, SELECTION_FILE);
  mkdirSync(parityResultsDir, { recursive: true });
  writeFileSync(selectionFile, `${JSON.stringify(components)}\n`);
  const status = run(
    'pnpm exec playwright test -c scripts/parity/playwright.config.ts parity.spec.ts',
    undefined,
  );
  rmSync(selectionFile, { force: true });
  const plan = loadParityPlan(components);
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
  const baseIndex = argv.indexOf(BASE_FLAG);
  const base = baseIndex >= 0 ? argv[baseIndex + 1] : DEFAULT_BASES.find(hasRef);
  if (base === undefined) {
    throw new Error(`비교 기준 브랜치를 찾지 못했다. ${BASE_FLAG} <ref>로 정한다.`);
  }
  const mergeBase = git(['merge-base', base, 'HEAD']).trim();
  const packagePrefix = git(['rev-parse', '--show-prefix']).trim();
  const changedFiles = [
    ...git(['diff', '--name-only', '-z', mergeBase]).split('\0'),
    ...git(['ls-files', '--others', '--exclude-standard', '--full-name', '-z']).split('\0'),
  ].filter(Boolean);
  const selection = selectAffectedComponents(
    changedFiles,
    packagePrefix,
    componentDependents(readComponentSources()),
  );
  if (selection.all) {
    console.log(`[parity] ${selection.reason}이 바뀌어 모든 컴포넌트를 비교한다.`);
    return selected;
  }
  console.log(
    `[parity] ${base} 대비 영향받는 컴포넌트: ${[...selection.components].join(', ') || '없음'}`,
  );
  return selected.filter((component) => selection.components.has(component));
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
      images: [],
    };
  }
  return JSON.parse(readFileSync(file, 'utf8')) as VariantResult;
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
 * 결과 요약을 쓴다.
 * @param summary 결과 요약
 */
function writeSummary(summary: ParitySummary): void {
  mkdirSync(parityResultsDir, { recursive: true });
  writeFileSync(path.join(parityResultsDir, SUMMARY_FILE), `${JSON.stringify(summary, null, 2)}\n`);
}

/**
 * git 명령을 실행한다.
 * @param args 인자
 * @returns 표준 출력
 */
function git(args: readonly string[]): string {
  return execFileSync('git', args, { cwd: packageRoot, encoding: 'utf8' });
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
