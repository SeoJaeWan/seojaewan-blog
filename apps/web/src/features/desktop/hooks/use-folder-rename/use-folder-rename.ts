import type { FocusEvent, KeyboardEvent } from 'react';
import { useRef, useState } from 'react';

import {
  getFolderNameErrorMessage,
  isFolderNameError,
} from '@/features/desktop/utils/folder-name-message/folder-name-message';
import { useWorkspaceStore } from '@/shared/stores/workspace-store/workspace-store';

/** 이름을 바꾸는 중인 폴더 */
type RenameState = {
  /** 폴더 id */
  id: string;
  /** 입력 중인 이름 */
  value: string;
  /** 잘못된 이름이면 말풍선에 보일 이유 */
  error: string | null;
};

/** 이름 바꾸기 입력창(RenameField)에 넘길 속성 */
type RenameFieldProps = {
  /** 입력 중인 이름 */
  value: string;
  /** 입력이 바뀔 때 */
  onValueChange: (value: string) => void;
  /** Enter 확정, Esc 취소 */
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  /** 바깥을 누르면 확정 */
  onBlur: (event: FocusEvent<HTMLInputElement>) => void;
  /** 접근성 이름 */
  'aria-label': string;
  /** 잘못된 이름이면 true */
  'aria-invalid': boolean;
};

/** 이름 바꾸기 상태와 조작 */
type FolderRenameControls = {
  /** 이름을 바꾸는 중인 폴더 id. 아니면 null */
  renamingId: string | null;
  /** 잘못된 이름의 이유(말풍선 문구). 없으면 null */
  errorMessage: string | null;
  /** 폴더 이름 바꾸기를 시작한다 */
  startRename: (id: string, name: string) => void;
  /** 입력창에 넘길 속성 */
  renameFieldProps: RenameFieldProps;
};

type UseFolderRenameOptions = {
  /** Enter·Esc로 이름 바꾸기를 끝냈을 때 부른다. 사라진 입력창 대신 그 폴더 항목에 키보드 포커스를 돌려주는 데 쓴다 */
  onKeyboardEnd?: (id: string) => void;
};

// 이름 바꾸기 입력창의 접근성 이름이다.
const RENAME_FIELD_LABEL = '새 이름';

/**
 * 바탕화면 폴더 이름 바꾸기를 입력창에 잇는다.
 * - Enter와 바깥 클릭(포커스를 잃음)은 확정, Esc는 취소다.
 * - 이름이 폴더 이름 규칙에 맞지 않으면 이름 바꾸기를 끝내지 않고 이유를 말풍선 문구로 돌려주며, 입력값을 그대로 두고 입력창에 포커스를 돌려준다.
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

  /**
   * 이름 바꾸기를 시작한다.
   * @param id 폴더 id
   * @param name 지금 이름
   */
  function startRename(id: string, name: string): void {
    activeIdRef.current = id;
    setRename({ id, value: name, error: null });
  }

  /**
   * 입력한 이름으로 바꾼다. 맞지 않으면 이유를 남기고 계속 입력하게 한다.
   * @param input 입력창. 맞지 않으면 포커스를 돌려준다
   * @returns 이름 바꾸기를 끝냈으면 true
   */
  function commit(input: HTMLInputElement): boolean {
    if (rename === null || activeIdRef.current !== rename.id) {
      return false;
    }
    const result = renameFolder(rename.id, rename.value);
    if (result.ok || !isFolderNameError(result.reason)) {
      end();
      return true;
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
   * 입력이 바뀌면 남긴 이유를 지운다.
   * @param value 입력 중인 이름
   */
  function handleValueChange(value: string): void {
    setRename((current) => (current === null ? current : { ...current, value, error: null }));
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
    setRename(null);
  }

  /**
   * 바깥을 눌러 포커스를 잃으면 확정한다.
   * @param event 포커스 이벤트
   */
  function handleBlur(event: FocusEvent<HTMLInputElement>): void {
    commit(event.currentTarget);
  }

  return {
    renamingId: rename?.id ?? null,
    errorMessage: rename?.error ?? null,
    startRename,
    renameFieldProps: {
      value: rename?.value ?? '',
      onValueChange: handleValueChange,
      onKeyDown: handleKeyDown,
      onBlur: handleBlur,
      'aria-label': RENAME_FIELD_LABEL,
      'aria-invalid': rename?.error !== null && rename?.error !== undefined,
    },
  };
}
