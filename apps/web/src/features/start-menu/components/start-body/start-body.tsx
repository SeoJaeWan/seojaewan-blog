'use client';

import { type JSX, type PointerEvent, useEffect, useRef, useState } from 'react';

import {
  Button,
  DropDownButton,
  ListGroup,
  ScrollArea,
  SectionTitle,
  TileGrid,
} from '@seojaewan/design-system';

import {
  type ItemIconSource,
  renderItemIcon,
} from '@/features/start-menu/components/item-icon/item-icon';
import { ItemListRow } from '@/features/start-menu/components/item-list-row/item-list-row';
import {
  SearchBody,
  type SearchResultGroups,
} from '@/features/start-menu/components/search-body/search-body';
import { StartJumpList } from '@/features/start-menu/components/start-jump-list/start-jump-list';
import { StartTile } from '@/features/start-menu/components/start-tile/start-tile';
import { StartViewMenu } from '@/features/start-menu/components/start-view-menu/start-view-menu';
import { findPinnedIdAt } from '@/features/start-menu/utils/start-items/start-items';
import { getAvailableLetters } from '@/features/start-menu/utils/start-letter-rules/start-letter-rules';
import { getViewMenuEntries } from '@/features/start-menu/utils/start-menu-entries/start-menu-entries';
import { ContextMenuArea } from '@/shared/components/context-menu-area/context-menu-area';
import type { MenuPopupEntry } from '@/shared/components/menu-popup/menu-popup';
import { usePointerDrag } from '@/shared/hooks/use-pointer-drag/use-pointer-drag';
import { usePresence } from '@/shared/hooks/use-presence/use-presence';

/** Start 고정됨과 모두 목록에 보이는 항목 하나 */
export type StartItem = ItemIconSource & {
  /** 작업 공간 항목 id(앱은 `APP_ITEM_IDS`의 id). 목록의 key이고, 열거나 고정을 바꿀 때 어느 항목인지 알린다 */
  id: string;
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

type StartListViewProps = StartBodyCommonProps & {
  /** 피그마 View=List·Grid·Category. 고정됨과 모두 목록을 보인다 */
  view: StartAllView;
  /** 고정됨 항목 */
  pinned: readonly StartItem[];
  /** 모두 목록의 묶음 */
  groups: readonly StartItemGroup[];
  /** 항목 칸(고정됨, 그리드 보기)과 목록 줄을 눌렀을 때 부른다. 항목을 여는 일은 쓰는 곳이 한다 */
  onItemOpen?: (item: StartItem) => void;
  /** 고정됨 칸의 우클릭(모바일은 길게 누르기) 메뉴 항목(피그마 `Menu/StartTile`)을 항목마다 정한다. 주지 않으면 메뉴가 없다 */
  getPinnedMenuItems?: (item: StartItem) => readonly MenuPopupEntry[];
  /**
   * 모두 목록 줄(그리드 보기는 칸)의 우클릭(모바일은 길게 누르기) 메뉴 항목(피그마 `Menu/StartListApp`·`Menu/StartListPost`)을
   * 항목마다 정한다. 주지 않으면 메뉴가 없다
   */
  getListMenuItems?: (item: StartItem) => readonly MenuPopupEntry[];
  /** 고정됨 칸을 끌어 다른 칸 자리에 놓을 때(끄는 동안 칸마다) 끈 항목 id와 놓인 칸의 항목 id로 부른다. 주지 않으면 끌 수 없다 */
  onPinnedMove?: (id: string, targetId: string) => void;
  /** `보기:` 메뉴에서 보기를 골랐을 때 부른다. 주지 않으면 `보기:`는 메뉴 없는 버튼 모양만 그린다 */
  onViewChange?: (view: StartAllView) => void;
};

type StartBodyProps =
  | StartListViewProps
  | (StartBodyCommonProps &
      (
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
            /** 고른 항목의 id. 주지 않으면 최고 일치다 */
            selectedId?: string;
            /** 항목 줄이나 카드의 `열기`를 눌렀을 때 그 항목의 id로 부른다 */
            onItemOpen?: (id: string) => void;
            /** 카드의 `링크 복사`를 눌렀을 때 그 항목의 id로 부른다 */
            onCopyLink?: (id: string) => void;
          }
        | {
            /** 검색 결과가 없을 때. "검색 결과 없음"을 안내한다 */
            view: 'no-results';
          }
      ));

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

