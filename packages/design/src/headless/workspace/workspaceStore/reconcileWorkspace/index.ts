/**
 * @file 저장된 Workspace를 현재 Resource 집합에 맞춰 결정적으로 복구한다.
 *
 * snapshot 저장과 초기 seed 생성은 이 파일의 책임이 아니다.
 */
import type {
  ContentResourceRef,
  Folder,
  FolderResourceRef,
  ResourceId,
  ResourceLookup,
} from "../../../resources/index.js";
import { IdGenerator } from "../../idGenerator/index.js";
import type { ResourcePlacement, WorkspaceState } from "../../model/index.js";

/**
 * 저장된 Workspace를 현재 Content와 Resource 존재 상태에 맞춰 복구하기 위한 입력이다.
 *
 * 구체 Catalog와 storage 구현은 포함하지 않으며, 존재 확인은 port를 사용하고 ID는 내부 공통 발급기를 사용한다.
 */
export type ReconcileWorkspaceInput = Readonly<{
  state: WorkspaceState;
  currentContent: readonly ContentResourceRef[];
  resourceLookup: ResourceLookup;
}>;

/**
 * 같은 ID의 Folder 원본 중 입력 순서상 첫 항목만 보존한다.
 */
const deduplicateFolders = (folders: readonly Folder[]): Folder[] => {
  const seen = new Set<ResourceId>();

  return folders.filter(({ ref }) => {
    if (seen.has(ref.id)) {
      return false;
    }

    seen.add(ref.id);
    return true;
  });
};

/**
 * Folder ID 정렬 순서로 parent 경로를 탐색해 순환을 만드는 연결을 Desktop으로 끊는다.
 *
 * 입력 배열은 수정하지 않으며, 동일한 parent graph에는 같은 연결 해제 순서를 사용한다.
 */
const breakFolderCycles = (placements: readonly ResourcePlacement[]): ResourcePlacement[] => {
  const parentByFolderId = new Map<ResourceId, FolderResourceRef | null>();

  for (const placement of placements) {
    if (placement.resource.kind === "folder") {
      parentByFolderId.set(placement.resource.id, placement.parent);
    }
  }

  const colors = new Map<ResourceId, "active" | "done">();
  const brokenFolderIds = new Set<ResourceId>();

  /**
   * 현재 탐색 경로(active)로 돌아가는 parent 연결을 기록하고 해당 경로의 탐색을 완료한다.
   *
   * 완료된 경로(done)는 재탐색하지 않으며, 실제 placement 변경은 순회가 끝난 뒤 적용한다.
   */
  const visit = (folderId: ResourceId): void => {
    if (colors.has(folderId)) {
      return;
    }

    colors.set(folderId, "active");
    const parent = parentByFolderId.get(folderId) ?? null;

    if (parent !== null) {
      const parentColor = colors.get(parent.id);

      if (parentColor === "active") {
        parentByFolderId.set(folderId, null);
        brokenFolderIds.add(folderId);
      } else if (parentColor !== "done") {
        visit(parent.id);
      }
    }

    colors.set(folderId, "done");
  };

  [...parentByFolderId.keys()].sort().forEach(visit);

  if (brokenFolderIds.size === 0) {
    return [...placements];
  }

  return placements.map((placement) =>
    placement.resource.kind === "folder" && brokenFolderIds.has(placement.resource.id)
      ? { ...placement, parent: null }
      : placement,
  );
};

/**
 * 복구용 ID가 Folder, placement 또는 현재 Content ID와 충돌하면 오류를 던진다.
 *
 * 입력에 없는 정적 Resource까지 조회하는 전역 Catalog 검증은 아니다.
 */
const assertGeneratedIdIsUnique = (
  id: ResourceId,
  folders: readonly Folder[],
  placements: readonly ResourcePlacement[],
  currentContent: readonly ContentResourceRef[],
): void => {
  if (
    folders.some((folder) => folder.ref.id === id) ||
    placements.some((placement) => placement.resource.id === id) ||
    currentContent.some((content) => content.id === id)
  ) {
    throw new Error(`IdGenerator가 이미 사용 중인 ResourceId를 반환했습니다: ${id}`);
  }
};

/**
 * 유효한 사용자 배치를 보존하면서 저장된 Workspace의 stale 참조와 graph 손상을 복구한다.
 *
 * seed 기본값을 다시 적용하지 않으며, 중복은 첫 placement를 유지하고 누락 항목은
 * Folder, 복구된 inbox, 현재 Content 순서로 추가한다.
 */
export const reconcileWorkspace = ({
  state,
  currentContent,
  resourceLookup,
}: ReconcileWorkspaceInput): WorkspaceState => {
  const folders = deduplicateFolders(state.folders);
  const folderIds = new Set(folders.map((folder) => folder.ref.id));
  const seenResourceIds = new Set<ResourceId>();

  let placements = state.placements.flatMap((placement) => {
    const { resource } = placement;

    if (seenResourceIds.has(resource.id)) {
      return [];
    }

    if (resource.kind === "folder") {
      if (!folderIds.has(resource.id)) {
        return [];
      }
    } else if (!resourceLookup.hasResource(resource)) {
      return [];
    }

    seenResourceIds.add(resource.id);

    const parent =
      placement.parent === null || folderIds.has(placement.parent.id) ? placement.parent : null;

    return [{ ...placement, parent: parent?.id === resource.id ? null : parent }];
  });

  for (const folder of folders) {
    if (!seenResourceIds.has(folder.ref.id)) {
      seenResourceIds.add(folder.ref.id);
      placements.push({ resource: folder.ref, parent: null });
    }
  }

  placements = breakFolderCycles(placements);

  let contentInbox = state.contentInbox;
  if (!folderIds.has(contentInbox.id)) {
    const id = IdGenerator.generateId();
    assertGeneratedIdIsUnique(id, folders, placements, currentContent);

    contentInbox = { kind: "folder", id };
    folders.push({ ref: contentInbox, name: "Blog" });
    folderIds.add(id);
    seenResourceIds.add(id);
    placements.push({ resource: contentInbox, parent: null });
  }

  for (const content of currentContent) {
    if (!seenResourceIds.has(content.id) && resourceLookup.hasResource(content)) {
      seenResourceIds.add(content.id);
      placements.push({ resource: content, parent: contentInbox });
    }
  }

  return {
    schemaVersion: 1,
    contentInbox,
    folders,
    placements,
  };
};
