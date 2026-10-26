import type { JSX, ReactNode } from 'react';
import { useState } from 'react';

import { WindowSnapAssist } from '@/core/window/components/window-snap-assist/window-snap-assist';
import type { RenderWindow } from '@/core/window/components/window-view/window-view';
import { WindowView } from '@/core/window/components/window-view/window-view';
import type {
  OpenWindow,
  SnapZone,
  WindowState,
} from '@/core/window/rules/window-rules/window-rules';
import {
  getFrontWindowId,
  getRemainingSnapZones,
} from '@/core/window/rules/window-rules/window-rules';
import { useWindowStore } from '@/core/window/stores/window-store/window-store';
import { useDevice } from '@/shared/hooks/use-device/use-device';
import { useWorkArea } from '@/shared/hooks/use-work-area/use-work-area';

type WindowLayerProps = {
  /** 앱 창을 그린다. 앱마다 다른 창 조립은 쓰는 곳이 고른다 */
  renderWindow: RenderWindow;
  /** 창 제목을 정한다. 창 영역의 접근성 이름이 된다 */
  getWindowTitle: (window: OpenWindow) => string;
  /** 창 앱 아이콘(16px)을 그린다. Snap Assist 카드에 쓴다 */
  renderWindowIcon: (window: OpenWindow) => ReactNode;
};

/** 스냅한 뒤 남은 칸을 다른 창으로 채우는 제안(Snap Assist)의 진행 */
type SnapAssistProgress = {
  /** 아직 채우지 않은 칸. 앞에서부터 하나씩 제안한다 */
  zones: readonly SnapZone[];
  /** 이번 레이아웃에 이미 놓은 창. 제안에서 뺀다 */
  placedIds: readonly string[];
};

/** 저장소에서 지웠지만 닫히는 애니메이션 동안 화면에 남긴 창 */
type LeavingWindow = {
  /** 지우기 직전의 창 */
  window: OpenWindow;
  /** 쌓는 차례에서 바로 아래에 있던 남은 창. 없으면 맨 아래다 */
  anchorId: string | null;
};

type WindowSnapshot = Pick<WindowState, 'windows' | 'order'>;

/**
 * 열린 창을 쌓아 그리는 창 층이다. 저장소에서 지운 창은 마지막 모습(자리, 쌓는 차례)을 지역 상태로 붙들어
 * 닫히는 애니메이션이 끝날 때까지만 화면에 남긴다. 그래서 저장소에서는 바로 지워져 "맨 앞 창을 닫으면 최근 창이 앞으로"가
 * 바로 적용된다. 최소화된 채 닫힌 창은 이미 보이지 않으므로 남기지 않는다.
 * DOM 순서는 연 차례로 고정하고 쌓는 차례는 z-index로 준다. 창을 앞으로 가져올 때 요소를 옮기면 모션 클래스가 다시 재생되기 때문이다.
 * 스냅 레이아웃으로 창 하나를 스냅하면 남은 칸에 다른 창을 제안한다(Snap Assist). 남은 칸이 여럿이면 칸 번호 순서로 하나씩 제안하고,
 * 제안할 다른 창이 없으면(열린 창이 하나뿐이면) 보여 주지 않는다.
 * 층 자체는 빈 곳의 클릭을 아래(바탕화면 아이콘)로 넘기고, 창만 클릭을 받는다. 층은 쌓임 맥락을 따로 만들어(`isolate`)
 * 창의 z-index가 뒤에 오는 패널 층과 작업 표시줄(미리보기 목록 포함) 위로 올라가지 않게 한다.
 * @codocs [[디자인 기반:모션 클래스]]
 * @codocs [[창 동작:창 조작]]
 * @codocs [[창 동작:스냅]]
 * @param props
 */
