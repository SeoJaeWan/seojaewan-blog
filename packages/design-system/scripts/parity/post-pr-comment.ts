import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { parityResultsDir } from '../package-paths.ts';
import type { ParitySummary } from './parity-summary.ts';
import { SUMMARY_FILE } from './parity-summary.ts';
import { markerIndex, renderComments } from './pr-comment.ts';

// CI에서 실행한다:
//   node scripts/parity/post-pr-comment.ts --repository <owner/repo> --server <https://github.com> --run-id <id> --pr <번호>
// gh CLI가 GH_TOKEN으로 GitHub API를 부르고, git push도 gh가 설정한 자격 증명(gh auth setup-git)을 쓴다.
// 댓글에 쓰는 이미지는 orphan 브랜치 parity-report/pr-<번호>에 올리고(매번 덮어씀), 댓글은 숨은 표시로 찾아 고친다.

/** 이미지를 올리는 브랜치 이름의 앞부분 */
export const REPORT_BRANCH_PREFIX = 'parity-report/pr-';

const env = readArgs(process.argv.slice(2));
main();

/**
 * 결과 요약으로 PR 댓글을 만들거나 고치고, 쓰지 않게 된 댓글은 지운다.
 * @codocs [[피그마 일치 검사:CI 비교]]
 */
function main(): void {
  const summaryPath = path.join(parityResultsDir, SUMMARY_FILE);
  if (!existsSync(summaryPath)) {
    console.log('[parity] summary.json이 없어 댓글을 남기지 않는다.');
    return;
  }
  const summary = parseSummary(readFileSync(summaryPath, 'utf8'));
  const branch = `${REPORT_BRANCH_PREFIX}${env.pr}`;
  const runUrl = `${env.server}/${env.repository}/actions/runs/${env.runId}`;
  const { bodies, images } = renderComments(summary, {
    runUrl,
    imageUrl: (file) =>
      `${env.server}/${env.repository}/blob/${branch}/${file.split('/').map(encodeURIComponent).join('/')}?raw=true`,
  });

  const existing = listComments();
  if (summary.total === 0 && existing.length === 0) {
    console.log('[parity] 비교한 변형이 없고 이전 댓글도 없어 댓글을 남기지 않는다.');
    return;
  }
  if (images.length > 0) {
    pushImages(branch, images);
  }
  for (const [index, body] of bodies.entries()) {
    const previous = existing.find((comment) => comment.index === index + 1);
    if (previous === undefined) {
      gh(['api', `repos/${env.repository}/issues/${env.pr}/comments`, '-f', `body=${body}`]);
    } else {
      gh([
        'api',
        '-X',
        'PATCH',
        `repos/${env.repository}/issues/comments/${previous.id}`,
        '-f',
        `body=${body}`,
      ]);
    }
  }
  for (const comment of existing.filter((item) => item.index > bodies.length)) {
    gh(['api', '-X', 'DELETE', `repos/${env.repository}/issues/comments/${comment.id}`]);
  }
  console.log(`[parity] PR 댓글 ${bodies.length}개를 남겼다(이미지 ${images.length}개).`);
}

/**
 * 이 검사가 남긴 PR 댓글을 찾는다.
 * @returns 댓글 ID와 순서
 */
function listComments(): { id: number; index: number }[] {
  const output = gh([
    'api',
    '--paginate',
    `repos/${env.repository}/issues/${env.pr}/comments`,
    '--jq',
    '.[] | {id, body} | @json',
  ]);
  return output.split('\n').filter(Boolean).flatMap(parseCommentLine);
}

/**
 * gh가 출력한 댓글 한 줄(JSON)에서 이 검사의 댓글이면 ID와 순서를 꺼낸다.
 * @param line `{ id, body }` JSON
 * @returns 이 검사의 댓글이면 ID와 순서 하나를 담은 목록, 아니면 빈 목록
 */
function parseCommentLine(line: string): { id: number; index: number }[] {
  const comment: unknown = JSON.parse(line);
  if (typeof comment !== 'object' || comment === null) {
    return [];
  }
  const id: unknown = Reflect.get(comment, 'id');
  const body: unknown = Reflect.get(comment, 'body');
  const index = typeof body === 'string' ? markerIndex(body) : undefined;
  return typeof id === 'number' && index !== undefined ? [{ id, index }] : [];
}

/**
 * 댓글에 쓰는 이미지만 담은 orphan 커밋을 만들어 보고 브랜치에 강제로 올린다.
 * @param branch 보고 브랜치
 * @param images parity-results 기준 이미지 경로
 */
function pushImages(branch: string, images: readonly string[]): void {
  const dir = mkdtempSync(path.join(tmpdir(), 'parity-report-'));
  try {
    for (const image of images) {
      const target = path.join(dir, image);
      mkdirSync(path.dirname(target), { recursive: true });
      cpSync(path.join(parityResultsDir, image), target);
    }
    /**
     * 보고 폴더에서 git을 실행한다.
     * @param args git 인자
     */
    function git(args: string[]): void {
      execFileSync('git', args, { cwd: dir, stdio: 'inherit' });
    }
    git(['init', '--quiet', '--initial-branch', 'report']);
    git(['add', '.']);
    git([
      '-c',
      'user.name=github-actions[bot]',
      '-c',
      'user.email=41898282+github-actions[bot]@users.noreply.github.com',
      'commit',
      '--quiet',
      '-m',
      `chore: figma parity report for #${env.pr}`,
    ]);
    const remote = `${env.server}/${env.repository}.git`;
    git(['push', '--quiet', '--force', remote, `report:refs/heads/${branch}`]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * gh CLI를 실행한다.
 * @param args gh 인자
 * @returns 표준 출력
 */
function gh(args: readonly string[]): string {
  return execFileSync('gh', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });
}

/**
 * summary.json을 읽는다.
 * @param text 파일 내용
 * @returns 결과 요약
 */
function parseSummary(text: string): ParitySummary {
  const value: unknown = JSON.parse(text);
  if (!isSummary(value)) {
    throw new Error('summary.json 모양이 다르다.');
  }
  return value;
}

/**
 * summary.json 모양인지 확인한다. run-parity.ts가 쓴 파일이라 최상위 필드만 확인한다.
 * @param value 파싱한 값
 * @returns 결과 요약이면 true
 */
function isSummary(value: unknown): value is ParitySummary {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof Reflect.get(value, 'total') === 'number' &&
    Array.isArray(Reflect.get(value, 'results')) &&
    Array.isArray(Reflect.get(value, 'fileErrors'))
  );
}

/**
 * 명령줄 인자를 읽는다.
 * @param argv 명령줄 인자
 * @returns 저장소, GitHub 주소, 실행 ID, PR 번호
 */
function readArgs(argv: readonly string[]): {
  repository: string;
  server: string;
  runId: string;
  pr: string;
} {
  /**
   * `--이름 값` 인자를 읽는다. 없으면 실패한다.
   * @param name 인자 이름
   * @returns 값
   */
  function read(name: string): string {
    const index = argv.indexOf(`--${name}`);
    const value = index >= 0 ? argv[index + 1] : undefined;
    if (value === undefined || value === '') {
      throw new Error(`--${name} 인자가 없다.`);
    }
    return value;
  }
  return {
    repository: read('repository'),
    server: read('server'),
    runId: read('run-id'),
    pr: read('pr'),
  };
}
