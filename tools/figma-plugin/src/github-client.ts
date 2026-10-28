import { REPO_NAME, REPO_OWNER } from './plugin-config';
import { treeChunks } from './tree-changes';

// GitHub REST API 호출. 피그마 샌드박스의 fetch를 쓴다(manifest의 allowedDomains에 api.github.com).
// 토큰은 요청 헤더에만 넣고 로그나 오류 메시지에 남기지 않는다.

const API_ROOT = 'https://api.github.com';
const REPO_PATH = `/repos/${REPO_OWNER}/${REPO_NAME}`;

/** 트리에 넣을 파일 변경. 내용은 미리 올린 blob이고, sha가 null이면 파일을 지운다. */
export type TreeEntry = { path: string; sha: string | null };

/**
 * 저장소를 읽어 토큰으로 연결되는지와 쓰기 권한(`permissions.push`)을 확인한다.
 * 실패하면 상태 코드에 맞춰 고칠 방법이 보이는 이유로 오류를 낸다.
 * @codocs [[피그마 연동:플러그인 화면]]
 * @param token GitHub 토큰
 * @returns 저장소 이름(`owner/name`)과 쓰기 권한
 */
export async function readRepository(
  token: string,
): Promise<{ fullName: string; canPush: boolean }> {
  const response = await fetch(`${API_ROOT}${REPO_PATH}`, {
    method: 'GET',
    headers: headers(token),
  });
  if (response.status === 401) {
    throw new Error('토큰이 틀렸거나 만료됐다(401). 토큰을 새로 만들어 넣는다.');
  }
  if (response.status === 403 || response.status === 404) {
    throw new Error(
      `저장소 ${REPO_OWNER}/${REPO_NAME}를 읽을 수 없다(${String(response.status)}). 토큰의 저장소 접근에 이 저장소를 넣었는지 확인한다.`,
    );
  }
  if (!response.ok) {
    throw new Error(`저장소 읽기 실패 (${String(response.status)} ${response.statusText})`);
  }
  const json: unknown = await response.json();
  const permissions: unknown =
    json !== null && typeof json === 'object' ? Reflect.get(json, 'permissions') : null;
  const push: unknown =
    permissions !== null && typeof permissions === 'object'
      ? Reflect.get(permissions, 'push')
      : null;
  return {
    fullName: readOptionalString(json, ['full_name']) ?? `${REPO_OWNER}/${REPO_NAME}`,
    canPush: push === true,
  };
}

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
 * 커밋 시점의 파일 내용을 바이트로 가져온다.
 * @param token GitHub 토큰
 * @param path 저장소 경로
 * @param ref 커밋 SHA나 브랜치
 * @returns 파일 내용, 파일이 없으면 null
 */
export async function getFileBytes(
  token: string,
  path: string,
  ref: string,
): Promise<Uint8Array | null> {
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
  return new Uint8Array(await response.arrayBuffer());
}

/**
 * 트리 아래 파일 경로와 blob SHA를 가져온다(하위 폴더 포함).
 * @param token GitHub 토큰
 * @param treeSha 트리 SHA
 * @param prefixes 이 경로 가운데 하나로 시작하는 파일만 남긴다(예: `packages/design-system/figma/`)
 * @returns 저장소 루트 기준 파일 경로 → blob SHA
 */
