import type { ComponentProps, JSX } from 'react';

import { cn } from '../../cn';
import { IconButton } from '../icon-button/icon-button';

type CodeBlockProps = Omit<ComponentProps<'div'>, 'children'> & {
  /** 코드 내용(피그마 Code) */
  code: string;
  /** 코드 언어 이름(피그마 Language) */
  language: string;
  /** 복사 단추 접근성 이름 */
  copyLabel?: string;
};

/**
 * 글 본문의 코드 블록(피그마 CodeBlock)을 그린다. 너비는 쓰는 곳이 `className`으로 정한다
 * (@codocs [[디자인 시스템:컴포넌트 조립 규칙]]). 복사 단추는 IconButton(Style=Subtle) 인스턴스다.
 * @param props
 */
export function CodeBlock(props: CodeBlockProps): JSX.Element {
  const { code, language, copyLabel = '코드 복사', className, ...divProps } = props;
  return (
    <div
      {...divProps}
      // 피그마에서 테두리가 레이아웃에 들어가므로(높이 82 = 안쪽 80 + 테두리 2) CSS border를 쓴다.
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
          onClick={() => {
            navigator.clipboard.writeText(code).catch(() => undefined);
          }}
        />
      </div>
      <pre className="w-full overflow-x-auto type-code text-text-fill-primary">
        <code>{code}</code>
      </pre>
    </div>
  );
}
