/**
 * Notion sync (.codex/notion/pipeline.md Implementation Direction 3번).
 *
 * Notion을 읽어 앱이 빌드에 쓰는 정적 산출물로 변환한다:
 *   수집(페이지네이션+재귀, <3rps) → 변경 감지(manifest의 last_edited_time)
 *   → 매핑(공식 응답 → ui NotionBlockNode, 리스트 그룹핑)
 *   → 이미지 자산화(만료형 file URL 다운로드 → 해시 명명 → src 교체)
 *   → apps/web/content/notion/{manifest.json, {category}/{slug}.json} 기록.
 *
 * 커밋은 실행 주체(로컬/CI)가 한다 — 변경이 없으면 산출물이 동일해 diff가 없다.
 * 실행: pnpm sync  /  필요 env(.env): NOTION_API_KEY, 카테고리별 NOTION_{대문자}_DATABASE_ID
 * 카테고리 목록은 apps/web/src/lib/contentCategories.ts(CATEGORY_CONFIG)가 단일 출처다.
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import type {
  BlockObjectResponse,
  PageObjectResponse,
  RichTextItemResponse,
} from "@notionhq/client";
import { Client, isFullBlock, isFullPage } from "@notionhq/client";

import type {
  NotionBlockNode,
  NotionColor,
  NotionListItem,
  NotionRichTextSpan,
} from "../packages/ui/src/components/notion/types";

import type { ContentCategory } from "../apps/web/src/lib/contentCategories";
import { CONTENT_CATEGORIES } from "../apps/web/src/lib/contentCategories";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CONTENT_DIR = path.join(ROOT, "apps", "web", "content", "notion");
const IMAGE_DIR = path.join(ROOT, "apps", "web", "public", "notion");
const IMAGE_PUBLIC_PREFIX = "/notion";

// ---- env / client ---------------------------------------------------------

const loadEnv = () => {
  let raw: string;
  try {
    raw = readFileSync(path.join(ROOT, ".env"), "utf8");
  } catch {
    return;
  }
  for (const line of raw.split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].trim();
    }
  }
};

loadEnv();

const API_KEY = process.env.NOTION_API_KEY;
if (!API_KEY) {
  console.error("NOTION_API_KEY가 없습니다 — 루트 .env를 확인하세요.");
  process.exit(1);
}

// 카테고리 단일 출처(apps/web/src/lib/contentCategories.ts) — 새 카테고리는 거기에만 추가하고
// NOTION_{대문자}_DATABASE_ID env를 채우면 된다
const CATEGORIES = CONTENT_CATEGORIES;
type Category = ContentCategory;

const DATABASES: Record<Category, string | undefined> = Object.fromEntries(
  CATEGORIES.map((category) => [
    category,
    process.env[`NOTION_${category.toUpperCase()}_DATABASE_ID`],
  ]),
) as Record<Category, string | undefined>;

const notion = new Client({ auth: API_KEY });

// ---- rate limit / retry (원본 error.ts의 withRetry 대응) -------------------

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

let apiCalls = 0;

const call = async <T,>(fn: () => Promise<T>, context: string, attempt = 1): Promise<T> => {
  await sleep(350); // 평균 3 req/s 미만 유지
  apiCalls += 1;
  try {
    return await fn();
  } catch (error) {
    const err = error as { code?: string; status?: number };
    const retriable = err.code === "rate_limited" || (err.status ?? 500) >= 500;
    if (retriable && attempt < 4) {
      console.warn(`retry(${attempt}) ${context} — ${err.code ?? err.status}`);
      await sleep(1000 * attempt);
      return call(fn, context, attempt + 1);
    }
    throw new Error(`${context} 실패`, { cause: error });
  }
};

// ---- manifest / 산출물 타입 -------------------------------------------------

interface ManifestEntry {
  cover: string | null;
  date: string;
  id: string;
  lastEditedTime: string;
  slug: string;
  summary: string;
  tags: { color: string; name: string }[];
  title: string;
}

interface Manifest {
  categories: Record<Category, ManifestEntry[]>;
  generatedAt: string;
}

interface ContentDetail extends ManifestEntry {
  blocks: NotionBlockNode[];
}

const loadPreviousManifest = (): Manifest | null => {
  try {
    return JSON.parse(readFileSync(path.join(CONTENT_DIR, "manifest.json"), "utf8")) as Manifest;
  } catch {
    return null;
  }
};

const detailPath = (category: Category, slug: string) =>
  path.join(CONTENT_DIR, category, `${slug}.json`);

const writeJson = (filePath: string, value: unknown) => {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
};

// ---- 페이지 메타 파싱 --------------------------------------------------------

/** 원본 generateSlug 이식 — Slug 속성이 없을 때의 fallback (기존 URL 유지) */
const generateSlug = (title: string): string =>
  title
    .toLowerCase()
    .trim()
    .replace(/[^가-힣a-z0-9\s]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "") || title;