export async function listTreeFiles(
  token: string,
  treeSha: string,
  prefixes: readonly string[],
): Promise<Map<string, string>> {
  const tree = await request(token, 'GET', `${REPO_PATH}/git/trees/${treeSha}?recursive=1`);
  if (tree === null || typeof tree !== 'object' || Reflect.get(tree, 'truncated') === true) {
    throw new Error('GitHub 트리 목록이 잘려 저장소 파일을 모두 읽지 못했다.');
  }
  const entries: unknown = Reflect.get(tree, 'tree');
  if (!Array.isArray(entries)) {
    throw new Error('GitHub 응답에 tree가 없다.');
  }
  const files = new Map<string, string>();
  for (const entry of entries) {
    const path = readOptionalString(entry, ['path']);
    const sha = readOptionalString(entry, ['sha']);
    if (
      path !== null &&
      sha !== null &&
      readOptionalString(entry, ['type']) === 'blob' &&
      prefixes.some((prefix) => path.startsWith(prefix))
    ) {
      files.set(path, sha);
    }
  }
  return files;
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
 * 기준 트리에 파일 변경을 얹은 새 트리를 만든다. 항목이 많으면 나눠서 앞 트리 위에 이어 만든다.
 * 한 번에 큰 트리를 보내면 GitHub가 422로 거절하기 때문이다. 커밋은 마지막 트리로 하나만 만든다.
 * @codocs [[피그마 연동:피그마 플러그인]]
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
  let tree = baseTree;
  for (const chunk of treeChunks(entries)) {
    const created = await request(token, 'POST', `${REPO_PATH}/git/trees`, {
      base_tree: tree,
      tree: chunk.map((entry) => ({ ...entry, mode: '100644', type: 'blob' })),
    });
    tree = readString(created, ['sha']);
  }
  return tree;
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
 * 기존 브랜치를 새 커밋으로 옮긴다. 빨리 감기(fast-forward)만 허용해, 그사이 브랜치에 다른 커밋이 올라왔으면 실패한다.
 * @param token GitHub 토큰
 * @param branch 브랜치 이름
 * @param sha 새 커밋 SHA. 브랜치 끝 커밋의 자식이어야 한다
 */
export async function updateBranch(token: string, branch: string, sha: string): Promise<void> {
  await request(token, 'PATCH', `${REPO_PATH}/git/refs/heads/${branch}`, { sha, force: false });
}

/** 열린 PR */
export type OpenPullRequest = { url: string; number: number };

/**
 * 브랜치에서 열린 PR을 찾는다.
 * @param token GitHub 토큰
 * @param branch 머리 브랜치 이름
 * @returns 열린 PR 주소와 번호, 없으면 null
 */
export async function findOpenPullRequest(
  token: string,
  branch: string,
): Promise<OpenPullRequest | null> {
  const head = encodeURIComponent(`${REPO_OWNER}:${branch}`);
  const pulls = await request(token, 'GET', `${REPO_PATH}/pulls?state=open&head=${head}`);
  const url = readOptionalString(pulls, ['0', 'html_url']);
  const number = readOptionalNumber(pulls, ['0', 'number']);
  return url === null || number === null ? null : { url, number };
}

/**
 * 브랜치가 있으면 끝 커밋 SHA를 가져온다.
 * @param token GitHub 토큰
 * @param branch 브랜치 이름
 * @returns 끝 커밋 SHA, 브랜치가 없으면 null
 */
export async function findBranchCommit(token: string, branch: string): Promise<string | null> {
  const response = await fetch(`${API_ROOT}${REPO_PATH}/git/ref/heads/${branch}`, {
    method: 'GET',
    headers: headers(token),
  });
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(
      `GitHub ${branch} 브랜치 읽기 실패 (${response.status} ${response.statusText})`,
    );
  }
  const ref: unknown = await response.json();
  return readString(ref, ['object', 'sha']);
}

/**
 * 열린 PR이 없는 기존 브랜치를 새 커밋으로 옮긴다. 빨리 감기가 아니어도 옮긴다(병합했거나 닫은 PR의 브랜치를 다시 쓸 때).
 * @param token GitHub 토큰
 * @param branch 브랜치 이름
 * @param sha 새 커밋 SHA
 */
export async function resetBranch(token: string, branch: string, sha: string): Promise<void> {
  await request(token, 'PATCH', `${REPO_PATH}/git/refs/heads/${branch}`, { sha, force: true });
}

/**
 * 열린 PR의 본문을 바꾼다.
 * @param token GitHub 토큰
 * @param number PR 번호
 * @param body 새 본문
 */
export async function updatePullRequestBody(
  token: string,
  number: number,
  body: string,
): Promise<void> {
  await request(token, 'PATCH', `${REPO_PATH}/pulls/${String(number)}`, { body });
}

/**
 * 폴더 안 파일 이름을 가져온다.
 * @param token GitHub 토큰
 * @param path 저장소 경로(폴더)
 * @param ref 브랜치나 커밋 SHA
 * @returns 파일 이름, 브랜치나 폴더가 없으면 null
 */
export async function listDirectory(
  token: string,
  path: string,
  ref: string,
): Promise<string[] | null> {
  const response = await fetch(`${API_ROOT}${REPO_PATH}/contents/${path}?ref=${ref}`, {
    method: 'GET',
    headers: headers(token),
  });
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`GitHub ${path} 목록 읽기 실패 (${response.status} ${response.statusText})`);
  }
  const entries: unknown = await response.json();
  if (!Array.isArray(entries)) {
    return null;
  }
  const names: string[] = [];
  for (const entry of entries) {
    const name = readOptionalString(entry, ['name']);
    if (name !== null && readOptionalString(entry, ['type']) === 'file') {
      names.push(name);
    }
  }
  return names;
}

/**
 * 커밋의 GitHub 웹 주소를 만든다.
 * @param sha 커밋 SHA
 * @returns 커밋 주소
 */
export function commitUrl(sha: string): string {
  return `https://github.com/${REPO_OWNER}/${REPO_NAME}/commit/${sha}`;
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
  method: 'GET' | 'POST' | 'PATCH',
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

/**
 * 응답 JSON에서 숫자 필드를 읽는다.
 * @param value 응답 JSON
 * @param path 필드 경로
 * @returns 숫자 값, 없으면 null
 */
function readOptionalNumber(value: unknown, path: readonly string[]): number | null {
  let current = value;
  for (const key of path) {
    if (current === null || typeof current !== 'object' || !(key in current)) {
      return null;
    }
    const next: unknown = Reflect.get(current, key);
    current = next;
  }
  return typeof current === 'number' ? current : null;
}
