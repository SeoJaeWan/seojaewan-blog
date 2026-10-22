import { describe, expect, it } from 'vitest';

import {
  commitBody,
  commitSubject,
  exportBranchName,
  type ExportSummary,
  pullRequestBody,
} from './pull-request-text';

const summary: ExportSummary = {
  changedComponents: ['Button', 'Tooltip'],
  uploadCount: 3,
  deletionCount: 1,
  assetUploadCount: 0,
  hasTokenChange: true,
};

// @codocs [[Git 작업 규칙:커밋]]
describe('커밋 제목은 영어 Conventional Commits, 본문은 한국어다', () => {
  it('바뀐 내용에 따라 영어 제목을 고른다', () => {
    expect(commitSubject(summary)).toBe('chore(figma): export components and tokens');
    expect(commitSubject({ ...summary, hasTokenChange: false })).toBe(
      'chore(figma): export components',
    );
    expect(
      commitSubject({ ...summary, changedComponents: [], uploadCount: 0, deletionCount: 0 }),
    ).toBe('chore(figma): export tokens');
    expect(
      commitSubject({ ...summary, uploadCount: 0, deletionCount: 0, hasTokenChange: false }),
    ).toBe('chore(figma): export components');
  });

  it('본문에 바뀐 컴포넌트와 토큰 변경 여부를 적는다', () => {
    const body = commitBody(summary);
    expect(body).toContain('  - Button\n  - Tooltip');
    expect(body).toContain('- 토큰: 바뀜');
    expect(commitBody({ ...summary, changedComponents: [], hasTokenChange: false })).toContain(
      '- 바뀐 컴포넌트 없음\n- 토큰: 바뀌지 않음',
    );
  });

  it('벡터 SVG가 바뀌었을 때만 그 줄을 적는다', () => {
    expect(commitBody(summary)).not.toContain('벡터 SVG');
    expect(commitBody({ ...summary, assetUploadCount: 2 })).toContain('- 자산 파일 2개 갱신');
  });

  it('PR 본문도 같은 변경 목록을 담는다', () => {
    expect(pullRequestBody(summary)).toContain(
      '- 바뀐 컴포넌트 2개 (이미지 3개 갱신, 파일 1개 삭제)',
    );
  });
});

// @codocs [[Git 작업 규칙:브랜치]]
describe('브랜치는 종류/짧은-설명 형식이고 종류는 커밋 종류와 같은 단어다', () => {
  it('내보내기 브랜치 이름은 chore/figma-export-yyyyMMdd-HHmmss다', () => {
    expect(exportBranchName(new Date(2026, 9, 21, 9, 5, 7))).toBe(
      'chore/figma-export-20261021-090507',
    );
  });
});
