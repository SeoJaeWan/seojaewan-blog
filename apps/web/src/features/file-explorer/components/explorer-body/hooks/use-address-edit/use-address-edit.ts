import type { ExplorerAddressRow } from '@seojaewan/design-system';
import type { ComponentProps, KeyboardEvent, MouseEvent } from 'react';
import { useRef, useState } from 'react';

import {
  type ExplorerWorkspace,
  findExplorerAddressTarget,
  getExplorerAddressText,
} from '@/features/file-explorer/utils/explorer-location/explorer-location';
import type { DeviceVariant } from '@/shared/hooks/use-device/use-device';
import type { ExplorerLocation } from '@/shared/utils/window-rules/window-rules';
import type { PlacedItem } from '@/shared/utils/workspace-rules/workspace-rules';

type EditFieldProps = NonNullable<
  ComponentProps<typeof ExplorerAddressRow>['breadcrumbEditFieldProps']
>;

/**
 * 주소창 편집 설정
 * - workspace: 작업 공간. 경로 글자를 만들고 입력한 경로의 폴더를 찾는다
 * - location: 보고 있는 위치. 위치가 바뀌면 편집을 끝낸다
 * - device: 화면 방식. 모바일은 현재 위치 한 칸을 눌러도 편집을 시작한다
 * - onNavigate: 찾은 위치로 같은 탭에서 간다
 * - onOpenItem: 경로 끝의 글·외부 링크를 연다(더블클릭과 같다)
 * - onRestoreTrashed: 휴지통에 있는 항목을 복원한다. 복원했으면 true
 */
type AddressEditOptions = {
  workspace: ExplorerWorkspace;
  location: ExplorerLocation;
  device: DeviceVariant;
  onNavigate: (location: ExplorerLocation) => void;
  onOpenItem: (id: string) => void;
  onRestoreTrashed: (id: string) => boolean;
};

/** 복원할지 묻는 휴지통 항목. id는 항목 id, kind는 그 종류다 */
type TrashedTarget = {
  id: string;
  kind: PlacedItem['kind'];
};

/**
 * 주소창 편집 상태와 동작
 * - isEditing: 경로를 입력칸으로 바꿨는지(Breadcrumb `isEditing`)
 * - editFieldProps: 입력칸에 넘길 값·동작·접근성 속성
 * - handleClear: 입력칸의 지우기 버튼(×)을 눌렀을 때. 입력을 비운다
 * - handleRowClick: 주소 줄을 눌렀을 때. 경로의 빈 곳이면 편집을 시작한다
 * - notFoundText: 찾지 못한 입력. null이 아니면 메시지 상자를 띄운다
 * - handleNotFoundOpenChange: 메시지 상자가 닫힐 때
 * - handleNotFoundCloseComplete: 메시지 상자가 다 닫혔을 때
 * - trashedKind: 복원할지 묻는 휴지통 항목의 종류. null이 아니면 휴지통 항목 메시지 상자를 띄운다
 * - handleTrashedRestore: 휴지통 항목 메시지 상자의 복원을 눌렀을 때
 * - handleTrashedOpenChange: 휴지통 항목 메시지 상자가 닫힐 때(복원, 취소, Esc)
 * - handleTrashedCloseComplete: 휴지통 항목 메시지 상자가 다 닫혔을 때
 */
type AddressEdit = {
  isEditing: boolean;
  editFieldProps: EditFieldProps | undefined;
  handleClear: () => void;
  handleRowClick: (event: MouseEvent<HTMLDivElement>) => void;
  notFoundText: string | null;
  handleNotFoundOpenChange: (isOpen: boolean) => void;
  handleNotFoundCloseComplete: () => void;
  trashedKind: PlacedItem['kind'] | null;
  handleTrashedRestore: () => void;
  handleTrashedOpenChange: (isOpen: boolean) => void;
  handleTrashedCloseComplete: () => void;
};

/**
 * 탐색기 주소창 편집을 맡는다.
 * - 경로(Breadcrumb)에서 마디(위치 이름 버튼)가 아닌 빈 곳을 누르면 경로가 `\`로 이은 글자 입력칸으로 바뀌고 전체가 선택된다.
 *   모바일은 현재 위치 한 칸을 눌러도 바뀐다.
 * - Enter: 입력한 경로의 폴더를 찾아 같은 탭에서 간다(뒤로·앞으로 기록에 남는다). 대소문자는 구분하지 않고 `휴지통`도 받는다.
 *   지금 위치와 같으면 편집만 끝낸다. 비어 있으면 입력을 버린다. 경로 끝이 글이나 외부 링크면 편집을 끝내고 그 항목을 연다(더블클릭과 같다).
 * - 경로 끝이 휴지통에 있는 항목이면 바로 열지 않고 복원할지 묻는 메시지 상자를 띄운다. 복원하면 복원한 뒤 연다(폴더는 그 폴더로 간다).
 *   취소하면 주소창 편집 상태로 돌아간다.
 * - 찾지 못하면 메시지 상자를 띄우고 입력칸은 그대로 둔다. 메시지 상자가 포커스를 가져가 생기는 포커스 잃음은 무시하고,
 *   닫히면 포커스가 입력칸으로 돌아온다.
 * - Esc를 누르거나 포커스를 잃으면 입력을 버리고 마디 모양으로 돌아간다. 다른 위치로 가도 끝난다.
 * - 지우기 버튼(×)은 입력을 비운다. 포커스는 입력칸에 남고(Breadcrumb이 맡는다), 비면 버튼이 사라진다.
 * @codocs [[파일 탐색기:주소창 편집]]
 * @codocs [[파일 탐색기:모바일]]
 * @param options 작업 공간, 위치, 화면 방식, 이동 함수, 항목 열기 함수, 휴지통 항목 복원 함수
 * @returns 편집 상태와 동작
 */
