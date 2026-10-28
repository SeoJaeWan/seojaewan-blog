import type { ComponentProps, JSX, ReactNode } from 'react';
import { useRef } from 'react';

import { cn } from '../../cn';
import { IconButton } from '../icon-button/icon-button';

type CodeBlockProps = Omit<ComponentProps<'div'>, 'children'> & {
  /** 강조된 코드(피그마 Code 슬롯). 문법 강조 색은 `text-code-syntax-*` 클래스를 단 span으로 칠한다 */
  children?: ReactNode;
  /** 코드 언어 이름(피그마 Language) */
  language: string;
  /** 복사 단추 접근성 이름 */
  copyLabel?: string;
};

/**
 * 글 본문의 코드 블록(피그마 CodeBlock)을 그린다. 너비는 쓰는 곳이 `className`으로 정한다
 * (@codocs [[디자인 시스템:컴포넌트 조립 규칙]]). 코드는 강조된 노드를 `children` 자리로 받고
 * ([[기술 스택:글 본문 처리]]), 복사 단추는 그려진 코드의 글자를 복사한다.
 * 복사 단추는 IconButton(Style=Subtle) 인스턴스다.
 * @param props
 */
export function CodeBlock(props: CodeBlockProps): JSX.Element {
  const { children, language, copyLabel = '코드 복사', className, ...divProps } = props;
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
        'flex flex-col items-start gap-4 overflow-clip rounded-overlay border-default border-card-stroke-default bg-solid-background-fill-tertiary pt-8 pr-8 pb-16 pl-16',
        className,
      )}
    >
      <div className="flex w-full items-center overflow-clip">
        <span className="min-w-0 flex-1 type-caption text-text-fill-secondary">{language}</span>
        <IconButton
          variant="subtle"
          label={copyLabel}
          icon="icons/ic_fluent_copy_20_regular.svg"
          onClick={handleCopy}
        />
      </div>
      <pre className="w-full overflow-x-auto type-code text-code-syntax-text">
        <code ref={codeRef}>{children}</code>
      </pre>
    </div>
  );
}
