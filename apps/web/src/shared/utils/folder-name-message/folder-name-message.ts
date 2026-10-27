import type { FolderNameError } from '@/shared/utils/workspace-rules/workspace-rules';

// 폴더 이름이 맞지 않을 때 말풍선에 보여 줄 이유다. Windows 11 한국어 안내 문구를 따르고,
// Windows가 말풍선 대신 다른 방법(되돌리기, 대화 상자)으로 알리는 경우는 같은 말투로 이유를 적었다.
const folderNameErrorMessages = {
  empty: '폴더 이름을 입력하세요.',
  'too-long': '폴더 이름은 255자보다 길 수 없습니다.',
  'invalid-character': '파일 이름에는 다음 문자를 사용할 수 없습니다: \\ / : * ? " < > |',
  'reserved-name': '지정한 장치 이름이 잘못되었습니다.',
  'trailing-space-or-dot': '이름 끝에는 공백이나 마침표를 사용할 수 없습니다.',
  duplicate: '이 위치에 같은 이름의 폴더가 이미 있습니다.',
} as const satisfies Record<FolderNameError, string>;

/**
 * 폴더 이름이 맞지 않는 이유를 말풍선 문구로 바꾼다. 바탕화면·탐색기의 이름 바꾸기가 쓴다.
 * @codocs [[작업 공간:폴더 이름]]
 * @param reason 이유
 * @returns 말풍선 문구
 */
export function getFolderNameErrorMessage(reason: FolderNameError): string {
  return folderNameErrorMessages[reason];
}

/**
 * 이름 바꾸기를 거부한 이유가 폴더 이름 규칙 때문인지 본다. 그렇지 않은 이유(없는 폴더 등)는 말풍선 없이 이름 바꾸기를 끝낸다.
 * @param reason 거부 이유
 * @returns 폴더 이름 규칙 때문이면 true
 */
export function isFolderNameError(reason: string): reason is FolderNameError {
  return Object.hasOwn(folderNameErrorMessages, reason);
}
