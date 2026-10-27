import type { JSX, ReactNode } from 'react';

import {
  Asset,
  BreadcrumbItem,
  DetailsHeader,
  FileItem,
  FileRow,
  ImageAsset,
} from '@seojaewan/design-system';

import { ExplorerCommands } from '@/features/file-explorer/components/explorer-commands/explorer-commands';
import { ExplorerContent } from '@/features/file-explorer/components/explorer-content/explorer-content';
import { ExplorerWindow } from '@/features/file-explorer/components/explorer-window/explorer-window';
import {
  type ExplorerWorkspace,
  formatDeletedDate,
  getExplorerLocationName,
  getExplorerLocationPath,
  getOriginalLocation,
} from '@/features/file-explorer/utils/explorer-location/explorer-location';
import type { Device } from '@/shared/hooks/use-device/use-device';
import { useWorkspaceStore } from '@/shared/stores/workspace-store/workspace-store';
import type { WindowFrameControls } from '@/shared/utils/window-rules/window-rules';
import {
  getChildItems,
  isRecycleBinFull,
  type PlacedItem,
  RECYCLE_BIN_ID,
  type WorkspaceItem,
} from '@/shared/utils/workspace-rules/workspace-rules';

type ExplorerWindowLayerProps = {
  /** 보고 있는 위치(폴더 id, 휴지통 id, 바탕화면은 null) */
  folderId: string | null;
  /** 창 층이 넘기는 창 동작 속성 */
  controls: WindowFrameControls;
  /** 화면 방식 */
  device: Device;
};

/**
 * 탐색기 창 하나를 작업 공간 저장소에 잇는 층이다. 보고 있는 위치의 이름(탭, 검색 안내 글자), 위치 칸, 항목,
 * 항목 개수를 저장소에서 읽어 탐색기 창 조립(`ExplorerWindow` + `ExplorerContent`)에 넘긴다.
 * 폴더는 항목을 보통 아이콘으로, 휴지통은 지운 항목을 자세히 보기(이름 · 원래 위치 · 삭제한 날짜)로 그린다.
 * 항목은 저장소 차례대로 그린다. 선택·이동·정렬·보기 바꾸기·탭은 탐색기 단계에서 붙인다.
 * @codocs [[파일 탐색기:구성]]
 * @codocs [[파일 탐색기:탭]]
 * @codocs [[파일 탐색기:휴지통 보기]]
 * @param props
 */
export function ExplorerWindowLayer(props: ExplorerWindowLayerProps): JSX.Element {
  const { folderId, controls, device } = props;
  const items = useWorkspaceStore((state) => state.items);
  const workspace = { items };
  const isRecycleBin = folderId === RECYCLE_BIN_ID;
  const locationName = getExplorerLocationName(workspace, folderId);
  const children = getChildItems(workspace, folderId).filter(
    (item): item is PlacedItem => item.kind !== 'recycle-bin',
  );
  const path = getExplorerLocationPath(workspace, folderId);
  const visiblePath = device === 'mobile' ? path.slice(-1) : path;
  return (
    <ExplorerWindow
      {...controls}
      device={device}
      tabs={[
        { title: locationName, selected: true, icon: renderLocationIcon(workspace, folderId) },
      ]}
    >
      <ExplorerContent
        device={device}
        className="min-h-0 w-full flex-1"
        locationIcon={renderLocationIcon(workspace, folderId)}
        searchPlaceholder={`${locationName} 검색`}
        path={visiblePath.map(
          /**
           * 위치 칸 하나를 그린다. 마지막 칸이 현재 위치다.
           * @param label 위치 이름
           * @param index 차례
           * @returns BreadcrumbItem
           */
          (label, index) => {
            const isCurrent = index === visiblePath.length - 1;
            return (
              <BreadcrumbItem
                // 위치 이름은 겹칠 수 있어(다른 위치의 같은 이름 폴더) 차례를 함께 쓴다.
                key={`${String(index)}-${label}`}
                label={label}
                current={isCurrent}
                showSeparator={!isCurrent}
                className="shrink-0"
              />
            );
          },
        )}
        commands={
          <ExplorerCommands device={device} location={isRecycleBin ? 'recycle-bin' : 'folder'} />
        }
        itemCount={`항목 ${String(children.length)}개`}
        showSelection={false}
      >
        {isRecycleBin
          ? renderRecycleBinDetails(workspace, children)
          : children.map(
              /**
               * 항목 하나를 보통 아이콘으로 그린다.
               * @param item 항목
               * @returns FileItem
               */
              (item) => (
                <FileItem
                  key={item.id}
                  surface="explorer"
                  view="medium"
                  name={item.name}
                  icon={renderItemIcon(item)}
                />
              ),
            )}
      </ExplorerContent>
    </ExplorerWindow>
  );
}

/**
 * 위치 아이콘(탭, 위치 칸). 휴지통은 찬·빈 모양, 그 밖은 폴더다.
 * @param workspace 작업 공간
 * @param folderId 위치
 * @returns 아이콘
 */
function renderLocationIcon(workspace: ExplorerWorkspace, folderId: string | null): ReactNode {
  if (folderId === RECYCLE_BIN_ID) {
    return (
      <ImageAsset
        name={
          isRecycleBinFull(workspace)
            ? 'images/file-recycle-bin-full'
            : 'images/file-recycle-bin-empty'
        }
        className="size-full object-contain"
      />
    );
  }
  return <ImageAsset name="images/file-folder" className="size-full object-contain" />;
}

/**
 * 항목 종류에 맞는 아이콘(file/Folder, file/Document, 외부 링크 설정의 아이콘).
 * @param item 항목
 * @returns 아이콘
 */
function renderItemIcon(item: WorkspaceItem): ReactNode {
  switch (item.kind) {
    case 'folder':
      return <ImageAsset name="images/file-folder" className="size-full object-contain" />;
    case 'post':
      return <ImageAsset name="images/file-document" className="size-full object-contain" />;
    case 'link':
      return <Asset name={item.icon} className="size-full" />;
    case 'recycle-bin':
      return (
        <ImageAsset name="images/file-recycle-bin-empty" className="size-full object-contain" />
      );
  }
}

/**
 * 휴지통의 지운 항목을 자세히 보기(이름 · 원래 위치 · 삭제한 날짜)로 그린다.
 * @codocs [[파일 탐색기:휴지통 보기]]
 * @param workspace 작업 공간
 * @param items 지운 항목
 * @returns 자세히 보기
 */
function renderRecycleBinDetails(
  workspace: ExplorerWorkspace,
  items: readonly PlacedItem[],
): ReactNode {
  return (
    <div className="flex w-full flex-col items-start">
      <DetailsHeader view="recycle-bin" />
      {items.map(
        /**
         * 지운 항목 한 줄을 그린다.
         * @param item 지운 항목
         * @returns FileRow
         */
        (item) => (
          <FileRow
            key={item.id}
            view="recycle-bin"
            name={item.name}
            originalLocation={getOriginalLocation(workspace, item)}
            deletedDate={formatDeletedDate(item.trash?.deletedAt ?? '')}
            icon={renderItemIcon(item)}
            className="w-full"
          />
        ),
      )}
    </div>
  );
}