const plainText = (richText: RichTextItemResponse[] = []): string =>
  richText.map((item) => item.plain_text).join("");

type PageProperty = PageObjectResponse["properties"][string];

const propertyOf = (page: PageObjectResponse, name: string): PageProperty | undefined =>
  page.properties[name];

const parseEntry = async (page: PageObjectResponse, assetize: Assetize): Promise<ManifestEntry> => {
  let title = "(제목 없음)";
  for (const property of Object.values(page.properties)) {
    if (property.type === "title") {
      title = plainText(property.title) || title;
      break;
    }
  }

  // 명시적 Slug 속성이 있으면 우선한다 (pipeline.md 결정 4) — 없으면 제목 파생 fallback
  const slugProperty = propertyOf(page, "Slug");
  const explicitSlug =
    slugProperty?.type === "rich_text" ? plainText(slugProperty.rich_text).trim() : "";
  const slug = explicitSlug || generateSlug(title);

  const dateProperty = propertyOf(page, "Date");
  const date =
    (dateProperty?.type === "date" ? dateProperty.date?.start : undefined) ??
    page.created_time.slice(0, 10);

  const summaryProperty = propertyOf(page, "Summary");
  const summary = summaryProperty?.type === "rich_text" ? plainText(summaryProperty.rich_text) : "";

  const tagsProperty = propertyOf(page, "Tags");
  const tags =
    tagsProperty?.type === "multi_select"
      ? tagsProperty.multi_select.map((tag) => ({ color: tag.color, name: tag.name }))
      : [];

  let cover: string | null = null;
  if (page.cover?.type === "external") {
    cover = page.cover.external.url;
  } else if (page.cover?.type === "file") {
    cover = await assetize(page.cover.file.url, `${title} (cover)`);
  }

  return { cover, date, id: page.id, lastEditedTime: page.last_edited_time, slug, summary, tags, title };
};

// ---- 블록 트리 수집 ----------------------------------------------------------

interface RawTree {
  block: BlockObjectResponse;
  children: RawTree[];
}

const fetchTree = async (blockId: string, label: string): Promise<RawTree[]> => {
  const trees: RawTree[] = [];
  let cursor: string | undefined;

  do {
    const response = await call(
      () => notion.blocks.children.list({ block_id: blockId, start_cursor: cursor }),
      `blocks(${label})`,
    );
    for (const block of response.results) {
      if (!isFullBlock(block)) {
        continue;
      }
      const children =
        block.has_children && block.type !== "child_page" && block.type !== "child_database"
          ? await fetchTree(block.id, label)
          : [];
      trees.push({ block, children });
    }
    cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined;
  } while (cursor);

  return trees;
};

// ---- 이미지 자산화 -----------------------------------------------------------

type Assetize = (url: string, label: string) => Promise<string>;

const IMAGE_EXTENSIONS = new Set([".avif", ".gif", ".jpeg", ".jpg", ".png", ".svg", ".webp"]);

const createAssetizer = (): Assetize => {
  const cache = new Map<string, string>();

  return async (url, label) => {
    const cached = cache.get(url);
    if (cached) {
      return cached;
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`이미지 다운로드 실패(${response.status}): ${label}`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());

    const urlExtension = path.extname(new URL(url).pathname).toLowerCase();
    const extension = IMAGE_EXTENSIONS.has(urlExtension) ? urlExtension : ".png";
    const hash = createHash("sha256").update(buffer).digest("hex").slice(0, 16);
    const fileName = `${hash}${extension}`;

    const filePath = path.join(IMAGE_DIR, fileName);
    if (!existsSync(filePath)) {
      mkdirSync(IMAGE_DIR, { recursive: true });
      writeFileSync(filePath, buffer);
    }

    const publicPath = `${IMAGE_PUBLIC_PREFIX}/${fileName}`;
    cache.set(url, publicPath);
    console.log(`    ↓ 이미지 자산화: ${fileName} (${label})`);
    return publicPath;
  };
};

