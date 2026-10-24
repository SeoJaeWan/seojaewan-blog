import type { ComponentProps, JSX, MouseEvent } from 'react';

import { cn } from '../../cn';
import { Asset } from '../asset/asset';

// 폴더 아이콘 이미지 자산이다. Vite와 Next.js가 모두 파일 주소로 바꿔 준다.
const folderIcon = new URL('../../assets/images/file-folder.png', import.meta.url).href;

type ExplorerTabProps = Omit<ComponentProps<'div'>, 'children' | 'title'> & {
  /** 피그마 State=Selected. 지금 고른 탭이면 바탕을 깐다 */
  selected?: boolean;
  /** 피그마 TEXT 속성 Title. 탭에 보일 폴더 이름이다 */
  title?: string;
  /** 닫기 버튼의 접근성 이름 */
  closeLabel?: string;
  /** 닫기 버튼을 눌렀을 때 부른다. 탭 자체의 onClick은 부르지 않는다 */
  onClose?: (event: MouseEvent<HTMLButtonElement>) => void;
};

/**
 * 탐색기 제목 표시줄의 폴더 탭(피그마 ExplorerTab)을 그린다. 크기는 Windows가 정한 220×32로 고정한다.
 * Rest·Hover·Selected 모양은 선택 여부(selected)와 CSS hover로 바꾼다.
 * @codocs [[컴포넌트 목록:Windows 화면 요소]]
 * @param props
 */
export function ExplorerTab(props: ExplorerTabProps): JSX.Element {
  const {
    selected: isSelected = false,
    title = '폴더 이름',
    closeLabel = '탭 닫기',
    onClose,
    className,
    ...divProps
  } = props;
  return (
    <div
      {...divProps}
      role="tab"
      aria-selected={isSelected}
      className={cn(
        'flex h-control-height w-220 items-center gap-8 rounded-t-overlay py-8 pr-8 pl-12 select-none',
        'transition-colors duration-faster ease-fade',
        isSelected
          ? 'bg-layer-on-mica-base-alt-fill-default'
          : 'bg-subtle-fill-transparent hover:bg-layer-on-mica-base-alt-fill-secondary',
        className,
      )}
    >
      <img src={folderIcon} alt="" className="size-icon-16 shrink-0 object-contain" />
      <span className="min-w-0 flex-1 truncate type-caption text-text-fill-primary">{title}</span>
      <button
        type="button"
        aria-label={closeLabel}
        onClick={(event) => {
          event.stopPropagation();
          onClose?.(event);
        }}
        className="inline-flex size-icon-16 shrink-0 items-center justify-center text-text-fill-primary"
      >
        <Asset name="icons/ic_fluent_dismiss_20_regular.svg" className="size-icon-16" />
      </button>
    </div>
  );
}
