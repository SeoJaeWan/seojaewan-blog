import type { ComponentProps, FocusEvent, KeyboardEvent, RefObject } from 'react';
import { useRef, useState } from 'react';

import type { MessageBoxDialog } from '@/shared/components/message-box-dialog/message-box-dialog';
import { DUPLICATE_FOLDER_NAME_MESSAGE } from '@/shared/components/message-box-duplicate-folder-name/message-box-duplicate-folder-name';
import { RESERVED_NAME_MESSAGE } from '@/shared/components/message-box-reserved-name/message-box-reserved-name';
import { useWorkspaceStore } from '@/shared/stores/workspace-store/workspace-store';
import {
  getFolderNameErrorMessage,
  isFolderNameError,
} from '@/shared/utils/folder-name-message/folder-name-message';
import {
  filterFolderNameInput,
  FOLDER_NAME_MAX_LENGTH,
  getFolderNameToCommit,
} from '@/shared/utils/workspace-rules/workspace-rules';

/** 이름을 바꾸는 중인 폴더 */
type RenameState = {
  /** 폴더 id */
  id: string;
  /** 입력 중인 이름 */
  value: string;
  /** 말풍선에 보일 이유. 없으면 null */
  error: string | null;
  /** 확정하다 막혀 띄운 메시지 상자. 없으면 null */
  messageBox: FolderNameMessageBox | null;
};

/** 폴더 이름을 확정할 때 띄우는 메시지 상자(예약 이름, 같은 이름의 폴더) */
type FolderNameMessageBox = 'reserved-name' | 'duplicate';

/** 입력이 바뀐 이벤트의 정보(Base UI Input `onValueChange`의 두 번째 인자) */
type ValueChangeDetails = {
  /** 입력 이벤트 */
  event: Event;
};

/** 이름 바꾸기 입력창(RenameField)에 넘길 속성 */
type RenameFieldProps = {
  /** 입력창 요소. 메시지 상자를 닫은 뒤 포커스를 돌려주는 데 쓴다 */
  ref: RefObject<HTMLInputElement | null>;
  /** 입력 중인 이름 */
  value: string;
  /** 입력이 바뀔 때 */
  onValueChange: (value: string, details: ValueChangeDetails) => void;
  /** Enter 확정, Esc 취소 */
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  /** 바깥을 누르면 확정 */
  onBlur: (event: FocusEvent<HTMLInputElement>) => void;
  /** 최대 길이(UTF-16 단위). 넘게는 입력되지 않는다 */
  maxLength: number;
  /** 접근성 이름 */
  'aria-label': string;
  /** 말풍선으로 이유를 보이는 중이면 true */
  'aria-invalid': boolean;
};

/** 메시지 상자 대화 상자(MessageBoxDialog)에 넘길 속성 */
type RenameMessageBoxProps = ComponentProps<typeof MessageBoxDialog>;

/** 이름 바꾸기 상태와 조작 */
type FolderRenameControls = {
  /** 이름을 바꾸는 중인 폴더 id. 아니면 null */
  renamingId: string | null;
  /** 말풍선 문구. 없으면 null */
  errorMessage: string | null;
  /** 폴더 이름 바꾸기를 시작한다 */
  startRename: (id: string, name: string) => void;
  /** 입력창에 넘길 속성 */
  renameFieldProps: RenameFieldProps;
  /** 예약 이름·같은 이름 메시지 상자(`MessageBoxDialog`)에 넘길 속성. 늘 그려 두고 `open`으로 띄운다 */
  messageBoxProps: RenameMessageBoxProps;
};

type UseFolderRenameOptions = {
  /** Enter·Esc로 이름 바꾸기를 끝냈을 때 부른다. 사라진 입력창 대신 그 폴더 항목에 키보드 포커스를 돌려주는 데 쓴다 */
  onKeyboardEnd?: (id: string) => void;
};