// 기기별 스크롤 영역의 오른쪽 확장과 그만큼의 안쪽 여백이다. 피그마는 스크롤바를 본문 오른쪽 바깥(Start 메뉴 안쪽 여백)에 그려,
// 스크롤 영역을 안쪽 여백(데스크톱 24, 모바일 12)만큼 오른쪽으로 넓히고 내용에 같은 여백을 줘 내용 너비는 그대로 두고 스크롤바만 바깥에 놓는다.
const scrollAreaClassNames = {
  desktop: '-mr-24',
  mobile: '-mr-12',
} as const satisfies Record<StartBodyDevice, string>;
const scrollContentClassNames = {
  desktop: 'pr-24',
  mobile: 'pr-12',
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
 * 간단히·그리드 목록은 글자 머리글을 누르면 그 자리에 글자 격자(`View=JumpList`와 같은 내용)를 겹쳐 연다([[Start 메뉴:모두]]).
 * `view="jump-list"`는 격자만 그린 피그마 변형 그대로의 모습이다.
 * 고정됨과 모두 목록은 넘치면 ScrollArea로 아래로 스크롤하고, 스크롤바는 본문 오른쪽 바깥에 겹쳐 그린다. 보기 바꾸기는 기능을 구현할 때 붙인다.
 * 항목 칸과 목록 줄을 누르면 `onItemOpen`으로 알린다.
 * @codocs [[디자인 시스템:조립]]
 * @codocs [[Start 메뉴:고정됨]]
 * @codocs [[Start 메뉴:모두]]
 * @codocs [[Start 메뉴:검색]]
 * @param props
 */
export function StartBody(props: StartBodyProps): JSX.Element {
  switch (props.view) {
    case 'results':
      return (
        <div className={joinClassNames('flex flex-col pb-24', props.className)}>
          <SearchBody
            view="results"
            device={props.device}
            results={props.results}
            selectedId={props.selectedId}
            onItemOpen={props.onItemOpen}
            onCopyLink={props.onCopyLink}
            className="min-h-px w-full flex-1"
          />
        </div>
      );
    case 'no-results':
      return (
        <div className={joinClassNames('flex flex-col pb-24', props.className)}>
          <SearchBody view="no-results" className="min-h-px w-full flex-1" />
        </div>
      );
    case 'jump-list':
      return (
        <StartJumpListView
          availableLetters={props.availableLetters}
          className={joinClassNames(
            'flex flex-col items-start gap-16 overflow-clip',
            props.className,
          )}
        />
      );
    case 'list':
    case 'grid':
    case 'category':
      return <StartListView {...props} />;
  }
}

type StartJumpListViewProps = {
  /** 목록에 항목이 있는 글자 */
  availableLetters: readonly string[];
  /** 바탕 요소의 클래스(배치와 크기) */
  className: string;
  /** 바탕 요소를 누를 수 없게 할지(닫히는 중) */
  isInert?: boolean;
  /** "뒤로"를 눌렀을 때 부른다 */
  onBack?: () => void;
  /** 글자를 골랐을 때 부른다 */
  onLetterSelect?: (letter: string) => void;
};

/**
 * 글자 격자 화면(피그마 `Start/Body` `View=JumpList`의 내용)을 그린다. "모두" 제목 줄 오른쪽에 "뒤로" 버튼, 아래 가운데에 글자 격자다.
 * @param props
 */
function StartJumpListView(props: StartJumpListViewProps): JSX.Element {
  return (
    <div inert={props.isInert} className={props.className}>
      <SectionTitle
        title="모두"
        showAction
        action={<Button variant="subtle" label="뒤로" onClick={props.onBack} />}
        className="w-full shrink-0"
      />
      <div className="flex w-full shrink-0 flex-col items-center">
        <StartJumpList
          availableLetters={props.availableLetters}
          onLetterSelect={props.onLetterSelect}
        />
      </div>
    </div>
  );
}

/**
 * 고정됨과 모두 목록을 그린다. 간단히·그리드 보기는 글자 머리글을 누르면 글자 격자를 겹쳐 열고, 글자를 고르면 목록을 그 글자 묶음으로
 * 옮긴 뒤 닫는다. "뒤로"는 옮기지 않고 닫는다.
 *
 * 열고 닫는 움직임은 목록과 격자를 함께 감싼 바탕에 `motion-start-jump-list-enter`·`exit`를 붙여 낸다. 안의 목록(고정됨, 모두, 스크롤바)에
 * `data-jump-list="list"`, 격자(`StartJumpList`)에 `data-jump-list="grid"`가 있다(motion.css의 약속). 정지 모습은 여기서 갖는다.
 * 격자가 다 들어오면(`entered`) 목록을 `invisible`·`inert`로 둔다. 동작 줄이기에서는 목록 페이드가 없어 이것이 없으면 목록이 격자 아래로 비친다.
 * 닫기 시작하면 `invisible`을 풀어, 투명도 0에서 시작하는 목록 페이드 인이 보이게 한다.
 * @codocs [[Start 메뉴:모두]]
 * @codocs [[피그마 연동:모션 클래스]]
 * @param props
 */
function StartListView(props: StartListViewProps): JSX.Element {
  const { view, groups, device = 'desktop', className } = props;
  const tileClassName = tileClassNames[device];
  // 첫 글자로 묶은 보기(간단히·그리드)만 글자 격자로 이동한다. 범주 보기의 머리글은 종류 이름이라 누를 수 없다.
  const isJumpListEnabled = view !== 'category';
  // 격자를 연 머리글의 글자. null이면 격자가 닫혀 있다.
  const [openedLetter, setOpenedLetter] = useState<string | null>(null);
  const isGridOpen = openedLetter !== null;
  const bodyRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const pinnedGridRef = useRef<HTMLDivElement>(null);
  // 방금 고정 칸을 끌었는지. 끌기 뒤에 따라오는 클릭이 항목을 열지 않게 거른다. 새로 누를 때 지운다.
  const isPinnedDraggedRef = useRef(false);
  const [isViewMenuOpen, setIsViewMenuOpen] = useState(false);
  const startPointerDrag = usePointerDrag();
  // 격자가 열리거나 닫힌 뒤 포커스를 옮길 글자. 연 머리글의 글자 칸, 닫으면 고른(뒤로면 연) 글자의 머리글로 옮긴다.
  const pendingFocusLetterRef = useRef<string | null>(null);
  const jumpList = usePresence(bodyRef, isGridOpen, { subtree: true });

  useEffect(
    /** 격자가 열리거나 닫히면 포커스를 격자의 글자 칸이나 목록의 머리글로 옮긴다. 누른 요소가 inert가 되거나 빠지기 때문이다. */
    () => {
      const letter = pendingFocusLetterRef.current;
      if (letter === null) {
        return;
      }
      pendingFocusLetterRef.current = null;
      const target = isGridOpen
        ? bodyRef.current?.querySelector(`[data-jump-list="grid"] [data-jump-letter="${letter}"]`)
        : listRef.current?.querySelector(`[data-letter-group="${letter}"] button`);
      if (target instanceof HTMLElement) {
        target.focus();
      }
    },
    [isGridOpen],
  );

  /**
   * 글자 머리글을 누르면 글자 격자를 연다.
   * @param letter 누른 머리글의 글자
   */
  function openJumpList(letter: string): void {
    pendingFocusLetterRef.current = letter;
    setOpenedLetter(letter);
  }

  /**
   * 글자를 고르면 목록을 그 글자 묶음으로 옮기고 격자를 닫는다. 옮기기는 닫는 움직임(목록 페이드 인)보다 먼저 한다.
   * @param letter 고른 글자
   */
  function handleLetterSelect(letter: string): void {
    listRef.current?.querySelector(`[data-letter-group="${letter}"]`)?.scrollIntoView({
      block: 'start',
    });
    pendingFocusLetterRef.current = letter;
    setOpenedLetter(null);
  }

  /** "뒤로"를 누르면 목록을 옮기지 않고 격자를 닫는다. */
  function handleBack(): void {
    pendingFocusLetterRef.current = openedLetter;
    setOpenedLetter(null);
  }

  /**
   * 고정 칸 위에서 포인터를 누르면 끌어 순서 바꾸기를 시작한다. 끄는 동안 포인터 아래 칸 자리로 바로 옮긴다.
   * @param event 누르기 이벤트
   * @param item 누른 칸의 항목
   */
  function handlePinnedPointerDown(event: PointerEvent<HTMLButtonElement>, item: StartItem): void {
    isPinnedDraggedRef.current = false;
    const { onPinnedMove: handlePinnedMove } = props;
    if (handlePinnedMove === undefined) {
      return;
    }
    startPointerDrag(event, {
      onStart: () => {
        isPinnedDraggedRef.current = true;
      },
      onMove: (point) => {
        const targetId = findPinnedIdAt(pinnedGridRef.current, point.x, point.y);
        if (targetId !== null && targetId !== item.id) {
          handlePinnedMove(item.id, targetId);
        }
      },
    });
  }

  /**
   * 끌기 뒤에 따라오는 클릭이면 한 번 거른다.
   * @returns 거르면 true
   */
  function shouldSuppressPinnedClick(): boolean {
    const isSuppressed = isPinnedDraggedRef.current;
    isPinnedDraggedRef.current = false;
    return isSuppressed;
  }

  /**
   * `보기:` 메뉴에서 보기를 고르면 메뉴를 닫고 쓰는 곳에 알린다.
   * @param nextView 고른 보기
   */
  function handleViewSelect(nextView: StartAllView): void {
    setIsViewMenuOpen(false);
    props.onViewChange?.(nextView);
  }

  /**
   * `보기:` 메뉴를 열거나 닫으려 하면 상태를 맞춘다.
   * @param isOpen 열려는지
   */
  function handleViewMenuOpenChange(isOpen: boolean): void {
    setIsViewMenuOpen(isOpen);
  }

  const handleHeaderClick = isJumpListEnabled ? openJumpList : undefined;
  const viewMenuItems = getViewMenuEntries(view, handleViewSelect);

  /**
   * `모두` 제목 줄 오른쪽의 `보기:` 버튼을 그린다. 보기를 바꾸는 동작을 받았으면 보기 메뉴가 붙은 버튼, 아니면 메뉴 없는 버튼 모양이다.
   * @returns `보기:` 버튼
   */
  function renderViewControl(): JSX.Element {
    if (props.onViewChange === undefined) {
      return <DropDownButton label={viewLabels[view]} />;
    }
    return (
      <StartViewMenu
        open={isViewMenuOpen}
        onOpenChange={handleViewMenuOpenChange}
        label={viewLabels[view]}
        menuItems={viewMenuItems}
      />
    );
  }

  const isListHidden = jumpList.status === 'entered';
  let motionClassName = '';
  if (jumpList.isMounted) {
    motionClassName =
      jumpList.status === 'exiting'
        ? 'motion-start-jump-list-exit'
        : 'motion-start-jump-list-enter';
  }

  return (
    <div
      ref={bodyRef}
      {...jumpList.presenceProps}
      className={joinClassNames(`relative ${motionClassName}`, className)}
    >
      <div
        ref={listRef}
        data-jump-list={isJumpListEnabled ? 'list' : undefined}
        inert={isGridOpen}
        className={isListHidden ? 'invisible flex size-full flex-col' : 'flex size-full flex-col'}
      >
        {/* 넘치면 아래로 스크롤한다. 글자로 이동하기의 scrollIntoView도 이 스크롤 영역을 옮긴다 */}
        <ScrollArea className={`min-h-px flex-1 ${scrollAreaClassNames[device]}`}>
          <div
            className={`flex w-full shrink-0 flex-col items-start gap-16 pb-24 ${scrollContentClassNames[device]}`}
          >
            {/* 화면 읽기 프로그램이 "고정됨"과 "모두" 영역을 구분하도록 영역마다 이름을 단다 */}
            <section
              aria-label="고정됨"
              className="flex w-full shrink-0 flex-col items-start gap-16"
            >
              <SectionTitle title="고정됨" className="w-full shrink-0" />
              <TileGrid ref={pinnedGridRef} className="w-full shrink-0">
                {props.pinned.map(
                  /**
                   * 고정 항목 칸 하나를 그린다.
                   * @param item 고정 항목
                   * @returns StartTile
                   */
                  (item) => (
                    <StartTile
                      key={item.id}
                      item={item}
                      className={tileClassName}
                      onItemOpen={props.onItemOpen}
                      menuItems={props.getPinnedMenuItems?.(item)}
                      onPointerDown={handlePinnedPointerDown}
                      shouldSuppressClick={shouldSuppressPinnedClick}
                    />
                  ),
                )}
              </TileGrid>
            </section>
            <section aria-label="모두" className="flex w-full shrink-0 flex-col items-start gap-16">
              <SectionTitle
                title="모두"
                showAction
                action={renderViewControl()}
                className="w-full shrink-0"
              />
              <StartAllList
                view={view}
                groups={groups}
                tileClassName={tileClassName}
                onItemOpen={props.onItemOpen}
                getMenuItems={props.getListMenuItems}
                onHeaderClick={handleHeaderClick}
              />
            </section>
          </div>
        </ScrollArea>
      </div>
      {jumpList.isMounted && (
        <StartJumpListView
          isInert={jumpList.status === 'exiting'}
          availableLetters={getAvailableLetters(groups)}
          className="absolute inset-0 flex flex-col items-start gap-16 overflow-clip"
          onBack={handleBack}
          onLetterSelect={handleLetterSelect}
        />
      )}
    </div>
  );
}

type StartAllListProps = {
  /** 모두 목록의 보기 */
  view: StartAllView;
  /** 모두 목록의 묶음 */
  groups: readonly StartItemGroup[];
  /** 그리드 보기의 항목 칸 너비 클래스 */
  tileClassName: string | undefined;
  /** 그리드 보기의 항목 칸을 눌렀을 때 부른다 */
  onItemOpen?: (item: StartItem) => void;
  /** 항목의 우클릭 메뉴 항목을 정한다. 주지 않으면 메뉴가 없다 */
  getMenuItems?: (item: StartItem) => readonly MenuPopupEntry[];
  /** 묶음 머리글을 눌렀을 때 그 묶음 글자로 부른다. 없으면 머리글은 누를 수 없다 */
  onHeaderClick?: (label: string) => void;
};

/**
 * 모두 목록을 묶음마다 ListGroup으로 그린다. 그리드 보기는 묶음 안을 PinnedTile 격자로, 나머지는 ListItem 줄로 채운다.
 * @param props
 */
function StartAllList(props: StartAllListProps): JSX.Element {
  const { view, groups, tileClassName } = props;
  return (
    <div className="flex w-full shrink-0 flex-col gap-2">
      {groups.map(
        /**
         * 묶음 하나를 그린다.
         * @param group 묶음
         * @returns StartAllGroup
         */
        (group) => (
          <StartAllGroup
            key={group.label}
            view={view}
            group={group}
            tileClassName={tileClassName}
            onItemOpen={props.onItemOpen}
            getMenuItems={props.getMenuItems}
            onHeaderClick={props.onHeaderClick}
          />
        ),
      )}
    </div>
  );
}

type StartAllGroupProps = Omit<StartAllListProps, 'groups'> & {
  /** 묶음 */
  group: StartItemGroup;
};

/**
 * 모두 목록의 묶음 하나를 ListGroup으로 그린다. 글자 격자에서 고른 글자로 옮길 때 찾도록 묶음 글자(`data-letter-group`)를 단다.
 * @param props
 */
function StartAllGroup(props: StartAllGroupProps): JSX.Element {
  const { view, group, tileClassName, onHeaderClick } = props;

  /** 머리글을 누르면 이 묶음의 글자로 알린다. */
  function notifyHeaderClick(): void {
    onHeaderClick?.(group.label);
  }

  const handleHeaderClick = onHeaderClick === undefined ? undefined : notifyHeaderClick;
  return (
    <ListGroup
      label={group.label}
      data-letter-group={group.label}
      onHeaderClick={handleHeaderClick}
      className="w-full"
    >
      {view === 'grid' ? (
        <TileGrid className="w-full">
          {group.items.map(
            /**
             * 항목 칸 하나를 그린다.
             * @param item 항목
             * @returns StartTile
             */
            (item) => (
              <StartTile
                key={item.id}
                item={item}
                className={tileClassName}
                onItemOpen={props.onItemOpen}
                menuItems={props.getMenuItems?.(item)}
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
            <StartListRow
              key={item.id}
              item={item}
              onItemOpen={props.onItemOpen}
              menuItems={props.getMenuItems?.(item)}
            />
          ),
        )
      )}
    </ListGroup>
  );
}

type StartListRowProps = {
  /** 항목 */
  item: StartItem;
  /** 줄을 열었을 때 부른다 */
  onItemOpen?: (item: StartItem) => void;
  /** 우클릭(모바일은 길게 누르기) 메뉴 항목. 주지 않으면 메뉴가 없다 */
  menuItems?: readonly MenuPopupEntry[];
};

/**
 * 모두 목록의 항목 한 줄을 그린다. 고정 항목 칸처럼 클릭·Enter·Space로 열 수 있어, 열면 그 항목으로 `onItemOpen`을 부른다.
 * 메뉴 항목을 주면 줄을 우클릭(모바일은 길게 누르기, 키보드는 Shift+F10·메뉴 키)할 때 그 메뉴를 띄운다.
 * 줄(`ItemListRow`)이 받은 속성을 넘기지 않아, 우클릭을 받는 영역은 줄을 감싼 요소로 둔다(줄의 `contextmenu`가 올라온다).
 * @codocs [[Start 메뉴:열기와 닫기]]
 * @codocs [[Start 메뉴:모두]]
 * @param props
 */
function StartListRow(props: StartListRowProps): JSX.Element {
  const { item, menuItems } = props;
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  /** 줄을 열면 쓰는 곳에 항목을 알린다. */
  function handleOpen(): void {
    props.onItemOpen?.(item);
  }

  /**
   * 메뉴가 열리거나 닫히면 상태를 맞춘다.
   * @param isOpen 열렸는지
   */
  function handleMenuOpenChange(isOpen: boolean): void {
    setIsMenuOpen(isOpen);
  }

  const row = (
    <ItemListRow
      id={item.id}
      title={item.title}
      icon={renderItemIcon(item)}
      className="w-full"
      onOpen={handleOpen}
    />
  );
  if (menuItems === undefined) {
    return row;
  }
  return (
    <ContextMenuArea
      open={isMenuOpen}
      onOpenChange={handleMenuOpenChange}
      items={menuItems}
      area={<div className="w-full">{row}</div>}
    />
  );
}