export function useAddressEdit(options: AddressEditOptions): AddressEdit {
  const { workspace, location, device, onNavigate, onOpenItem, onRestoreTrashed } = options;
  // 편집 중인 위치와 입력. 위치가 바뀌면 편집 중이 아니다.
  const [edit, setEdit] = useState<{ location: ExplorerLocation; text: string } | null>(null);
  const [notFoundText, setNotFoundText] = useState<string | null>(null);
  const [trashed, setTrashed] = useState<TrashedTarget | null>(null);
  // 메시지 상자를 띄운 동안의 포커스 잃음은 입력을 버리지 않는다.
  const isAlertingRef = useRef(false);
  const isEditing = edit !== null && edit.location === location;

  /** 입력을 버리고 마디 모양으로 돌아간다. */
  function cancel(): void {
    setEdit(null);
  }

  /** 입력한 경로로 가거나 경로 끝의 항목을 연다. 찾지 못하면 메시지 상자를 띄운다. */
  function submit(): void {
    if (edit === null) {
      return;
    }
    const text = edit.text.trim();
    if (text === '') {
      cancel();
      return;
    }
    const target = findExplorerAddressTarget(workspace, text);
    if (target === undefined) {
      isAlertingRef.current = true;
      setNotFoundText(text);
      return;
    }
    if (target.kind === 'trashed') {
      isAlertingRef.current = true;
      setTrashed({ id: target.id, kind: target.itemKind });
      return;
    }
    setEdit(null);
    if (target.kind === 'item') {
      onOpenItem(target.id);
    } else if (target.location !== location) {
      onNavigate(target.location);
    }
  }

  /**
   * 입력칸의 키를 받는다. Enter는 이동, Esc는 버리기다.
   * @param event 키 이벤트
   */
  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      submit();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      cancel();
    }
  }

  /**
   * 입력이 바뀌면 기억한다.
   * @param text 입력
   */
  function handleValueChange(text: string): void {
    setEdit({ location, text });
  }

  /** 지우기 버튼(×): 입력을 비운다. 편집은 그대로다. */
  function handleClear(): void {
    setEdit({ location, text: '' });
  }

  /** 포커스를 잃으면 입력을 버린다. 메시지 상자를 띄운 동안은 그대로 둔다. */
  function handleBlur(): void {
    if (!isAlertingRef.current) {
      cancel();
    }
  }

  /**
   * 주소 줄을 누르면, 경로의 빈 곳(버튼·입력칸이 아닌 곳)이면 편집을 시작한다. 모바일은 현재 위치 한 칸도 받는다.
   * 줄 자체의 여백과 이동·검색 버튼은 넘긴다. 꺾쇠 목록처럼 포털로 그린 요소의 누르기도 React 트리로 올라오므로 줄 DOM 밖이면 넘긴다.
   * @param event 누르기 이벤트
   */
  function handleRowClick(event: MouseEvent<HTMLDivElement>): void {
    const target = event.target;
    if (
      isEditing ||
      !(target instanceof Element) ||
      target === event.currentTarget ||
      !event.currentTarget.contains(target)
    ) {
      return;
    }
    const isMobileCurrent =
      device === 'mobile' && target.closest('button[aria-current="page"]') !== null;
    if (target.closest('button, input') !== null && !isMobileCurrent) {
      return;
    }
    setEdit({ location, text: getExplorerAddressText(workspace, location) });
  }

  /**
   * 메시지 상자가 닫히면 지운다.
   * @param isOpen 열림 여부
   */
  function handleNotFoundOpenChange(isOpen: boolean): void {
    if (!isOpen) {
      setNotFoundText(null);
    }
  }

  /** 메시지 상자가 다 닫혀 포커스가 입력칸으로 돌아오면 다시 포커스 잃음을 받는다. */
  function handleNotFoundCloseComplete(): void {
    isAlertingRef.current = false;
  }

  /** 휴지통 항목 메시지 상자의 복원: 그 항목을 복원하고 편집을 끝낸 뒤 연다. 폴더는 그 폴더로 간다. */
  function handleTrashedRestore(): void {
    if (trashed === null || !onRestoreTrashed(trashed.id)) {
      return;
    }
    setEdit(null);
    if (trashed.kind === 'folder') {
      onNavigate(trashed.id);
    } else {
      onOpenItem(trashed.id);
    }
  }

  /**
   * 휴지통 항목 메시지 상자가 닫히면 지운다. 취소면 입력칸이 그대로 남아 편집 상태로 돌아간다.
   * @param isOpen 열림 여부
   */
  function handleTrashedOpenChange(isOpen: boolean): void {
    if (!isOpen) {
      setTrashed(null);
    }
  }

  return {
    isEditing,
    editFieldProps: isEditing
      ? {
          value: edit.text,
          onValueChange: handleValueChange,
          onKeyDown: handleKeyDown,
          onBlur: handleBlur,
          'aria-label': '주소',
        }
      : undefined,
    handleClear,
    handleRowClick,
    notFoundText,
    handleNotFoundOpenChange,
    handleNotFoundCloseComplete,
    trashedKind: trashed?.kind ?? null,
    handleTrashedRestore,
    handleTrashedOpenChange,
    handleTrashedCloseComplete: handleNotFoundCloseComplete,
  };
}
