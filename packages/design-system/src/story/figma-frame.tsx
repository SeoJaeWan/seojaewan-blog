import type { Decorator } from '@storybook/react-vite';
import type { JSX, ReactNode } from 'react';

import { type FigmaExport, figmaFrameStyle } from './figma-frame-style';

// 스토리 제목이 피그마 이름을 담는 머리말이다. `Components/ListItem`, `Patterns/Menu/Folder`
const FIGMA_TITLE_PREFIXES = ['Components/', 'Patterns/'] as const;

type FigmaFrameProps = {
  /** 스토리가 그리는 컴포넌트·조립의 피그마 export.json */
  source: unknown;
  /** 스토리 args(피그마 변형 속성). 없는 속성은 아무 변형이나 맞는다 */
  args?: Readonly<Record<string, unknown>>;
  /** 안쪽 노드를 감쌀 때 루트 아래 노드 이름 경로(`Content/ProfileButton`). 없으면 루트다 */
  node?: string;
  /** 감쌀 내용 */
  children: ReactNode;
};

/**
 * 피그마 export.json의 크기 방식(HUG·FIXED·FILL)과 연결한 크기 변수대로 스토리 내용을 감싼다.
 * 스토리는 크기를 손으로 고르지 않고 이 요소로만 준다. 크기 변수 이름은 실행 중에 정해져 Tailwind가 클래스를
 * 만들 수 없으므로 CSS 변수를 style로 준다.
 * @codocs [[피그마 연동:스토리 규칙]]
 * @codocs [[테스트 작성 규칙:스토리 테스트]]
 * @param props
 */
export function FigmaFrame(props: FigmaFrameProps): JSX.Element {
  const { source, args = {}, node, children } = props;
  return (
    <div
      data-figma-frame={node ?? ''}
      className="grid w-fit"
      style={figmaFrameStyle(source as FigmaExport, args, node)}
    >
      {children}
    </div>
  );
}

/**
 * `Figma` 스토리(와 같은 대상의 동작 스토리)를 피그마 루트 크기로 감싸는 데코레이터를 만든다. args는 스토리에서 읽는다.
 * 제목이 `Components/<이름>`·`Patterns/<이름>`이면 export.json의 이름과 같은지 확인해 다른 대상의 크기를 쓰지 않게 한다.
 * @codocs [[피그마 연동:스토리 규칙]]
 * @param source 스토리가 그리는 컴포넌트·조립의 피그마 export.json
 * @returns 데코레이터
 */
export function figmaFrame(source: unknown): Decorator {
  const { name } = source as FigmaExport;
  return function FigmaFrameDecorator(story, context) {
    const prefix = FIGMA_TITLE_PREFIXES.find((candidate) => context.title.startsWith(candidate));
    if (prefix !== undefined && context.title.slice(prefix.length) !== name) {
      throw new Error(`스토리 제목 "${context.title}"과 export.json "${name}"이 다르다`);
    }
    return (
      <FigmaFrame source={source} args={context.args}>
        {story()}
      </FigmaFrame>
    );
  };
}
