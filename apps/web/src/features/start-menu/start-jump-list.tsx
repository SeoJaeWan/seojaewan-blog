import type { ComponentProps, JSX, MouseEvent } from 'react';

import { JumpListLetter, TileGrid } from '@seojaewan/design-system';

import { JUMP_LIST_LETTERS } from './start-letter-rules';

type StartJumpListProps = Omit<ComponentProps<'div'>, 'children'> & {
  /** 목록에 항목이 있는 글자. 나머지 글자는 흐리게 보이고 누를 수 없다 */
  availableLetters: readonly string[];
  /** 누를 수 있는 글자를 골랐을 때 부른다. 목록을 그 글자로 옮기고 격자를 닫는 일은 쓰는 곳(`StartBody`)이 한다 */
  onLetterSelect?: (letter: string) => void;
};

/**
 * Start 모두 목록의 글자 격자(피그마 조립 `Start/JumpList`)를 그린다. 글자마다 JumpListLetter를 4열(너비 160) TileGrid에 늘어놓는다.
 * 글자 격자가 열리고 닫히는 움직임(`motion-start-jump-list-enter`·`exit`)은 이 요소를 감싼 쪽(`StartBody`)이 붙이고,
 * 움직임이 격자를 찾도록 `data-jump-list="grid"`를 단다. 항목이 없는 글자는 누를 수 없고, 글자를 고르면 `onLetterSelect`로 알린다.
 * @codocs [[디자인 시스템:조립]]
 * @codocs [[Start 메뉴:모두]]
 * @param props
 */
export function StartJumpList(props: StartJumpListProps): JSX.Element {
  const { availableLetters, onLetterSelect, className, ...divProps } = props;

  /**
   * 누른 글자 칸의 글자를 쓰는 곳에 알린다. 흐린 글자 칸은 disabled라 부르지 않는다.
   * @param event 누른 글자 칸의 클릭 이벤트
   */
  function handleLetterClick(event: MouseEvent<HTMLElement>): void {
    const letter = event.currentTarget.dataset['jumpLetter'];
    if (letter !== undefined) {
      onLetterSelect?.(letter);
    }
  }

  return (
    <TileGrid
      role="group"
      aria-label="글자로 이동"
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
            data-jump-letter={letter}
            disabled={!availableLetters.includes(letter)}
            onClick={handleLetterClick}
          />
        ),
      )}
    </TileGrid>
  );
}
