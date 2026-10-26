import { execFileSync } from 'node:child_process';

import { markerIndex } from './pr-comment.ts';

// 숨은 표시로 찾은 PR 댓글을 만들거나 고치고, 쓰지 않게 된 댓글은 지운다. 캡처 표 댓글(post-pr-comment.ts)과
// 모션 검사 댓글(motion-post-comment.ts)이 함께 쓴다. gh CLI가 GH_TOKEN으로 GitHub API를 부른다.

/** 댓글을 남기는 명령의 인자 */
export type CommentArgs = {
  /** `owner/repo` */
  repository: string;
  /** `https://github.com` */
  server: string;
  /** Actions 실행 ID */
  runId: string;
  /** PR 번호 */
  pr: string;
};

/**
 * 댓글 본문을 PR에 남긴다. 같은 숨은 표시·순서의 댓글이 있으면 고치고(새로 달지 않는다), 남는 댓글은 지운다.
 * @codocs [[피그마 연동:CI]]
 * @param args 저장소와 PR 번호
 * @param bodies 댓글 본문(숨은 표시로 시작한다)
 * @param name 숨은 표시 이름
 */
export function upsertComments(args: CommentArgs, bodies: readonly string[], name: string): void {
  const existing = listComments(args, name);
  for (const [index, body] of bodies.entries()) {
    const previous = existing.find((comment) => comment.index === index + 1);
    if (previous === undefined) {
      gh(['api', `repos/${args.repository}/issues/${args.pr}/comments`, '-f', `body=${body}`]);
    } else {
      gh([
        'api',
        '-X',
        'PATCH',
        `repos/${args.repository}/issues/comments/${String(previous.id)}`,
        '-f',
        `body=${body}`,
      ]);
    }
  }
  for (const comment of existing.filter((item) => item.index > bodies.length)) {
    gh(['api', '-X', 'DELETE', `repos/${args.repository}/issues/comments/${String(comment.id)}`]);
  }
}

/**
 * 이 숨은 표시를 단 PR 댓글을 찾는다.
 * @param args 저장소와 PR 번호
 * @param name 숨은 표시 이름
 * @returns 댓글 ID와 순서
 */
function listComments(args: CommentArgs, name: string): { id: number; index: number }[] {
  const output = gh([
    'api',
    '--paginate',
    `repos/${args.repository}/issues/${args.pr}/comments`,
    '--jq',
    '.[] | {id, body} | @json',
  ]);
  return output
    .split('\n')
    .filter(Boolean)
    .flatMap((line) => parseCommentLine(line, name));
}

/**
 * gh가 출력한 댓글 한 줄(JSON)에서 이 숨은 표시의 댓글이면 ID와 순서를 꺼낸다.
 * @param line `{ id, body }` JSON
 * @param name 숨은 표시 이름
 * @returns 이 숨은 표시의 댓글이면 ID와 순서 하나를 담은 목록, 아니면 빈 목록
 */
function parseCommentLine(line: string, name: string): { id: number; index: number }[] {
  const comment: unknown = JSON.parse(line);
  if (typeof comment !== 'object' || comment === null) {
    return [];
  }
  const id: unknown = Reflect.get(comment, 'id');
  const body: unknown = Reflect.get(comment, 'body');
  const index = typeof body === 'string' ? markerIndex(body, name) : undefined;
  return typeof id === 'number' && index !== undefined ? [{ id, index }] : [];
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
 * 명령줄 인자를 읽는다.
 * @param argv 명령줄 인자
 * @returns 저장소, GitHub 주소, 실행 ID, PR 번호
 */
export function readCommentArgs(argv: readonly string[]): CommentArgs {
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
