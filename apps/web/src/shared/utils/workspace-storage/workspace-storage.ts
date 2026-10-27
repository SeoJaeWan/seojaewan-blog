// 브라우저(localStorage)에 저장한 작업 공간을 검증하고 되살린다. 저장소(`workspace-store.ts`)의 `persist`가 부른다.

import { z } from 'zod';

import {
  createInitialWorkspace,
  DESKTOP_ICON_SIZES,
  DESKTOP_SORT_KEYS,
  EXPLORER_SORT_KEYS,
  EXPLORER_VIEWS,
  reconcileWorkspace,
  type SavedWorkspaceShape,
  SORT_DIRECTIONS,
  START_ALL_VIEWS,
  WINDOW_APPS,
  type WorkspaceCatalog,
  type WorkspaceState,
} from '@/shared/utils/workspace-rules/workspace-rules';

/** localStorage 열쇠 */
export const WORKSPACE_STORAGE_KEY = 'seojaewan-blog:workspace';

/** 저장 형태의 버전. 모양을 바꾸면 올린다. 버전이 다른 저장분은 버리고 초기 구조에서 다시 시작한다 */
export const WORKSPACE_STORAGE_VERSION = 1;

const trashSchema = z
  .object({ originalParentId: z.string().nullable(), deletedAt: z.string() })
  .nullable();

const savedItemSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('folder'),
    name: z.string(),
    parentId: z.string().nullable(),
    trash: trashSchema,
    date: z.string().nullable(),
  }),
  z.object({
    kind: z.enum(['post', 'link']),
    parentId: z.string().nullable(),
    trash: trashSchema,
  }),
]);

const gridCellSchema = z.object({ column: z.int().nonnegative(), row: z.int().nonnegative() });

/**
 * 저장된 작업 공간의 스키마. 방문자 브라우저의 값은 손댈 수 있고 예전 모양일 수 있어 단언하지 않고 검증한다.
 * @codocs [[작업 공간:방문자별 저장]]
 * @codocs [[코드 작성 규칙:타입]]
 */
export const savedWorkspaceSchema = z.object({
  items: z.record(z.string(), savedItemSchema),
  desktop: z.object({
    iconSize: z.enum(DESKTOP_ICON_SIZES),
    autoArrange: z.boolean(),
    sortBy: z.enum(DESKTOP_SORT_KEYS),
    positions: z.record(z.string(), gridCellSchema),
  }),
  startPins: z.array(z.string()),
  startAllView: z.enum(START_ALL_VIEWS),
  taskbarPins: z.array(z.enum(WINDOW_APPS)),
  explorerViews: z.record(
    z.string(),
    z.object({
      view: z.enum(EXPLORER_VIEWS),
      sortBy: z.enum(EXPLORER_SORT_KEYS),
      sortDirection: z.enum(SORT_DIRECTIONS),
    }),
  ),
  recentItemIds: z.array(z.string()),
}) satisfies z.ZodType<SavedWorkspaceShape>;

/**
 * 저장분을 되살린다. 스키마에 맞으면 지금 글 색인·외부 링크 설정과 맞추고(`reconcileWorkspace`),
 * 없거나 맞지 않아 읽을 수 없으면 초기 구조에서 다시 시작한다.
 * @codocs [[작업 공간:Notion과 맞추기]]
 * @codocs [[작업 공간:초기 구조]]
 * @param saved 저장분(검증 전)
 * @param catalog 글 색인과 외부 링크 설정
 * @returns 작업 공간 상태
 */
export function restoreWorkspace(saved: unknown, catalog: WorkspaceCatalog): WorkspaceState {
  const parsed = savedWorkspaceSchema.safeParse(saved);
  return parsed.success
    ? reconcileWorkspace(parsed.data, catalog)
    : createInitialWorkspace(catalog);
}
