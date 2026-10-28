// 피그마 캔버스에 놓인 노드를 사람이 읽는 순서로 정렬하는 순수 계산이다. 플러그인 화면의 대상 목록 순서에 쓴다.

/** 같은 부모 아래 노드 하나의 위치와 크기 */
export type CanvasBox = { id: string; x: number; y: number; width: number; height: number };

/**
 * 같은 부모 아래 형제 노드를 읽는 순서로 정렬한다. 위에서 아래로 행을 나누고, 행 안에서는 왼쪽에서 오른쪽이다.
 * 위쪽 끝 순서로 훑으며 지금 행의 아래쪽 끝보다 위에서 시작하는 노드(세로로 겹치는 노드)는 같은 행으로 본다.
 * 격자로 놓은 섹션의 위쪽 끝이 조금씩 어긋나도 한 행으로 읽기 위해서다.
 * @codocs [[피그마 연동:플러그인 화면]]
 * @param boxes 형제 노드
 * @returns 읽는 순서의 노드 ID
 */
export function readingOrder(boxes: readonly CanvasBox[]): string[] {
  const sorted = [...boxes].sort((a, b) => a.y - b.y || a.x - b.x);
  const rows: CanvasBox[][] = [];
  let rowBottom = Number.NEGATIVE_INFINITY;
  for (const box of sorted) {
    const row = rows.at(-1);
    if (row === undefined || box.y >= rowBottom) {
      rows.push([box]);
      rowBottom = box.y + box.height;
    } else {
      row.push(box);
      rowBottom = Math.max(rowBottom, box.y + box.height);
    }
  }
  return rows.flatMap((row) => [...row].sort((a, b) => a.x - b.x || a.y - b.y).map(({ id }) => id));
}

/**
 * 조상마다의 순위(페이지 바로 아래부터 노드까지)를 사전식으로 비교한다.
 * 섹션 안 섹션처럼 겹쳐 놓은 노드를 바깥 묶음 순서부터 정렬하기 위해서다.
 * @codocs [[피그마 연동:플러그인 화면]]
 * @param a 앞 노드의 순위 경로
 * @param b 뒤 노드의 순위 경로
 * @returns 음수면 a가 먼저, 양수면 b가 먼저
 */
export function compareRankPaths(a: readonly number[], b: readonly number[]): number {
  const length = Math.min(a.length, b.length);
  for (let index = 0; index < length; index += 1) {
    const difference = (a[index] ?? 0) - (b[index] ?? 0);
    if (difference !== 0) {
      return difference;
    }
  }
  return a.length - b.length;
}
