import type { JSX } from 'react';

import { cn } from '../cn';
import { JumpListLetter } from '../components/jump-list-letter/jump-list-letter';
import { ListItem } from '../components/list-item/list-item';
import { TileGrid } from '../components/tile-grid/tile-grid';

const folderIcon = new URL('../assets/images/file-folder.png', import.meta.url).href;
const documentIcon = new URL('../assets/images/file-document.png', import.meta.url).href;

// 글자 격자의 글자 순서다([[Start 메뉴:모두]]). 항목이 없는 글자(견본처럼 몇 개)는 흐리게 그린다.
const letters =
  '& # A B C D E F G H I J K L M N O P Q R S T U V W X Y Z ㄱ ㄴ ㄷ ㄹ ㅁ ㅂ ㅅ ㅇ ㅈ ㅊ ㅋ ㅌ ㅍ ㅎ'.split(
    ' ',
  );
const disabledLetters: ReadonlySet<string> = new Set(['&', 'Q', 'X', 'Z', 'ㅋ', 'ㅌ']);

type SampleListItem = {
  title: string;
  isFolder: boolean;
};

// 격자 아래에 있는 앱 목록 자리표시다.
const listItems: readonly SampleListItem[] = [
  { title: '글', isFolder: true },
  { title: '프로젝트', isFolder: true },
  { title: 'React 렌더링 정리', isFolder: false },
  { title: 'TypeScript 타입 좁히기', isFolder: false },
  { title: '디자인 시스템 만들기', isFolder: false },
  { title: '모션 토큰 정리', isFolder: false },
  { title: '피그마 플러그인', isFolder: false },
  { title: '사진', isFolder: true },
];

type SampleJumpListProps = {
  /** 모션 클래스. 격자와 목록을 함께 감싼 요소에 건다 */
  motionClassName: string;
};

/**
 * Start 글자 목록 모션 견본(motion-start-jump-list-*)을 디자인 시스템 컴포넌트로 비슷하게 그린다.
 * 견본의 `Start/JumpList` 조립은 앱에 있어 여기서는 TileGrid + JumpListLetter로 글자 격자를,
 * ListItem 몇 개로 견본의 `list` 레이어(앱 목록)를 그린다. 격자는 목록 위에 겹친다.
 * 모션 클래스는 둘을 감싼 요소에 걸고, 격자에 data-jump-list="grid", 목록에 data-jump-list="list"를 둔다(motion.css의 약속).
 * 격자와 목록이 모두 투명도를 움직이므로, 키프레임 값 검사가 json 트랙과 짝짓도록 data-motion-node에 json의 노드 이름
 * (`Start/JumpList`, `list`)을 단다.
 * @codocs [[피그마 연동:모션]]
 * @param props 견본 글자 목록 속성
 * @returns 견본 글자 격자와 목록
 */
export function SampleJumpList(props: SampleJumpListProps): JSX.Element {
  const { motionClassName } = props;
  return (
    <div className={cn('relative h-600 w-400 overflow-hidden', motionClassName)}>
      <div data-jump-list="list" data-motion-node="list" className="flex flex-col">
        {listItems.map((item) => renderListItem(item))}
      </div>
      <div
        data-jump-list="grid"
        data-motion-node="Start/JumpList"
        className="absolute inset-0 flex justify-center"
      >
        <TileGrid align="center" className="w-200">
          {letters.map((letter) => renderLetter(letter))}
        </TileGrid>
      </div>
    </div>
  );
}

/**
 * 앱 목록 한 줄을 그린다.
 * @param item 목록 항목 자리표시
 * @returns ListItem
 */
function renderListItem(item: SampleListItem): JSX.Element {
  return (
    <ListItem
      key={item.title}
      title={item.title}
      icon={
        <img
          src={item.isFolder ? folderIcon : documentIcon}
          alt=""
          className="size-full object-contain"
        />
      }
    />
  );
}

/**
 * 글자 격자의 칸 하나를 그린다. 칸 사이 간격은 감싼 요소의 안쪽 여백이다.
 * @param letter 글자
 * @returns JumpListLetter
 */
function renderLetter(letter: string): JSX.Element {
  return (
    <div key={letter} className="p-4">
      <JumpListLetter label={letter} disabled={disabledLetters.has(letter)} />
    </div>
  );
}
