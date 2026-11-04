import type { ComponentProps, JSX } from 'react';
import { Fragment, useRef } from 'react';

import { cn } from '../../cn';
import { IconButton } from '../icon-button/icon-button';

/** 강조된 코드의 글자 조각 하나 */
export type CodeBlockToken = {
  /** 글자 */
  text: string;
  /** 강조기가 준 글자 색(hex). null이면 기본 코드 글자색이다 */
  color: string | null;
};

type CodeBlockProps = Omit<ComponentProps<'div'>, 'children'> & {
  /** 코드(피그마 Code 슬롯). 줄마다의 글자 조각이고, 강조하지 않은 코드는 색 없는 조각이다 */
  lines: readonly (readonly CodeBlockToken[])[];
  /** 머리에 보이는 언어 이름(피그마 Language) */
  language: string;
  /** 복사 단추 접근성 이름 */
  copyLabel?: string;
};

/**
 * 글 본문의 코드 블록(피그마 CodeBlock)을 그린다. 너비는 쓰는 곳이 `className`으로 정한다
 * (@codocs [[디자인 시스템:컴포넌트 조립 규칙]]). 코드는 강조기가 만든 줄마다의 글자 조각을 받아
 * 조각마다 강조기가 준 색으로 칠한다(@codocs [[기술 스택:글 본문 처리]]). 복사 단추는 그려진 코드의 글자를 복사한다.
 * 복사 단추는 IconButton(Style=Subtle) 인스턴스다.
 * @param props
 */
export function CodeBlock(props: CodeBlockProps): JSX.Element {
  const { lines, language, copyLabel = '코드 복사', className, ...divProps } = props;
  const codeRef = useRef<HTMLElement>(null);
  /** 그려진 코드의 글자를 클립보드에 쓴다. */
  function handleCopy(): void {
    navigator.clipboard.writeText(codeRef.current?.textContent ?? '').catch(() => undefined);
  }
  return (
    <div
      {...divProps}
      // 피그마에서 테두리가 레이아웃에 들어가므로 CSS border를 쓴다.
      className={cn(
        'flex flex-col items-start gap-spacing-xs overflow-clip rounded-radius-overlay border-stroke-width-default border-card-stroke-default bg-solid-background-fill-tertiary pt-spacing-sm pr-spacing-sm pb-spacing-lg pl-spacing-lg',
        className,
      )}
    >
      <div className="flex w-full items-center overflow-clip">
        <span className="min-w-size-none flex-flex-fill type-caption text-text-fill-secondary">
          {language}
        </span>
        <IconButton
          variant="subtle"
          label={copyLabel}
          icon="icons/ic_fluent_copy_20_regular.svg"
          onClick={handleCopy}
        />
      </div>
      <pre className="w-full overflow-x-auto type-code text-text-fill-primary">
        <code ref={codeRef}>{renderCodeLines(lines)}</code>
      </pre>
    </div>
  );
}

/**
 * 강조된 코드 줄들을 그린다. 줄 사이는 줄바꿈 글자다(`pre`라 그대로 줄이 바뀐다).
 * @param lines 줄마다의 글자 조각
 * @returns 강조된 코드
 */
function renderCodeLines(lines: readonly (readonly CodeBlockToken[])[]): JSX.Element[] {
  return lines.map(
    /**
     * 코드 한 줄을 그린다.
     * @param line 줄의 글자 조각
     * @param lineIndex 줄 차례
     * @returns 코드 한 줄
     */
    (line, lineIndex) => (
      <Fragment key={lineIndex}>
        {lineIndex > 0 && '\n'}
        {line.map(
          /**
           * 글자 조각 하나를 강조 색으로 그린다. 색이 없으면 기본 코드 글자색이다.
           * @param token 글자 조각
           * @param tokenIndex 조각 차례
           * @returns 글자
           */
          (token, tokenIndex) =>
            token.color === null ? (
              <Fragment key={tokenIndex}>{token.text}</Fragment>
            ) : (
              // 강조기가 준 색을 그대로 칠하는 이 한 곳만 style에 색을 둔다. 실행 중에 받은 값이라 style 값 lint(리터럴 금지)에 걸리지 않는다.
              // @codocs [[기술 스택:글 본문 처리]]
              <span key={tokenIndex} style={{ color: token.color }}>
                {token.text}
              </span>
            ),
        )}
      </Fragment>
    ),
  );
}
