import type { JSX } from 'react';

import type { SvgAssetName } from '../../assets/asset-data';
import { cn } from '../../cn';
import { Asset } from '../asset/asset';
import { IconButton } from '../icon-button/icon-button';

type MenuZoomItemProps = {
  /** 줄 이름(피그마 label). 기본은 `확대/축소`다 */
  label?: string;
  /** 이름 앞 16px 아이콘(피그마 icon 인스턴스 교체). 기본은 돋보기+ 아이콘이다 */
  icon?: SvgAssetName;
  /** 지금 배율 글자(피그마 value, 예: `100%`) */
  value: string;
  /** 줄이기(−) 버튼을 눌렀을 때 호출 */
  onZoomOut?: () => void;
  /** 키우기(+) 버튼을 눌렀을 때 호출 */
  onZoomIn?: () => void;
  /** 줄이기 버튼을 쓸 수 없게 한다(가장 작은 단계) */
  isZoomOutDisabled?: boolean;
  /** 키우기 버튼을 쓸 수 없게 한다(가장 큰 단계) */
  isZoomInDisabled?: boolean;
  /** 덧붙일 바깥 배치 클래스 */
  className?: string;
};

/**
 * Chrome ⋮ 메뉴의 확대/축소 조절 줄(피그마 MenuZoomItem)을 그린다.
 * −·+ 버튼은 메뉴 항목이 아니라 일반 버튼이라 눌러도 메뉴가 닫히지 않는다.
 * 실제 배율 동작은 쓰는 곳이 콜백과 값으로 잇는다.
 * @codocs [[컴포넌트 목록:기본 컨트롤]]
 * @codocs [[Chrome:확대/축소]]
 * @param props
 */
export function MenuZoomItem(props: MenuZoomItemProps): JSX.Element {
  const {
    label = '확대/축소',
    icon = 'icons/ic_fluent_zoom_in_20_regular.svg',
    value,
    onZoomOut: handleZoomOut,
    onZoomIn: handleZoomIn,
    isZoomOutDisabled = false,
    isZoomInDisabled = false,
    className,
  } = props;
  return (
    <div
      role="group"
      aria-label={label}
      className={cn('flex w-240 items-center justify-start px-4 py-0 select-none', className)}
    >
      <div className="flex flex-1 items-center justify-start gap-12 self-stretch pr-4 pl-12">
        <span className="flex size-icon-16 shrink-0 items-center justify-center text-text-fill-primary">
          <Asset name={icon} className="size-icon-16" />
        </span>
        <span className="min-w-0 flex-1 truncate type-body text-text-fill-primary">{label}</span>
        <div className="flex shrink-0 items-center justify-start gap-4">
          <IconButton
            variant="subtle"
            label="축소"
            icon="icons/ic_fluent_subtract_20_regular.svg"
            disabled={isZoomOutDisabled}
            onClick={handleZoomOut}
          />
          <span className="w-40 shrink-0 text-center type-body text-text-fill-primary">
            {value}
          </span>
          <IconButton
            variant="subtle"
            label="확대"
            icon="icons/ic_fluent_add_20_regular.svg"
            disabled={isZoomInDisabled}
            onClick={handleZoomIn}
          />
        </div>
      </div>
    </div>
  );
}
