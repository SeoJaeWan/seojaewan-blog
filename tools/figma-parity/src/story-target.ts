/**
 * Storybook index.json에서 스토리 항목을 읽는다. 모션 검사가 모션 스토리를 찾는 데 쓴다.
 */

/** Storybook index.json의 스토리 항목 */
export type IndexEntry = { id: string; title: string; name: string; importPath: string };

/**
 * index.json에서 스토리 항목(문서 항목 제외)을 꺼낸다.
 * @param index index.json을 파싱한 값
 * @returns 스토리 항목
 */
export function storyEntries(index: unknown): IndexEntry[] {
  const entries: unknown =
    typeof index === 'object' && index !== null ? Reflect.get(index, 'entries') : undefined;
  if (typeof entries !== 'object' || entries === null) {
    return [];
  }
  return Object.values(entries).flatMap(
    /**
     * 항목이 스토리면 필요한 칸만 꺼낸다.
     * @param entry index.json 항목
     * @returns 스토리 항목 하나나 빈 목록
     */
    (entry: unknown): IndexEntry[] => {
      if (typeof entry !== 'object' || entry === null) {
        return [];
      }
      const [id, title, name, importPath, type] = ['id', 'title', 'name', 'importPath', 'type'].map(
        (key): unknown => Reflect.get(entry, key),
      );
      return typeof id === 'string' &&
        typeof title === 'string' &&
        typeof name === 'string' &&
        typeof importPath === 'string' &&
        type === 'story'
        ? [{ id, title, name, importPath }]
        : [];
    },
  );
}
