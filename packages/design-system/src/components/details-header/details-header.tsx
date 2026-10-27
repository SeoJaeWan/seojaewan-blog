import type { JSX } from 'react';

import { cn } from '../../cn';
import { ColumnHeader } from '../column-header/column-header';

type DetailsHeaderColumn =
  'name' | 'modified' | 'type' | 'location' | 'originalLocation' | 'deletedDate';

type DetailsHeaderProps = {
  /** 피그마 View. 휴지통(recycle-bin)이면 날짜·유형·위치 대신 원래 위치·삭제한 날짜 열을 그린다 */
  view?: 'default' | 'recycle-bin';
  /** 피그마 Show location 속성. 위치 열을 보인다(View=Default에만 있다) */
  showLocation?: boolean;
  /** 정렬 기준 열이다. 피그마 기본은 이름 열 */
  sortColumn?: DetailsHeaderColumn;
  /** 정렬 방향이다. 피그마 기본은 ascending */
  sortDirection?: 'ascending' | 'descending';
  /** 열 제목을 눌렀을 때 그 열을 알려 준다 */
  onSort?: (column: DetailsHeaderColumn) => void;
  /** 바깥 배치에만 쓰는 클래스 */
  className?: string;
};

type SortDirection = 'none' | 'ascending' | 'descending';

/**
 * 열이 정렬 기준이면 정렬 방향을, 아니면 none을 돌려준다.
 * @param column 확인할 열
 * @param sortColumn 정렬 기준 열
 * @param sortDirection 정렬 방향
 * @returns ColumnHeader의 sort 값
 */
function sortOf(
  column: DetailsHeaderColumn,
  sortColumn: DetailsHeaderColumn,
  sortDirection: SortDirection,
): SortDirection {
  return sortColumn === column ? sortDirection : 'none';
}

/**
 * 탐색기 자세히 보기 목록 위의 열 제목 줄(피그마 DetailsHeader)을 그린다.
 * 열 제목은 ColumnHeader를 조립한다. 휴지통 보기(view='recycle-bin')는 이름·원래 위치·삭제한 날짜 열을 가진다.
 * 열 너비는 FileRow 칸과 맞춘다.
 * @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
 * @param props
 */
export function DetailsHeader(props: DetailsHeaderProps): JSX.Element {
  const {
    view = 'default',
    showLocation: hasLocation = false,
    sortColumn = 'name',
    sortDirection = 'ascending',
    onSort,
    className,
  } = props;
  return (
    <div className={cn('flex items-start', className)}>
      <ColumnHeader
        label="이름"
        sort={sortOf('name', sortColumn, sortDirection)}
        className="w-316"
        onClick={() => onSort?.('name')}
      />
      {view === 'recycle-bin' ? (
        <>
          <ColumnHeader
            label="원래 위치"
            sort={sortOf('originalLocation', sortColumn, sortDirection)}
            className="w-188"
            onClick={() => onSort?.('originalLocation')}
          />
          <ColumnHeader
            label="삭제한 날짜"
            sort={sortOf('deletedDate', sortColumn, sortDirection)}
            className="w-148"
            onClick={() => onSort?.('deletedDate')}
          />
        </>
      ) : (
        <>
          <ColumnHeader
            label="수정한 날짜"
            sort={sortOf('modified', sortColumn, sortDirection)}
            className="w-188"
            onClick={() => onSort?.('modified')}
          />
          <ColumnHeader
            label="유형"
            sort={sortOf('type', sortColumn, sortDirection)}
            className="w-148"
            onClick={() => onSort?.('type')}
          />
          {hasLocation && (
            <ColumnHeader
              label="위치"
              sort={sortOf('location', sortColumn, sortDirection)}
              className="w-188"
              onClick={() => onSort?.('location')}
            />
          )}
        </>
      )}
    </div>
  );
}
