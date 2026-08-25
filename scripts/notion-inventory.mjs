/**
 * Notion 블록 타입 인벤토리.
 *
 * 3개 DB(blog/project/about)의 전체 페이지를 순회하며 블록을 재귀 수집해
 * "실제로 쓰는 Notion 기능"을 집계한다. Markdown 결과는 stdout으로 출력하며,
 * Local Work Memory의 revision-pinned Notion 블록 인벤토리를 갱신하는 근거로 사용한다.
 *
 * 실행: node scripts/notion-inventory.mjs
 * 필요 env(.env): NOTION_API_KEY, NOTION_{BLOG,PROJECT,ABOUT}_DATABASE_ID
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { Client, isFullBlock } from "@notionhq/client";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// ---- env ----------------------------------------------------------------

const loadEnv = () => {
  let raw;
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

const DATABASES = {
  blog: process.env.NOTION_BLOG_DATABASE_ID,
  project: process.env.NOTION_PROJECT_DATABASE_ID,
  about: process.env.NOTION_ABOUT_DATABASE_ID,
};

const notion = new Client({ auth: API_KEY });

// ---- rate limit / retry (원본 error.ts의 withRetry 대응, 3rps 준수) -------

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let requestCount = 0;

const call = async (fn, context, attempt = 1) => {
  await sleep(350); // 평균 3 req/s 미만 유지
  requestCount += 1;
  try {
    return await fn();
  } catch (error) {
    const retriable = error?.code === "rate_limited" || (error?.status ?? 500) >= 500;
    if (retriable && attempt < 4) {
      const delay = 1000 * attempt;
      console.warn(`retry(${attempt}) ${context} — ${error?.code ?? error?.status}`);
      await sleep(delay);
      return call(fn, context, attempt + 1);
    }
    throw new Error(`${context} 실패: ${error?.code ?? error?.message}`, { cause: error });
  }
};

// ---- 집계 상태 ------------------------------------------------------------

/** ui v1 블록 union이 커버하는 공식 블록 타입 (table_row/column은 부모의 일부) */
const V1_SUPPORTED = new Set([
  "paragraph",
  "heading_1",
  "heading_2",
  "heading_3",
  "bulleted_list_item",
  "numbered_list_item",
  "quote",
  "callout",
  "toggle",
  "code",
  "image",
  "table",
  "table_row",
  "column_list",
  "column",
  "equation",
  "divider",
]);

const counter = () => new Map();
const bump = (map, key, by = 1) => map.set(key, (map.get(key) ?? 0) + by);

const stats = {
  annotations: counter(),
  blockColors: counter(),
  blocks: counter(),
  codeLanguages: counter(),
  databases: {},
  images: counter(),
  links: 0,
  maxDepth: 0,
  richTextColors: counter(),
  richTextTypes: counter(),
  tables: [],
  unsupported: [],
};

// ---- 수집 -----------------------------------------------------------------

const collectRichText = (richTextArray = []) => {
  for (const item of richTextArray) {
    bump(stats.richTextTypes, item.type);
    const { annotations } = item;
    if (annotations) {
      for (const key of ["bold", "italic", "strikethrough", "underline", "code"]) {
        if (annotations[key]) {
          bump(stats.annotations, key);
        }
      }
      if (annotations.color && annotations.color !== "default") {
        bump(stats.richTextColors, annotations.color);
      }
    }
    if (item.href) {
      stats.links += 1;
    }
  }
};

const walkBlocks = async (blockId, pageTitle, depth) => {
  stats.maxDepth = Math.max(stats.maxDepth, depth);
  let cursor;

  do {
    const response = await call(
      () => notion.blocks.children.list({ block_id: blockId, start_cursor: cursor }),
      `blocks(${pageTitle})`,
    );

    for (const block of response.results) {
      if (!isFullBlock(block)) {
        continue;
      }
      const { type } = block;
      bump(stats.blocks, type);

      if (!V1_SUPPORTED.has(type)) {
        stats.unsupported.push({ page: pageTitle, type });
      }

      const payload = block[type];
      if (payload && typeof payload === "object") {
        if (Array.isArray(payload.rich_text)) {
          collectRichText(payload.rich_text);
        }
        if (Array.isArray(payload.caption)) {
          collectRichText(payload.caption);
        }
        if (payload.color && payload.color !== "default") {
          bump(stats.blockColors, `${type}:${payload.color}`);
        }
      }

      if (type === "code") {
        bump(stats.codeLanguages, block.code.language);
      }
      if (type === "image") {
        bump(stats.images, block.image.type); // file(만료형) vs external
      }
      if (type === "table") {
        stats.tables.push({ page: pageTitle, width: block.table.table_width });
      }
      if (type === "table_row") {
        for (const cell of block.table_row.cells) {
          collectRichText(cell);
        }
      }

      // child_page/child_database는 별개 문서 — 본문 재귀에서 제외
      if (block.has_children && type !== "child_page" && type !== "child_database") {
        await walkBlocks(block.id, pageTitle, depth + 1);
      }
    }

    cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined;
  } while (cursor);
};