// ---- 공식 응답 → ui 블록 트리 매핑 -------------------------------------------

const toSpans = (richText: RichTextItemResponse[]): NotionRichTextSpan[] =>
  richText.map((item) => {
    const span: NotionRichTextSpan = { text: item.plain_text };
    const { annotations } = item;
    const flags: NonNullable<NotionRichTextSpan["annotations"]> = {};
    if (annotations.bold) flags.bold = true;
    if (annotations.italic) flags.italic = true;
    if (annotations.strikethrough) flags.strikethrough = true;
    if (annotations.underline) flags.underline = true;
    if (annotations.code) flags.code = true;
    if (Object.keys(flags).length > 0) {
      span.annotations = flags;
    }
    if (annotations.color !== "default") {
      span.color = annotations.color as NotionColor;
    }
    if (item.href) {
      span.href = item.href;
    }
    return span;
  });

const toColor = (color: string): NotionColor | undefined =>
  color === "default" ? undefined : (color as NotionColor);

interface MapContext {
  assetize: Assetize;
  label: string;
  warn: (message: string) => void;
}

/** 리스트 항목 중간 표현 — groupMapped가 연속 항목을 하나의 리스트 노드로 합친다 */
interface ListItemMarker {
  item: NotionListItem;
  listKind: "bulleted" | "numbered";
}

type Mapped = ListItemMarker | NotionBlockNode | null;

type BlockType = BlockObjectResponse["type"];
type BlockOf<T extends BlockType> = Extract<BlockObjectResponse, { type: T }>;
type Handler<T extends BlockType> = (
  block: BlockOf<T>,
  tree: RawTree,
  ctx: MapContext,
) => Promise<Mapped>;

/**
 * 공식 블록 타입 전수 매핑 테이블 (pipeline.md 결정 2의 exhaustiveness 보증).
 * SDK 업데이트로 블록 타입이 늘어나면 이 Record가 컴파일 에러로 알려준다.
 * "unsupported"는 경고 후 스킵, "consumed"는 부모 블록이 처리(table_row, column).
 */
