import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { readCommentArgs, upsertComments } from './github-comments.ts';
import { defaultResultsDir } from './paths.ts';
import { COMMENT_MARKER, renderComments } from './pr-comment.ts';
import { CAPTURES_FILE, type CaptureSummary } from './results.ts';

// CI에서 실행한다:
//   node src/post-pr-comment.ts --repository <owner/repo> --server <https://github.com> --run-id <id> --pr <번호>
// 캡처 결과(captures.json)로 `피그마 | 코드 | 차이` 표를 PR 댓글로 남긴다.
// gh CLI가 GH_TOKEN으로 GitHub API를 부르고, git push도 gh가 설정한 자격 증명(gh auth setup-git)을 쓴다.
// 댓글에 쓰는 이미지는 이력 없는 브랜치 parity-report/pr-<번호>에 올리고(매번 덮어씀), 댓글은 숨은 표시로 찾아 고친다.

/** 이미지를 올리는 브랜치 이름의 앞부분 */
export const REPORT_BRANCH_PREFIX = 'parity-report/pr-';

const env = readCommentArgs(process.argv.slice(2));
const parityResultsDir = defaultResultsDir;
main();

/**
 * 캡처 결과로 PR 댓글을 만들거나 고치고, 쓰지 않게 된 댓글은 지운다.
 * @codocs [[피그마 연동:CI]]
 */
function main(): void {
  const capturesPath = path.join(parityResultsDir, CAPTURES_FILE);
  const captures: CaptureSummary = existsSync(capturesPath)
    ? (JSON.parse(readFileSync(capturesPath, 'utf8')) as CaptureSummary)
    : {
        rows: [],
        fileErrors: ['캡처 결과(captures.json)가 없다. 실행 결과에서 빌드나 캡처 단계를 확인한다'],
      };
  const branch = `${REPORT_BRANCH_PREFIX}${env.pr}`;
  const runUrl = `${env.server}/${env.repository}/actions/runs/${env.runId}`;
  const { bodies, images } = renderComments(captures, {
    runUrl,
    imageUrl: (file) =>
      `${env.server}/${env.repository}/blob/${branch}/${file.split('/').map(encodeURIComponent).join('/')}?raw=true`,
  });
  if (images.length > 0) {
    pushImages(branch, images);
  }
  upsertComments(env, bodies, COMMENT_MARKER);
  console.log(
    `[figma-parity] PR 댓글 ${String(bodies.length)}개를 남겼다(이미지 ${String(images.length)}개).`,
  );
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
      `chore: figma capture report for #${env.pr}`,
    ]);
    const remote = `${env.server}/${env.repository}.git`;
    git(['push', '--quiet', '--force', remote, `report:refs/heads/${branch}`]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