// 이름 바꾸기 입력창의 접근성 이름이다.
const RENAME_FIELD_LABEL = '새 이름';

// 확정을 막는 이유마다 띄울 메시지 상자의 글자와 버튼이다.
const messageBoxContents = {
  'reserved-name': RESERVED_NAME_MESSAGE,
  duplicate: DUPLICATE_FOLDER_NAME_MESSAGE,
} as const satisfies Record<FolderNameMessageBox, unknown>;

/**
 * 바탕화면·탐색기의 폴더 이름 바꾸기를 입력창에 잇는다. Windows 11 이름 바꾸기와 같게 한다.
 * - 쓸 수 없는 문자는 입력하는 순간 빼서 입력되지 않게 하고, 말풍선으로 쓸 수 없는 문자를 알린다. 255자를 넘게는 입력되지 않는다.
 * - Enter와 바깥 클릭(포커스를 잃음)은 확정, Esc는 취소다. 끝의 공백과 마침표는 잘라내고 확정하고, 비었거나 공백만 있으면 원래 이름으로 되돌린다.
 * - 예약 이름이거나 같은 위치에 같은 이름의 폴더가 있으면 메시지 상자를 띄우고, 닫으면 입력값을 그대로 둔 채 이름 바꾸기로 돌아간다.
 * - Enter·Esc로 끝내면 `onKeyboardEnd`로 알려 키보드 포커스를 항목에 돌려주게 한다. 바깥을 눌러 끝내면 누른 곳에 포커스를 둔다.
 * - 입력창 안의 키는 바깥(바탕화면의 Delete, 방향키, Ctrl + A 등)으로 넘기지 않는다.
 * @codocs [[작업 공간:폴더 이름]]
 * @codocs [[바탕화면:아이콘 조작]]
 * @param options 끝났을 때 부를 함수
 * @returns 이름 바꾸기 상태와 조작
 */