const HANDLERS: { [T in BlockType]: Handler<T> | "consumed" | "unsupported" } = {
  audio: "unsupported",
  bookmark: "unsupported",
  breadcrumb: "unsupported",
  bulleted_list_item: async (block, tree, ctx) => ({
    item: await toListItem(block.bulleted_list_item.rich_text, tree, ctx),
    listKind: "bulleted",
  }),
  callout: async (block, tree, ctx) => ({
    type: "callout",
    ...(block.callout.icon?.type === "emoji" ? { icon: block.callout.icon.emoji } : {}),
    ...withColor(block.callout.color),
    richText: toSpans(block.callout.rich_text),
    ...(await withChildren(tree, ctx)),
  }),
  child_database: "unsupported",
  child_page: "unsupported",
  code: async (block) => ({
    type: "code",
    ...(plainText(block.code.caption) ? { caption: plainText(block.code.caption) } : {}),
    code: plainText(block.code.rich_text),
    language: block.code.language,
  }),
  column: "consumed",
  column_list: async (_block, tree, ctx) => ({
    type: "columnList",
    columns: await Promise.all(
      tree.children
        .filter((child) => child.block.type === "column")
        .map((child) => mapTrees(child.children, ctx)),
    ),
  }),
  divider: async () => ({ type: "divider" }),
  embed: "unsupported",
  equation: async (block) => ({ type: "equation", expression: block.equation.expression }),
  file: "unsupported",
  heading_1: async (block, tree, ctx) => toHeading(1, block.heading_1, tree, ctx),
  heading_2: async (block, tree, ctx) => toHeading(2, block.heading_2, tree, ctx),
  heading_3: async (block, tree, ctx) => toHeading(3, block.heading_3, tree, ctx),
  heading_4: "unsupported",
  image: async (block, _tree, ctx) => {
    const caption = toSpans(block.image.caption);
    const src =
      block.image.type === "file"
        ? await ctx.assetize(block.image.file.url, ctx.label)
        : block.image.external.url;
    return {
      type: "image",
      ...(plainText(block.image.caption) ? { alt: plainText(block.image.caption) } : {}),
      ...(caption.length > 0 ? { caption } : {}),
      src,
    };
  },
  link_preview: "unsupported",
  link_to_page: "unsupported",
  meeting_notes: "unsupported",
  numbered_list_item: async (block, tree, ctx) => ({
    item: await toListItem(block.numbered_list_item.rich_text, tree, ctx),
    listKind: "numbered",
  }),
  paragraph: async (block, tree, ctx) => ({
    type: "paragraph",
    ...withColor(block.paragraph.color),
    richText: toSpans(block.paragraph.rich_text),
    ...(await withChildren(tree, ctx)),
  }),
  pdf: "unsupported",
  quote: async (block, tree, ctx) => ({
    type: "quote",
    ...withColor(block.quote.color),
    richText: toSpans(block.quote.rich_text),
    ...(await withChildren(tree, ctx)),
  }),
  synced_block: "unsupported",
  tab: "unsupported",
  table: async (block, tree) => ({
    type: "table",
    ...(block.table.has_column_header ? { hasColumnHeader: true } : {}),
    ...(block.table.has_row_header ? { hasRowHeader: true } : {}),
    rows: tree.children
      .filter((child): child is RawTree & { block: BlockOf<"table_row"> } => child.block.type === "table_row")
      .map((child) => child.block.table_row.cells.map((cell) => toSpans(cell))),
  }),
  table_of_contents: "unsupported",
  table_row: "consumed",
  template: "unsupported",
  to_do: "unsupported",
  toggle: async (block, tree, ctx) => ({
    type: "toggle",
    ...withColor(block.toggle.color),
    richText: toSpans(block.toggle.rich_text),
    ...(await withChildren(tree, ctx)),
  }),
  transcription: "unsupported",
  unsupported: "unsupported",
  video: "unsupported",
};


const withColor = (color: string): { color?: NotionColor } => {
  const mapped = toColor(color);
  return mapped ? { color: mapped } : {};
};

const withChildren = async (
  tree: RawTree,
  ctx: MapContext,
): Promise<{ children?: NotionBlockNode[] }> => {
  if (tree.children.length === 0) {
    return {};
  }
  return { children: await mapTrees(tree.children, ctx) };
};

const toListItem = async (
  richText: RichTextItemResponse[],
  tree: RawTree,
  ctx: MapContext,
): Promise<NotionListItem> => ({
  richText: toSpans(richText),
  ...(await withChildren(tree, ctx)),
});

const toHeading = async (
  level: 1 | 2 | 3,
  payload: { color: string; rich_text: RichTextItemResponse[] },
  tree: RawTree,
  ctx: MapContext,
): Promise<Mapped> => {
  if (tree.children.length > 0) {
    // toggleable heading의 자식은 ui 타입에 없다 — 소실을 경고로 드러낸다
    ctx.warn(`heading_${level}의 자식 블록 ${tree.children.length}개 미지원(소실)`);
  }
  return {
    type: "heading",
    ...withColor(payload.color),
    level,
    richText: toSpans(payload.rich_text),
  };
};

const mapOne = async (tree: RawTree, ctx: MapContext): Promise<Mapped> => {
  const entry = HANDLERS[tree.block.type];
  if (entry === "consumed") {
    return null;
  }
  if (entry === "unsupported") {
    ctx.warn(`미지원 블록 스킵: ${tree.block.type}`);
    return null;
  }
  return (entry as Handler<BlockType>)(tree.block as never, tree, ctx);
};

