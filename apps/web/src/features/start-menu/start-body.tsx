import type { JSX } from 'react';

import {
  Button,
  DropDownButton,
  ListGroup,
  ListItem,
  PinnedTile,
  Scrollbar,
  SectionTitle,
  TileGrid,
} from '@seojaewan/design-system';

import { type ItemIconSource, renderItemIcon } from './item-icon';
import { SearchBody, type SearchResultGroups } from './search-body';
import { StartJumpList } from './start-jump-list';

/** Start 고정됨과 모두 목록에 보이는 항목 하나 */
export type StartItem = ItemIconSource & {
  /** 항목 이름(글은 제목) */
  title: string;
};

/** 모두 목록의 묶음 하나. 간단히·그리드는 첫 글자, 범주는 항목 종류로 묶는다 */
export type StartItemGroup = {
  /** 묶음 머리글(첫 글자나 종류 이름) */
  label: string;
  /** 묶음 안의 항목. 이름순이다 */
  items: readonly StartItem[];
};

/** 모두 목록의 보기. 간단히(list), 그리드(grid), 범주(category)다 */
export type StartAllView = 'list' | 'grid' | 'category';

export type StartBodyDevice = 'desktop' | 'mobile';

type StartBodyCommonProps = {
  /** 피그마 Device. 모바일은 고정 항목 칸이 좁고(89) 스크롤바 자리가 다르다 */
  device?: StartBodyDevice;
  /** 바깥 배치 클래스. 크기는 쓰는 곳(Start 메뉴)이 정한다 */
  className?: string;
};

type StartBodyProps = StartBodyCommonProps &
  (
    | {
        /** 피그마 View=List·Grid·Category. 고정됨과 모두 목록을 보인다 */
        view: StartAllView;
        /** 고정됨 항목 */
        pinned: readonly StartItem[];
        /** 모두 목록의 묶음 */
        groups: readonly StartItemGroup[];
      }
    | {
        /** 피그마 View=JumpList. 모두 제목 줄과 글자 격자를 보인다 */
        view: 'jump-list';
        /** 목록에 항목이 있는 글자 */
        availableLetters: readonly string[];
      }
    | {
        /** 피그마 View=Results. 검색 결과 화면(`Search/Body` 결과와 같다)을 보인다 */
        view: 'results';
        /** 검색 결과 */
        results: SearchResultGroups;
      }
  );

// 보기마다 `보기:` 버튼 글자다.
const viewLabels = {
  list: '보기: 간단히',
  grid: '보기: 그리드',
  category: '보기: 범주',
} as const satisfies Record<StartAllView, string>;

// 기기별 고정 항목 칸 너비다. 데스크톱은 PinnedTile 기본(95)으로 6열, 모바일은 89로 4열이다.
const tileClassNames = {
  desktop: undefined,
  mobile: 'w-89',
} as const satisfies Record<StartBodyDevice, string | undefined>;

// 기기별 스크롤바 자리다. 피그마는 스크롤바를 본문 오른쪽 바깥(Start 메뉴 안쪽 여백)에 두고 위로 36(검색 입력칸 자리) 올려,
// 본문 아래 8 위에서 끝나게 그린다(데스크톱은 오른쪽 바깥 16, 모바일은 바로 바깥).
// 간격 토큰에 36·28이 없어 위치(32, 24)와 음수 바깥 여백(4)을 더해 맞춘다.
const scrollbarClassNames = {
  desktop: 'absolute -top-32 -right-24 bottom-8 -mt-4 -mr-4',
  mobile: 'absolute -top-32 -right-12 bottom-8 -mt-4',
} as const satisfies Record<StartBodyDevice, string>;

/**
 * 기본 클래스와 바깥 배치 클래스를 잇는다.
 * @param base 기본 클래스
 * @param className 바깥 배치 클래스
 * @returns 이은 클래스
 */
function joinClassNames(base: string, className: string | undefined): string {
  return className === undefined ? base : `${base} ${className}`;
}