export function WindowLayer(props: WindowLayerProps): JSX.Element {
  const { renderWindow, getWindowTitle, renderWindowIcon } = props;
  const windows = useWindowStore((state) => state.windows);
  const order = useWindowStore((state) => state.order);
  const snap = useWindowStore((state) => state.snap);
  const close = useWindowStore((state) => state.close);
  const device = useDevice();
  const workArea = useWorkArea();
  const [snapAssist, setSnapAssist] = useState<SnapAssistProgress | null>(null);
  const [leaving, setLeaving] = useState<readonly LeavingWindow[]>([]);
  const [previous, setPrevious] = useState<WindowSnapshot>({ windows, order });

  // 저장소가 바뀐 그 렌더에서 지워진 창을 붙든다. 효과에서 하면 한 번은 창이 빠진 채 칠해진다.
  let current = leaving;
  if (previous.windows !== windows || previous.order !== order) {
    current = getNextLeaving(leaving, previous, { windows, order });
    setPrevious({ windows, order });
    setLeaving(current);
  }

  const frontId = getFrontWindowId({ windows, order });
  const stack = getStackOrder(order, current);
  const entries = [
    ...Object.values(windows).map((item) => ({ window: item, isClosing: false })),
    ...current.map((item) => ({ window: item.window, isClosing: true })),
  ].sort((left, right) => left.window.serial - right.window.serial);

  /**
   * 닫히는 애니메이션이 끝난 창을 놓는다.
   * @param id 창 id
   */
  function handleExitComplete(id: string): void {
    setLeaving((items) => items.filter((item) => item.window.id !== id));
  }

  /**
   * 스냅 레이아웃으로 창을 스냅하면 그 레이아웃의 남은 칸에 Snap Assist를 띄운다.
   * @param id 스냅한 창
   * @param zone 채운 칸
   */
  function handleSnap(id: string, zone: SnapZone): void {
    setSnapAssist({ zones: getRemainingSnapZones(zone), placedIds: [id] });
  }

  // 남은 칸과 제안할 창(이번에 놓지 않은 창, 최근에 맨 앞이었던 차례)이 있을 때만 Snap Assist를 보인다.
  const assistZone = device === 'desktop' ? snapAssist?.zones[0] : undefined;
  const assistWindows =
    snapAssist === null
      ? []
      : [...order]
          .reverse()
          .filter((id) => !snapAssist.placedIds.includes(id))
          .flatMap((id) => windows[id] ?? []);

  /**
   * Snap Assist에서 창을 고르면 그 창이 남은 칸을 채우고, 다음 남은 칸으로 넘어간다.
   * @param id 고른 창
   */
  function handleAssistSelect(id: string): void {
    if (snapAssist === null || assistZone === undefined) {
      return;
    }
    snap(id, assistZone);
    setSnapAssist({ zones: snapAssist.zones.slice(1), placedIds: [...snapAssist.placedIds, id] });
  }

  /**
   * Snap Assist 카드의 닫기 버튼을 누르면 그 창을 닫는다.
   * @param id 창 id
   */
  function handleAssistClose(id: string): void {
    close(id);
  }

  /** Esc나 빈 곳을 누르면 Snap Assist를 닫는다. */
  function handleAssistDismiss(): void {
    setSnapAssist(null);
  }

  return (
    <div data-layer="windows" className="pointer-events-none absolute inset-0 isolate">
      {entries.map(
        /**
         * 창 하나를 그린다.
         * @param entry 창과 닫히는 중인지
         * @returns WindowView
         */
        (entry) => (
          <WindowView
            key={entry.window.id}
            window={entry.window}
            title={getWindowTitle(entry.window)}
            closing={entry.isClosing}
            active={!entry.isClosing && entry.window.id === frontId}
            zIndex={stack.indexOf(entry.window.id) + 1}
            device={device}
            workArea={workArea}
            renderWindow={renderWindow}
            onExitComplete={handleExitComplete}
            onSnap={handleSnap}
          />
        ),
      )}
      {assistZone !== undefined && workArea !== null && assistWindows.length > 0 && (
        <WindowSnapAssist
          zone={assistZone}
          windows={assistWindows}
          workArea={workArea}
          zIndex={stack.length + 1}
          renderWindow={renderWindow}
          getWindowTitle={getWindowTitle}
          renderWindowIcon={renderWindowIcon}
          onSelect={handleAssistSelect}
          onCloseWindow={handleAssistClose}
          onDismiss={handleAssistDismiss}
        />
      )}
    </div>
  );
}

/**
 * 저장소가 바뀐 뒤 화면에 남길 창을 구한다. 새로 지워진 창(최소화되지 않은 것)을 더하고,
 * 남긴 창의 바로 아래 창이 지워졌으면 그 창의 아래 창으로 바꾼다.
 * @param leaving 지금 남긴 창
 * @param previous 바뀌기 전 저장소
 * @param next 바뀐 저장소
 * @returns 남길 창
 */
function getNextLeaving(
  leaving: readonly LeavingWindow[],
  previous: WindowSnapshot,
  next: WindowSnapshot,
): LeavingWindow[] {
  /**
   * 지난 쌓는 차례에서 id 바로 아래에 있던 창 가운데 아직 남은 창을 찾는다.
   * @param id 기준 창
   * @returns 남은 창 id. 없으면 null
   */
  function findAnchor(id: string): string | null {
    for (let index = previous.order.indexOf(id) - 1; index >= 0; index -= 1) {
      const candidate = previous.order[index];
      if (candidate !== undefined && next.windows[candidate] !== undefined) {
        return candidate;
      }
    }
    return null;
  }
  const kept = leaving.map((item) =>
    item.anchorId !== null && next.windows[item.anchorId] === undefined
      ? { ...item, anchorId: findAnchor(item.anchorId) }
      : item,
  );
  const added: LeavingWindow[] = [];
  for (const id of previous.order) {
    const removed = previous.windows[id];
    if (next.windows[id] === undefined && removed !== undefined && !removed.isMinimized) {
      added.push({ window: removed, anchorId: findAnchor(id) });
    }
  }
  return [...kept, ...added];
}

/**
 * 남은 창과 닫히는 창을 함께 쌓는 차례를 구한다. 닫히는 창은 지워지기 전 바로 아래 창 위에 둔다.
 * @param order 저장소의 활성 순서
 * @param leaving 닫히는 창
 * @returns 아래에서 위로 쌓는 창 id
 */
function getStackOrder(order: readonly string[], leaving: readonly LeavingWindow[]): string[] {
  /**
   * 어떤 창 바로 위에 둘 닫히는 창 id를 고른다.
   * @param anchorId 아래 창. null이면 맨 아래
   * @returns 닫히는 창 id
   */
  function getLeavingAbove(anchorId: string | null): string[] {
    return leaving.filter((item) => item.anchorId === anchorId).map((item) => item.window.id);
  }
  return [...getLeavingAbove(null), ...order.flatMap((id) => [id, ...getLeavingAbove(id)])];
}
