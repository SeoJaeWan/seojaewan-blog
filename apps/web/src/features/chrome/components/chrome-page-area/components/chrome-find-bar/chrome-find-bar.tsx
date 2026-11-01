import { type ComponentProps, type JSX, useEffect, useRef } from 'react';

import { Flyout, IconButton, SearchBox, Separator } from '@seojaewan/design-system';

type SearchBoxProps = ComponentProps<typeof SearchBox>;

export type ChromeFindBarDevice = 'desktop' | 'mobile';

type ChromeFindBarProps = Pick<
  SearchBoxProps,
  'value' | 'defaultValue' | 'onValueChange' | 'onKeyDown'
> & {
  /** 피그마 Device. desktop은 도구 모음 아래 오른쪽에 뜨는 너비 400의 상자, mobile은 도구 모음 아래 전체 폭이다 */
  device?: ChromeFindBarDevice;
  /** 지금 위치(1부터). 일치가 없으면 0이다 */
  current: number;
  /** 일치하는 곳의 개수 */
  total: number;
  /** 이전(↑) 버튼을 눌렀을 때 */
  onPrevious?: () => void;
  /** 다음(↓) 버튼을 눌렀을 때 */
  onNext?: () => void;
  /** 닫기 버튼을 눌렀을 때 */
  onClose?: () => void;
  /** 바깥 배치 클래스. 놓을 자리(도구 모음 아래 오른쪽 등)는 쓰는 곳이 정한다 */
  className?: string;
};

// 피그마 조립의 기기별 상자 너비다. mobile은 도구 모음 아래 전체 폭을 채운다.
const deviceClassNames = { desktop: 'w-400', mobile: 'w-full' } as const satisfies Record<
  ChromeFindBarDevice,
  string
>;

const FIND_LABEL = '페이지에서 찾기';

/**
 * Chrome 페이지에서 찾기 막대(피그마 조립 `Chrome/FindBar`)를 그린다. 입력칸, `현재/전체` 개수, 이전·다음 버튼, 닫기 버튼을
 * 단색 Flyout 한 줄에 놓는다. 막대가 열리면 입력칸에 포커스를 준다(실제 Chrome과 같다).
 * 찾기·강조·키 입력은 쓰는 곳이 `onValueChange`·`onKeyDown`과 버튼 콜백으로 붙인다.
 * @codocs [[디자인 시스템:조립]]
 * @codocs [[Chrome:페이지에서 찾기]]
 * @param props
 */
export function ChromeFindBar(props: ChromeFindBarProps): JSX.Element {
  const {
    device = 'desktop',
    current,
    total,
    onPrevious: handlePrevious,
    onNext: handleNext,
    onClose: handleClose,
    className,
    ...searchBoxProps
  } = props;
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <Flyout
      material="solid"
      padding="compact"
      role="search"
      aria-label={FIND_LABEL}
      className={[deviceClassNames[device], className].filter(Boolean).join(' ')}
    >
      {/* 피그마 `find row` 배치 프레임이다 */}
      <div className="flex w-full items-center gap-4 py-4 pr-4 pl-8">
        <SearchBox
          {...searchBoxProps}
          ref={inputRef}
          aria-label={FIND_LABEL}
          className="min-w-0 flex-1"
        />
        <span className="shrink-0 type-body whitespace-nowrap text-text-fill-secondary">
          {`${String(current)}/${String(total)}`}
        </span>
        <Separator orientation="vertical" />
        <IconButton
          variant="subtle"
          label="이전 찾기"
          icon="icons/ic_fluent_chevron_up_20_regular.svg"
          onClick={handlePrevious}
        />
        <IconButton
          variant="subtle"
          label="다음 찾기"
          icon="icons/ic_fluent_chevron_down_20_regular.svg"
          onClick={handleNext}
        />
        <IconButton
          variant="subtle"
          label="찾기 닫기"
          icon="icons/ic_fluent_dismiss_20_regular.svg"
          onClick={handleClose}
        />
      </div>
    </Flyout>
  );
}