const pageTitleOf = (page) => {
  for (const property of Object.values(page.properties ?? {})) {
    if (property.type === "title") {
      return property.title[0]?.plain_text ?? "(제목 없음)";
    }
  }
  return "(제목 없음)";
};

const collectDatabase = async (category, dataSourceId) => {
  if (!dataSourceId) {
    console.warn(`${category}: database id 없음 — 건너뜀`);
    return;
  }
  const pages = [];
  let cursor;

  do {
    const response = await call(
      () => notion.dataSources.query({ data_source_id: dataSourceId, start_cursor: cursor }),
      `query(${category})`,
    );
    pages.push(...response.results);
    cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined;
  } while (cursor);

  stats.databases[category] = { pageCount: pages.length, titles: pages.map(pageTitleOf) };
  console.error(`${category}: ${pages.length}페이지`);

  for (const page of pages) {
    const title = pageTitleOf(page);
    console.error(`  · ${title}`);
    await walkBlocks(page.id, `${category}/${title}`, 1);
  }
};

// ---- 리포트 ---------------------------------------------------------------

const mapToRows = (map) =>
  [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([key, count]) => `| \`${key}\` | ${count} |`)
    .join("\n");

const buildReport = () => {
  const dbRows = Object.entries(stats.databases)
    .map(([category, db]) => `| ${category} | ${db.pageCount} |`)
    .join("\n");

  const blockRows = [...stats.blocks.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(
      ([type, count]) =>
        `| \`${type}\` | ${count} | ${V1_SUPPORTED.has(type) ? "✅" : "❌ 미지원"} |`,
    )
    .join("\n");

  const unsupportedSection =
    stats.unsupported.length === 0
      ? "없음 — v1 union이 실사용 블록을 전부 커버한다."
      : [...new Set(stats.unsupported.map((entry) => `- \`${entry.type}\` — ${entry.page}`))].join(
          "\n",
        );

  const tableSummary =
    stats.tables.length === 0
      ? "없음"
      : `${stats.tables.length}개 (최대 ${Math.max(...stats.tables.map((table) => table.width))}열)`;

  return `# Notion 블록 인벤토리

생성: ${new Date().toISOString().slice(0, 10)} · \`scripts/notion-inventory.mjs\` · API 호출 ${requestCount}회

ui 블록 union(v1)의 검증 근거. 재실행하면 갱신된다.

## 페이지 수

| DB | 페이지 |
| --- | --- |
${dbRows}

## 블록 타입 (v1 지원 여부)

| 타입 | 개수 | v1 |
| --- | --- | --- |
${blockRows}

- 최대 중첩 깊이: ${stats.maxDepth}
- 표: ${tableSummary}

## v1 미지원 블록 발생 위치

${unsupportedSection}

## 코드 언어

| 언어 | 개수 |
| --- | --- |
${mapToRows(stats.codeLanguages) || "| (없음) | - |"}

## rich text

| annotation | 개수 |
| --- | --- |
${mapToRows(stats.annotations) || "| (없음) | - |"}

| 텍스트 색 | 개수 |
| --- | --- |
${mapToRows(stats.richTextColors) || "| (없음) | - |"}

| rich text 타입 | 개수 |
| --- | --- |
${mapToRows(stats.richTextTypes) || "| (없음) | - |"}

- 링크: ${stats.links}개

## 블록 색

| 블록:색 | 개수 |
| --- | --- |
${mapToRows(stats.blockColors) || "| (없음) | - |"}

## 이미지 (자산화 대상 규모)

| 타입 | 개수 |
| --- | --- |
${mapToRows(stats.images) || "| (없음) | - |"}

- \`file\` = Notion 서명 URL(1시간 만료 — sync 자산화 대상), \`external\` = 외부 URL(기존 GitHub 수동 업로드분)
`;
};

// ---- main -----------------------------------------------------------------

for (const [category, id] of Object.entries(DATABASES)) {
  await collectDatabase(category, id);
}

const report = buildReport();
process.stdout.write(report);
console.error(`\n리포트 생성 완료 (API 호출 ${requestCount}회)`);
