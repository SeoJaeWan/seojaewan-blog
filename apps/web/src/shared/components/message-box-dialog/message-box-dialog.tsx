import { AlertDialog } from '@base-ui/react/alert-dialog';
import { type ComponentProps, type JSX, type RefObject, useRef } from 'react';

import { MessageBox } from '@seojaewan/design-system';

type MessageBoxContentProps = Pick<
  ComponentProps<typeof MessageBox>,
  'buttons' | 'title' | 'message' | 'primaryLabel' | 'secondaryLabel'
>;

type MessageBoxDialogProps = MessageBoxContentProps & {
  /** 열림 여부. 주면 쓰는 곳이 열고 닫기를 정한다 */
  open?: boolean;
  /** 처음 열림 여부(열림 여부를 쓰는 곳이 갖지 않을 때) */
  defaultOpen?: boolean;
  /** 열리거나 닫힐 때 부른다. 버튼, Esc가 닫는다 */
  onOpenChange?: (open: boolean) => void;
  /** 강조 버튼(확인)을 누르면 부른다. 부른 뒤 대화 상자를 닫는다 */
  onPrimaryClick?: () => void;
  /** 기본 버튼(취소)을 누르면 부른다. 부른 뒤 대화 상자를 닫는다 */
  onSecondaryClick?: () => void;
  /** 닫힌 뒤 포커스를 둘 요소. 없으면 열기 전에 포커스가 있던 요소로 돌려준다 */
  finalFocus?: RefObject<HTMLElement | null>;
};

/**
 * 메시지 상자(MessageBox)를 모달 대화 상자로 띄운다. 브라우저 `alert()` 대신 Windows 화면 안에서 알리는 데 쓴다(휴지통 비우기, 폴더 이름).
 * Base UI AlertDialog가 포커스 가두기, Esc, 열고 닫기를 맡고, 화면 가운데에 `motion-flyout-enter`로 페이드해 나타난다.
 * 사라지는 움직임은 없어 버튼을 누르면 바로 닫힌다. 버튼은 어느 쪽이든 핸들러를 부른 뒤 닫는다.
 * @codocs [[작업 공간:휴지통]]
 * @codocs [[피그마 연동:모션 클래스]]
 * @param props
 */
export function MessageBoxDialog(props: MessageBoxDialogProps): JSX.Element {
  const {
    open: isOpen,
    defaultOpen: isDefaultOpen,
    onOpenChange,
    onPrimaryClick,
    onSecondaryClick,
    finalFocus,
    ...contentProps
  } = props;
  const actionsRef = useRef<AlertDialog.Root.Actions | null>(null);

  /**
   * 열림이 바뀐 것을 쓰는 곳에 알린다.
   * @param isNextOpen 바뀐 열림 여부
   */
  function handleOpenChange(isNextOpen: boolean): void {
    onOpenChange?.(isNextOpen);
  }

  /** 강조 버튼 핸들러를 부르고 닫는다. */
  function handlePrimaryClick(): void {
    onPrimaryClick?.();
    actionsRef.current?.close();
  }

  /** 기본 버튼 핸들러를 부르고 닫는다. */
  function handleSecondaryClick(): void {
    onSecondaryClick?.();
    actionsRef.current?.close();
  }

  /**
   * AlertDialog 팝업을 MessageBox로 그린다. MessageBox가 제목과 본문으로 이름과 설명을 스스로 달므로,
   * AlertDialog.Title·Description이 없어 비어 있는 팝업의 aria-labelledby·aria-describedby는 넘기지 않는다.
   * @param popupProps Base UI가 팝업 요소에 주는 속성
   * @returns 메시지 상자
   */
  function renderPopup(popupProps: ComponentProps<'div'>): JSX.Element {
    const messageBoxProps = { ...popupProps };
    delete messageBoxProps['aria-labelledby'];
    delete messageBoxProps['aria-describedby'];
    delete messageBoxProps.children;
    delete messageBoxProps.title;
    return (
      <MessageBox
        {...messageBoxProps}
        {...contentProps}
        onPrimaryClick={handlePrimaryClick}
        onSecondaryClick={handleSecondaryClick}
        className="fixed top-1/2 left-1/2 -translate-1/2 motion-flyout-enter outline-none"
      />
    );
  }

  return (
    <AlertDialog.Root
      open={isOpen}
      defaultOpen={isDefaultOpen}
      onOpenChange={handleOpenChange}
      actionsRef={actionsRef}
    >
      <AlertDialog.Portal>
        <AlertDialog.Popup render={renderPopup} finalFocus={finalFocus} />
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
