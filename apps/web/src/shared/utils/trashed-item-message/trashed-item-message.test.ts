import { describe, expect, it } from 'vitest';

import { getTrashedItemMessage } from './trashed-item-message';

// @codocs [[Chrome:휴지통에 있는 글]]
describe('Chrome:휴지통에 있는 글', () => {
  it('글은 제목 "휴지통에 있는 글"과 복원·취소 버튼이다', () => {
    expect(getTrashedItemMessage('post')).toEqual({
      buttons: 'two',
      title: '휴지통에 있는 글',
      message: '이 글은 휴지통에 있어요. 복원하고 열까요?',
      primaryLabel: '복원',
      secondaryLabel: '취소',
    });
  });
});

// @codocs [[파일 탐색기:주소창 편집]]
describe('파일 탐색기:주소창 편집', () => {
  it('폴더·외부 링크는 같은 상자에서 종류 이름만 바꾼다', () => {
    expect(getTrashedItemMessage('folder')).toMatchObject({
      title: '휴지통에 있는 폴더',
      message: '이 폴더는 휴지통에 있어요. 복원하고 열까요?',
    });
    expect(getTrashedItemMessage('link')).toMatchObject({
      title: '휴지통에 있는 링크',
      message: '이 링크는 휴지통에 있어요. 복원하고 열까요?',
    });
  });
});