/** 연속된 리스트 항목을 하나의 bulletedList/numberedList 노드로 그룹핑 */
const groupMapped = (mapped: Mapped[]): NotionBlockNode[] => {
  const out: NotionBlockNode[] = [];
  let current: { items: NotionListItem[]; listKind: "bulleted" | "numbered" } | null = null;

  const flush = () => {
    if (current) {
      out.push({
        type: current.listKind === "bulleted" ? "bulletedList" : "numberedList",
        items: current.items,
      });
      current = null;
    }
  };

  for (const node of mapped) {
    if (node === null) {
      continue;
    }
    if ("listKind" in node) {
      if (current === null || current.listKind !== node.listKind) {
        flush();
        current = { items: [node.item], listKind: node.listKind };
      } else {
        current.items.push(node.item);
      }
      continue;
    }
    flush();
    out.push(node);
  }
  flush();

  return out;
};

const mapTrees = async (trees: RawTree[], ctx: MapContext): Promise<NotionBlockNode[]> => {
  const mapped: Mapped[] = [];
  for (const tree of trees) {
    mapped.push(await mapOne(tree, ctx));
  }
  return groupMapped(mapped);
};

// ---- main -------------------------------------------------------------------

const main = async () => {
  const previous = loadPreviousManifest();
  const assetize = createAssetizer();
  const warnings: string[] = [];
  const manifest: Manifest = {
    categories: Object.fromEntries(
      CATEGORIES.map((category): [Category, ManifestEntry[]] => [category, []]),
    ) as Record<Category, ManifestEntry[]>,
    generatedAt: new Date().toISOString(),
  };
  let synced = 0;
  let skipped = 0;

  for (const category of CATEGORIES) {
    const dataSourceId = DATABASES[category];
    if (!dataSourceId) {
      console.warn(`${category}: database id 없음 — 건너뜀`);
      continue;
    }

    const pages: PageObjectResponse[] = [];
    let cursor: string | undefined;
    do {
      const response = await call(
        () => notion.dataSources.query({ data_source_id: dataSourceId, start_cursor: cursor }),
        `query(${category})`,
      );
      for (const page of response.results) {
        if (isFullPage(page)) {
          pages.push(page);
        }
      }
      cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined;
    } while (cursor);

    console.log(`${category}: ${pages.length}페이지`);

    for (const page of pages) {
      const previousEntry = previous?.categories[category]?.find((entry) => entry.id === page.id);
      const unchanged =
        previousEntry !== undefined &&
        previousEntry.lastEditedTime === page.last_edited_time &&
        existsSync(detailPath(category, previousEntry.slug));

      if (unchanged) {
        manifest.categories[category].push(previousEntry);
        skipped += 1;
        console.log(`  · 스킵(변경 없음): ${previousEntry.title}`);
        continue;
      }

      const entry = await parseEntry(page, assetize);
      const label = `${category}/${entry.slug}`;
      console.log(`  ✓ 동기화: ${entry.title}`);

      const ctx: MapContext = {
        assetize,
        label,
        warn: (message) => warnings.push(`${label}: ${message}`),
      };
      const trees = await fetchTree(page.id, label);
      const blocks = await mapTrees(trees, ctx);

      const detail: ContentDetail = { ...entry, blocks };
      writeJson(detailPath(category, entry.slug), detail);
      manifest.categories[category].push(entry);
      synced += 1;
    }

    // 날짜 내림차순 정렬 + slug 중복 경고 + 삭제/개명된 글의 산출물 정리
    manifest.categories[category].sort((a, b) => b.date.localeCompare(a.date));

    const slugs = new Set(manifest.categories[category].map((entry) => entry.slug));
    if (slugs.size !== manifest.categories[category].length) {
      warnings.push(`${category}: slug 중복 — Notion에 명시적 Slug 속성 지정 필요`);
    }
    const categoryDir = path.join(CONTENT_DIR, category);
    if (existsSync(categoryDir)) {
      for (const file of readdirSync(categoryDir)) {
        const slug = file.replace(/\.json$/, "");
        if (!slugs.has(slug)) {
          rmSync(path.join(categoryDir, file));
          console.log(`  - 정리(삭제/개명): ${category}/${file}`);
        }
      }
    }
  }

  writeJson(path.join(CONTENT_DIR, "manifest.json"), manifest);

  console.log(`\n완료 — 동기화 ${synced} · 스킵 ${skipped} · API 호출 ${apiCalls}회`);
  if (warnings.length > 0) {
    console.warn(`경고 ${warnings.length}건:`);
    for (const warning of warnings) {
      console.warn(`  ! ${warning}`);
    }
  }
};

await main();
