import { REPO_NAME, REPO_OWNER } from './plugin-config';

// GitHub REST API 호출. 피그마 샌드박스의 fetch를 쓴다(manifest의 allowedDomains에 api.github.com).
// 토큰은 요청 헤더에만 넣고 로그나 오류 메시지에 남기지 않는다.

const API_ROOT = 'https://api.github.com';
const REPO_PATH = `/repos/${REPO_OWNER}/${REPO_NAME}`;

/** 트리에 넣을 파일 변경. sha가 null이면 파일을 지운다. */
export type TreeEntry = { path: string; sha: string | null } | { path: string; content: string };

/**
 * 브랜치 끝 커밋과 그 트리의 SHA를 가져온다.
 * @param token GitHub 토큰
 * @param branch 브랜치 이름
 * @returns 커밋 SHA와 트리 SHA
 */
export async function getBranchHead(
  token: string,
  branch: string,
): Promise<{ commitSha: string; treeSha: string }> {
  const ref = await request(token, 'GET', `${REPO_PATH}/git/ref/heads/${branch}`);
  const commitSha = readString(ref, ['object', 'sha']);
  const commit = await request(token, 'GET', `${REPO_PATH}/git/commits/${commitSha}`);
  return { commitSha, treeSha: readString(commit, ['tree', 'sha']) };
}

/**
 * 커밋 시점의 파일 내용을 문자열로 가져온다.
 * @param token GitHub 토큰
 * @param path 저장소 경로
 * @param ref 커밋 SHA나 브랜치
 * @returns 파일 내용, 파일이 없으면 null
 */
export async function getFileText(
  token: string,
  path: string,
  ref: string,
): Promise<string | null> {
  const response = await fetch(`${API_ROOT}${REPO_PATH}/contents/${path}?ref=${ref}`, {
    method: 'GET',
    headers: { ...headers(token), Accept: 'application/vnd.github.raw+json' },
  });
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`GitHub ${path} 읽기 실패 (${response.status} ${response.statusText})`);
  }
  return response.text();
}

/**
 * base64 내용으로 blob을 만든다.
 * @param token GitHub 토큰
 * @param base64 파일 내용(base64)
 * @returns blob SHA
 */
export async function createBlob(token: string, base64: string): Promise<string> {
  const blob = await request(token, 'POST', `${REPO_PATH}/git/blobs`, {
    content: base64,
    encoding: 'base64',
  });
  return readString(blob, ['sha']);
}

/**
 * 기준 트리에 파일 변경을 얹은 새 트리를 만든다.
 * @param token GitHub 토큰
 * @param baseTree 기준 트리 SHA
 * @param entries 파일 변경
 * @returns 새 트리 SHA
 */
export async function createTree(
  token: string,
  baseTree: string,
  entries: readonly TreeEntry[],
): Promise<string> {
  const tree = await request(token, 'POST', `${REPO_PATH}/git/trees`, {
    base_tree: baseTree,
    tree: entries.map((entry) => ({ ...entry, mode: '100644', type: 'blob' })),
  });
  return readString(tree, ['sha']);
}

/**
 * 커밋을 만든다.
 * @param token GitHub 토큰
 * @param message 커밋 메시지(제목과 본문)
 * @param tree 트리 SHA
 * @param parent 부모 커밋 SHA
 * @returns 새 커밋 SHA
 */
export async function createCommit(
  token: string,
  message: string,
  tree: string,
  parent: string,
): Promise<string> {
  const commit = await request(token, 'POST', `${REPO_PATH}/git/commits`, {
    message,
    tree,
    parents: [parent],
  });
  return readString(commit, ['sha']);
}

/**
 * 커밋을 가리키는 새 브랜치를 만든다.
 * @param token GitHub 토큰
 * @param branch 브랜치 이름
 * @param sha 커밋 SHA
 */
export async function createBranch(token: string, branch: string, sha: string): Promise<void> {
  await request(token, 'POST', `${REPO_PATH}/git/refs`, { ref: `refs/heads/${branch}`, sha });
}

/**
 * PR을 연다.
 * @param token GitHub 토큰
 * @param pullRequest 제목, 본문, 머리 브랜치, 기준 브랜치
 * @param pullRequest.title PR 제목
 * @param pullRequest.body PR 본문
 * @param pullRequest.head 머리 브랜치
 * @param pullRequest.base 기준 브랜치
 * @returns PR 주소
 */
export async function createPullRequest(
  token: string,
  pullRequest: { title: string; body: string; head: string; base: string },
): Promise<string> {
  const created = await request(token, 'POST', `${REPO_PATH}/pulls`, pullRequest);
  return readString(created, ['html_url']);
}

/**
 * GitHub API를 호출하고 JSON 응답을 돌려준다. 실패하면 상태 코드와 GitHub 메시지로 오류를 낸다.
 * @param token GitHub 토큰
 * @param method HTTP 메서드
 * @param path API 경로
 * @param body 요청 본문
 * @returns 응답 JSON
 */
async function request(
  token: string,
  method: 'GET' | 'POST',
  path: string,
  body?: object,
): Promise<unknown> {
  const response = await fetch(`${API_ROOT}${path}`, {
    method,
    headers: { ...headers(token), 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  const json: unknown = text === '' ? null : JSON.parse(text);
  if (!response.ok) {
    const message = readOptionalString(json, ['message']) ?? response.statusText;
    throw new Error(`GitHub ${method} ${path} 실패 (${response.status}): ${message}`);
  }
  return json;
}

/**
 * 공통 요청 헤더를 만든다.
 * @param token GitHub 토큰
 * @returns 요청 헤더
 */
function headers(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

/**
 * 응답 JSON에서 문자열 필드를 읽는다. 없으면 오류다.
 * @param value 응답 JSON
 * @param path 필드 경로
 * @returns 문자열 값
 */
function readString(value: unknown, path: readonly string[]): string {
  const found = readOptionalString(value, path);
  if (found === null) {
    throw new Error(`GitHub 응답에 ${path.join('.')}가 없다.`);
  }
  return found;
}

/**
 * 응답 JSON에서 문자열 필드를 읽는다.
 * @param value 응답 JSON
 * @param path 필드 경로
 * @returns 문자열 값, 없으면 null
 */
function readOptionalString(value: unknown, path: readonly string[]): string | null {
  let current = value;
  for (const key of path) {
    if (current === null || typeof current !== 'object' || !(key in current)) {
      return null;
    }
    const next: unknown = Reflect.get(current, key);
    current = next;
  }
  return typeof current === 'string' ? current : null;
}
