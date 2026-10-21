/** 커밋·PR에 적을 변경 내용 */
export type ExportSummary = {
  /** 이미지가 바뀐 컴포넌트 이름(피그마 이름) */
  changedComponents: readonly string[];
  /** 올린 이미지 수 */
  uploadCount: number;
  /** 지운 이미지 수 */
  deletionCount: number;
  /** tokens.json이 바뀌었는지 */
  hasTokenChange: boolean;
};

/**
 * 내보내기 브랜치 이름을 만든다. 예: `figma/export-20261021-093005`
 * @param date 내보낸 시각(로컬 시간으로 적는다)
 * @returns 브랜치 이름
 */
export function exportBranchName(date: Date): string {
  const day = [date.getFullYear(), date.getMonth() + 1, date.getDate()].map(pad).join('');
  const time = [date.getHours(), date.getMinutes(), date.getSeconds()].map(pad).join('');
  return `figma/export-${day}-${time}`;
}

/**
 * Conventional Commits 형식의 영어 커밋 제목을 만든다. PR 제목도 같다.
 * @codocs [[Git 작업 규칙:커밋]]
 * @param summary 변경 내용
 * @returns 커밋 제목
 */
export function commitSubject(summary: ExportSummary): string {
  const hasImageChange = summary.uploadCount + summary.deletionCount > 0;
  if (hasImageChange && summary.hasTokenChange) {
    return 'chore(figma): export components and tokens';
  }
  return hasImageChange ? 'chore(figma): export components' : 'chore(figma): export tokens';
}

/**
 * 바뀐 컴포넌트와 토큰 변경 여부를 적은 한국어 커밋 본문을 만든다.
 * @codocs [[Git 작업 규칙:커밋]]
 * @param summary 변경 내용
 * @returns 커밋 본문
 */
export function commitBody(summary: ExportSummary): string {
  return ['피그마에서 내보낸 기준 이미지와 토큰을 갱신한다.', '', ...changeLines(summary)].join(
    '\n',
  );
}

/**
 * 한국어 PR 본문을 만든다.
 * @param summary 변경 내용
 * @returns PR 본문(Markdown)
 */
export function pullRequestBody(summary: ExportSummary): string {
  return [
    '## 변경',
    '',
    ...changeLines(summary),
    '',
    '## 확인',
    '',
    '- 이 PR의 피그마 일치 검사에서 실패한 컴포넌트가 구현할 목록이다. 같은 PR에서 코드를 고쳐 통과시킨 뒤 병합한다.',
    '- 토큰이 바뀌었으면 같은 PR에서 `src/tokens.css`도 다시 생성한다.',
  ].join('\n');
}

/**
 * 커밋 본문과 PR 본문에 함께 쓰는 변경 목록을 만든다.
 * @param summary 변경 내용
 * @returns 변경 목록 줄
 */
function changeLines(summary: ExportSummary): string[] {
  const components =
    summary.changedComponents.length === 0
      ? ['- 바뀐 컴포넌트 없음']
      : [
          `- 바뀐 컴포넌트 ${summary.changedComponents.length}개 (이미지 ${summary.uploadCount}개 갱신, ${summary.deletionCount}개 삭제)`,
          ...summary.changedComponents.map((name) => `  - ${name}`),
        ];
  return [...components, `- 토큰: ${summary.hasTokenChange ? '바뀜' : '바뀌지 않음'}`];
}

/**
 * 숫자를 두 자리 이상으로 맞춘다.
 * @param value 숫자
 * @returns 0을 채운 문자열
 */
function pad(value: number): string {
  return String(value).padStart(2, '0');
}
