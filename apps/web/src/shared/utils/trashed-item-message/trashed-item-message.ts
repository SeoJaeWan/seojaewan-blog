import type { PlacedItem } from '@/shared/utils/workspace-rules/workspace-rules';

// 종류마다 바꾸는 이름이다. 제목과 본문에서 이 이름만 바뀐다.
const trashedItemNames = {
  post: '글',
  folder: '폴더',
  link: '링크',
} as const satisfies Record<PlacedItem['kind'], string>;

/**
 * 휴지통에 있는 항목을 주소로 열 때 복원할지 묻는 메시지 상자의 글자와 버튼을 만든다. 글은 Chrome 주소창과 탐색기 주소창이 함께 쓰고,
 * 폴더·외부 링크는 탐색기 주소창이 쓴다. 같은 상자에서 종류 이름만 바꾼다(예: "휴지통에 있는 폴더", "이 폴더는 휴지통에 있어요. 복원하고 열까요?").
 * @codocs [[Chrome:휴지통에 있는 글]]
 * @codocs [[파일 탐색기:주소창 편집]]
 * @param kind 항목 종류
 * @returns 메시지 상자 속성
 */
export function getTrashedItemMessage(kind: PlacedItem['kind']): {
  buttons: 'two';
  title: string;
  message: string;
  primaryLabel: string;
  secondaryLabel: string;
} {
  const name = trashedItemNames[kind];
  return {
    buttons: 'two',
    title: `휴지통에 있는 ${name}`,
    message: `이 ${name}${kind === 'post' ? '은' : '는'} 휴지통에 있어요. 복원하고 열까요?`,
    primaryLabel: '복원',
    secondaryLabel: '취소',
  };
}
