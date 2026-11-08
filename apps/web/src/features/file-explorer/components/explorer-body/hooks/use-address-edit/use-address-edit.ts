import type { ExplorerAddressRow } from '@seojaewan/design-system';
import type { ComponentProps, KeyboardEvent, MouseEvent } from 'react';
import { useRef, useState } from 'react';

import {
  type ExplorerWorkspace,
  findExplorerLocationByAddress,
  getExplorerAddressText,
} from '@/features/file-explorer/utils/explorer-location/explorer-location';
import type { DeviceVariant } from '@/shared/hooks/use-device/use-device';
import type { ExplorerLocation } from '@/shared/utils/window-rules/window-rules';

type EditFieldProps = NonNullable<
  ComponentProps<typeof ExplorerAddressRow>['breadcrumbEditFieldProps']
>;

/**
 * 주소창 편집 설정
 * - workspace: 작업 공간. 경로 글자를 만들고 입력한 경로의 폴더를 찾는다
 * - location: 보고 있는 위치. 위치가 바뀌면 편집을 끝낸다
 * - device: 화면 방식. 모바일은 현재 위치 한 칸을 눌러도 편집을 시작한다
 * - onNavigate: 찾은 위치로 같은 탭에서 간다
 */
type AddressEditOptions = {
  workspace: ExplorerWorkspace;
  location: ExplorerLocation;
  device: DeviceVariant;
  onNavigate: (location: ExplorerLocation) => void;
};

/**
 * 주소창 편집 상태와 동작
 * - isEditing: 경로를 입력칸으로 바꿨는지(Breadcrumb `isEditing`)
 * - editFieldProps: 입력칸에 넘길 값·동작·접근성 속성
 * - handleRowClick: 주소 줄을 눌렀을 때. 경로의 빈 곳이면 편집을 시작한다
 * - notFoundText: 찾지 못한 입력. null이 아니면 메시지 상자를 띄운다
 * - handleNotFoundOpenChange: 메시지 상자가 닫힐 때
 * - handleNotFoundCloseComplete: 메시지 상자가 다 닫혔을 때
 */
type AddressEdit = {
  isEditing: boolean;
  editFieldProps: EditFieldProps | undefined;
  handleRowClick: (event: MouseEvent<HTMLDivElement>) => void;
  notFoundText: string | null;
  handleNotFoundOpenChange: (isOpen: boolean) => void;
  handleNotFoundCloseComplete: () => void;
};

/**
 * 탐색기 주소창 편집을 맡는다.
 * - 경로(Breadcrumb)에서 마디(위치 이름 버튼)가 아닌 빈 곳을 누르면 경로가 `\`로 이은 글자 입력칸으로 바뀌고 전체가 선택된다.
 *   모바일은 현재 위치 한 칸을 눌러도 바뀐다.
 * - Enter: 입력한 경로의 폴더를 찾아 같은 탭에서 간다(뒤로·앞으로 기록에 남는다). 대소문자는 구분하지 않고 `휴지통`도 받는다.
 *   지금 위치와 같으면 편집만 끝낸다. 비어 있으면 입력을 버린다.
 * - 찾지 못하면 메시지 상자를 띄우고 입력칸은 그대로 둔다. 메시지 상자가 포커스를 가져가 생기는 포커스 잃음은 무시하고,
 *   닫히면 포커스가 입력칸으로 돌아온다.
 * - Esc를 누르거나 포커스를 잃으면 입력을 버리고 마디 모양으로 돌아간다. 다른 위치로 가도 끝난다.
 * @codocs [[파일 탐색기:주소창 편집]]
 * @codocs [[파일 탐색기:모바일]]
 * @param options 작업 공간, 위치, 화면 방식, 이동 함수
 * @returns 편집 상태와 동작
 */
export function useAddressEdit(options: AddressEditOptions): AddressEdit {
  const { workspace, location, device, onNavigate } = options;
  // 편집 중인 위치와 입력. 위치가 바뀌면 편집 중이 아니다.
  const [edit, setEdit] = useState<{ location: ExplorerLocation; text: string } | null>(null);
  const [notFoundText, setNotFoundText] = useState<string | null>(null);
  // 메시지 상자를 띄운 동안의 포커스 잃음은 입력을 버리지 않는다.
  const isAlertingRef = useRef(false);
  const isEditing = edit !== null && edit.location === location;

  /** 입력을 버리고 마디 모양으로 돌아간다. */
  function cancel(): void {
    setEdit(null);
  }

  /** 입력한 경로로 간다. 찾지 못하면 메시지 상자를 띄운다. */
  function submit(): void {
    if (edit === null) {
      return;
    }
    const text = edit.text.trim();
    if (text === '') {
      cancel();
      return;
    }
    const target = findExplorerLocationByAddress(workspace, text);
    if (target === undefined) {
      isAlertingRef.current = true;
      setNotFoundText(text);
      return;
    }
    setEdit(null);
    if (target !== location) {
      onNavigate(target);
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

  /** 포커스를 잃으면 입력을 버린다. 메시지 상자를 띄운 동안은 그대로 둔다. */
  function handleBlur(): void {
    if (!isAlertingRef.current) {
      cancel();
    }
  }

  /**
   * 주소 줄을 누르면, 경로의 빈 곳(버튼·입력칸이 아닌 곳)이면 편집을 시작한다. 모바일은 현재 위치 한 칸도 받는다.
   * 줄 자체의 여백과 이동·검색 버튼은 넘긴다.
   * @param event 누르기 이벤트
   */
  function handleRowClick(event: MouseEvent<HTMLDivElement>): void {
    const target = event.target;
    if (isEditing || !(target instanceof Element) || target === event.currentTarget) {
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
    handleRowClick,
    notFoundText,
    handleNotFoundOpenChange,
    handleNotFoundCloseComplete,
  };
}