/**
 * Start 메뉴 안의 본문(피그마 조립 `Start/Body`)을 그린다. 고정됨과 모두 목록(간단히·그리드·범주), 글자 격자, 검색 결과 중 하나다.
 * 간단히·그리드 목록에는 `data-jump-list="list"`를 달아, 글자 격자가 열리고 닫히는 움직임을 기능을 구현할 때 붙일 수 있게 한다.
 * 스크롤바는 피그마처럼 막대 기본 위치로 그린다. 스크롤과 막대 위치, 보기 바꾸기, 글자로 이동하기는 기능을 구현할 때 붙인다.
 * @codocs [[디자인 시스템:조립]]
 * @codocs [[Start 메뉴:고정됨]]
 * @codocs [[Start 메뉴:모두]]
 * @codocs [[Start 메뉴:검색]]
 * @param props
 */
export function StartBody(props: StartBodyProps): JSX.Element {
  const { device = 'desktop', className } = props;
  switch (props.view) {
    case 'results':
      return (
        <div className={joinClassNames('flex flex-col pb-24', className)}>
          <SearchBody
            view="results"
            device={device}
            results={props.results}
            className="min-h-px w-full flex-1"
          />
        </div>
      );
    case 'jump-list':
      return (
        <div
          className={joinClassNames('flex flex-col items-start gap-16 overflow-clip', className)}
        >
          <SectionTitle
            title="모두"
            showAction
            action={<Button variant="subtle" label="뒤로" />}
            className="w-full shrink-0"
          />
          <div className="flex w-full shrink-0 flex-col items-center">
            <StartJumpList availableLetters={props.availableLetters} />
          </div>
        </div>
      );
    case 'list':
    case 'grid':
    case 'category': {
      const tileClassName = tileClassNames[device];
      return (
        <div className={joinClassNames('relative', className)}>
          <div className="flex size-full flex-col items-start gap-16 overflow-clip pb-24">
            <SectionTitle title="고정됨" className="w-full shrink-0" />
            <TileGrid className="w-full shrink-0">
              {props.pinned.map(
                /**
                 * 고정 항목 칸 하나를 그린다.
                 * @param item 고정 항목
                 * @returns PinnedTile
                 */
                (item) => (
                  <PinnedTile
                    key={item.title}
                    label={item.title}
                    icon={renderItemIcon(item)}
                    className={tileClassName}
                  />
                ),
              )}
            </TileGrid>
            <SectionTitle
              title="모두"
              showAction
              action={<DropDownButton label={viewLabels[props.view]} />}
              className="w-full shrink-0"
            />
            <StartAllList view={props.view} groups={props.groups} tileClassName={tileClassName} />
          </div>
          <Scrollbar className={scrollbarClassNames[device]} />
        </div>
      );
    }
  }
}

type StartAllListProps = {
  /** 모두 목록의 보기 */
  view: StartAllView;
  /** 모두 목록의 묶음 */
  groups: readonly StartItemGroup[];
  /** 그리드 보기의 항목 칸 너비 클래스 */
  tileClassName: string | undefined;
};

/**
 * 모두 목록을 묶음마다 ListGroup으로 그린다. 그리드 보기는 묶음 안을 PinnedTile 격자로, 나머지는 ListItem 줄로 채운다.
 * @param props
 */
function StartAllList(props: StartAllListProps): JSX.Element {
  const { view, groups, tileClassName } = props;
  // 첫 글자로 묶은 목록(간단히·그리드)만 글자 격자와 번갈아 보이므로 움직임이 찾을 표시를 단다.
  const jumpListTarget = view === 'category' ? undefined : 'list';
  return (
    <div data-jump-list={jumpListTarget} className="flex w-full shrink-0 flex-col gap-2">
      {groups.map(
        /**
         * 묶음 하나를 그린다.
         * @param group 묶음
         * @returns ListGroup
         */
        (group) => (
          <ListGroup key={group.label} label={group.label} className="w-full">
            {view === 'grid' ? (
              <TileGrid className="w-full">
                {group.items.map(
                  /**
                   * 항목 칸 하나를 그린다.
                   * @param item 항목
                   * @returns PinnedTile
                   */
                  (item) => (
                    <PinnedTile
                      key={item.title}
                      label={item.title}
                      icon={renderItemIcon(item)}
                      className={tileClassName}
                    />
                  ),
                )}
              </TileGrid>
            ) : (
              group.items.map(
                /**
                 * 항목 한 줄을 그린다.
                 * @param item 항목
                 * @returns ListItem
                 */
                (item) => (
                  <ListItem
                    key={item.title}
                    title={item.title}
                    icon={renderItemIcon(item)}
                    className="w-full"
                  />
                ),
              )
            )}
          </ListGroup>
        ),
      )}
    </div>
  );
}