export function useFolderRename(options: UseFolderRenameOptions = {}): FolderRenameControls {
  const renameFolder = useWorkspaceStore((state) => state.renameFolder);
  const [rename, setRename] = useState<RenameState | null>(null);
  // 끝낸(확정·취소한) 뒤 입력창이 사라지며 오는 포커스 잃음으로 다시 확정하지 않게, 진행 중인 폴더 id를 바로 기억한다.
  const activeIdRef = useRef<string | null>(null);
  // 메시지 상자가 포커스를 가져가며 오는 포커스 잃음으로 다시 확정하지 않게, 메시지 상자가 열린 것을 바로 기억한다.
  const isMessageBoxOpenRef = useRef(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  /**
   * 이름 바꾸기를 시작한다.
   * @param id 폴더 id
   * @param name 지금 이름
   */
  function startRename(id: string, name: string): void {
    activeIdRef.current = id;
    isMessageBoxOpenRef.current = false;
    setRename({ id, value: name, error: null, messageBox: null });
  }

  /**
   * 입력한 이름으로 바꾼다. 비었으면 되돌리고, 막히면 메시지 상자(예약 이름, 같은 이름)나 말풍선으로 알리고 계속 입력하게 한다.
   * @param input 입력창. 말풍선으로 알리면 포커스를 돌려준다
   * @returns 이름 바꾸기를 끝냈으면 true
   */
  function commit(input: HTMLInputElement): boolean {
    if (rename === null || activeIdRef.current !== rename.id || isMessageBoxOpenRef.current) {
      return false;
    }
    const name = getFolderNameToCommit(rename.value);
    if (name === null) {
      end();
      return true;
    }
    const result = renameFolder(rename.id, name);
    if (result.ok || !isFolderNameError(result.reason)) {
      end();
      return true;
    }
    if (result.reason === 'reserved-name' || result.reason === 'duplicate') {
      isMessageBoxOpenRef.current = true;
      setRename({ ...rename, error: null, messageBox: result.reason });
      return false;
    }
    setRename({ ...rename, error: getFolderNameErrorMessage(result.reason) });
    // 바깥을 눌러 포커스를 잃은 경우에도 입력을 이어 가게, 그 클릭이 끝난 뒤 입력창에 포커스를 돌려준다.
    window.setTimeout(
      /** 입력창이 아직 있으면 포커스를 준다. */
      () => {
        if (input.isConnected) {
          input.focus();
        }
      },
    );
    return false;
  }

  /**
   * 입력이 바뀌면 쓸 수 없는 문자를 빼고 최대 길이까지만 남긴다. 뺐으면 말풍선으로 알리고 글자 자리(캐럿)를 지킨다.
   * @param value 입력창의 새 값
   * @param details 입력 이벤트
   * @param details.event 입력 이벤트
   */
  function handleValueChange(value: string, details: ValueChangeDetails): void {
    const filtered = filterFolderNameInput(value);
    const error = filtered.hasRemovedInvalidCharacter
      ? getFolderNameErrorMessage('invalid-character')
      : null;
    setRename((current) =>
      current === null ? current : { ...current, value: filtered.value, error },
    );
    const input = details.event.target;
    if (filtered.value !== value && input instanceof HTMLInputElement) {
      // 막은 문자만큼 글자 자리를 앞으로 당겨, 다시 그린 뒤에도 입력하던 자리에 둔다.
      const caret = filterFolderNameInput(value.slice(0, input.selectionStart ?? value.length))
        .value.length;
      window.setTimeout(
        /** 입력창이 아직 있으면 글자 자리를 옮긴다. */
        () => {
          if (input.isConnected) {
            input.setSelectionRange(caret, caret);
          }
        },
      );
    }
  }

  /**
   * Enter는 확정, Esc는 취소한다. 다른 키는 바깥으로 넘기지 않는다.
   * @param event 키 이벤트
   */
  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    event.stopPropagation();
    if (rename === null) {
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      if (commit(event.currentTarget)) {
        options.onKeyboardEnd?.(rename.id);
      }
    } else if (event.key === 'Escape') {
      event.preventDefault();
      end();
      options.onKeyboardEnd?.(rename.id);
    }
  }

  /** 이름 바꾸기를 끝낸다. */
  function end(): void {
    activeIdRef.current = null;
    isMessageBoxOpenRef.current = false;
    setRename(null);
  }

  /**
   * 바깥을 눌러 포커스를 잃으면 확정한다.
   * @param event 포커스 이벤트
   */
  function handleBlur(event: FocusEvent<HTMLInputElement>): void {
    commit(event.currentTarget);
  }

  /**
   * 메시지 상자가 닫히면(확인, Esc) 이름 바꾸기로 돌아간다. 포커스는 대화 상자가 입력창으로 돌려준다.
   * @param isOpen 열림 여부
   */
  function handleMessageBoxOpenChange(isOpen: boolean): void {
    if (isOpen) {
      return;
    }
    isMessageBoxOpenRef.current = false;
    setRename((current) => (current === null ? current : { ...current, messageBox: null }));
  }

  const messageBox = rename?.messageBox ?? null;
  return {
    renamingId: rename?.id ?? null,
    errorMessage: rename?.error ?? null,
    startRename,
    renameFieldProps: {
      ref: inputRef,
      value: rename?.value ?? '',
      onValueChange: handleValueChange,
      onKeyDown: handleKeyDown,
      onBlur: handleBlur,
      maxLength: FOLDER_NAME_MAX_LENGTH,
      'aria-label': RENAME_FIELD_LABEL,
      'aria-invalid': rename?.error !== null && rename?.error !== undefined,
    },
    messageBoxProps: {
      ...messageBoxContents[messageBox ?? 'reserved-name'],
      open: messageBox !== null,
      onOpenChange: handleMessageBoxOpenChange,
      finalFocus: inputRef,
    },
  };
}
