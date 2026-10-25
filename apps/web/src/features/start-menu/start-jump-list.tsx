import type { ComponentProps, JSX } from 'react';

import { JumpListLetter, TileGrid } from '@seojaewan/design-system';

/**
 * 글자 격자의 글자 순서다. 기호로 시작(`&`), 숫자로 시작(`#`), `A`~`Z`, `ㄱ`~`ㅎ` 순서의 4열 격자다.
 * @codocs [[Start 메뉴:모두]]
 */
export const JUMP_LIST_LETTERS = [
  '&',
  '#',
  'A',
  'B',
  'C',
  'D',
  'E',
  'F',
  'G',
  'H',
  'I',
  'J',
  'K',
  'L',
  'M',
  'N',
  'O',
  'P',
  'Q',
  'R',
  'S',
  'T',
  'U',
  'V',
  'W',
  'X',
  'Y',
  'Z',
  'ㄱ',
  'ㄴ',
  'ㄷ',
  'ㄹ',
  'ㅁ',
  'ㅂ',
  'ㅅ',
  'ㅇ',
  'ㅈ',
  'ㅊ',
  'ㅋ',
  'ㅌ',
  'ㅍ',
  'ㅎ',
] as const;

type StartJumpListProps = Omit<ComponentProps<'div'>, 'children'> & {
  /** 목록에 항목이 있는 글자. 나머지 글자는 흐리게 보이고 누를 수 없다 */
  availableLetters: readonly string[];
};

/**
 * Start 모두 목록의 글자 격자(피그마 조립 `Start/JumpList`)를 그린다. 글자마다 JumpListLetter를 4열(너비 160) TileGrid에 늘어놓는다.
 * 글자 격자가 열리고 닫히는 움직임(`motion-start-jump-list-enter`·`exit`)은 기능을 구현할 때 이 요소를 감싼 쪽에 붙이고,
 * 움직임이 격자를 찾도록 `data-jump-list="grid"`를 단다. 글자를 골라 목록을 옮기는 동작도 기능을 구현할 때 붙인다.
 * @codocs [[디자인 시스템:조립]]
 * @codocs [[Start 메뉴:모두]]
 * @param props
 */
export function StartJumpList(props: StartJumpListProps): JSX.Element {
  const { availableLetters, className, ...divProps } = props;
  return (
    <TileGrid
      {...divProps}
      data-jump-list="grid"
      className={className === undefined ? 'w-160' : `w-160 ${className}`}
    >
      {JUMP_LIST_LETTERS.map(
        /**
         * 글자 칸 하나를 그린다.
         * @param letter 글자
         * @returns JumpListLetter
         */
        (letter) => (
          <JumpListLetter
            key={letter}
            label={letter}
            disabled={!availableLetters.includes(letter)}
          />
        ),
      )}
    </TileGrid>
  );
}
