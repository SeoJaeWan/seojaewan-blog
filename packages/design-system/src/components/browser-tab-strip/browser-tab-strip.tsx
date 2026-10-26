import type { ComponentProps, JSX, ReactNode } from 'react';

import { cn } from '../../cn';
import { IconButton } from '../icon-button/icon-button';

type BrowserTabStripProps = Omit<ComponentProps<'div'>, 'children'> & {
  /** 피그마 `Tabs` 슬롯. BrowserTab을 넣는 자리다 */
  children?: ReactNode;
  /** 새 탭 버튼을 눌렀을 때 */
  onNewTab?: () => void;
};

/**
 * Chrome 창 맨 위의 탭 줄(피그마 BrowserTabStrip)을 그린다. 탭 슬롯 옆에 새 탭 버튼이 붙는다.
 * 바탕과 창 버튼은 갖지 않고, 조립이 WindowFrame의 Title bar content 슬롯에 넣는다.
 * @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
 * @param props
 */
export function BrowserTabStrip(props: BrowserTabStripProps): JSX.Element {
  const { children, onNewTab: handleNewTab, className, ...divProps } = props;
  return (
    <div {...divProps} className={cn('flex items-end gap-4', className)}>
      <div className="flex min-w-0">{children}</div>
      <div className="flex shrink-0 items-start overflow-clip pb-2">
        <IconButton
          variant="chrome"
          label="새 탭"
          icon="icons/ic_fluent_add_20_regular.svg"
          onClick={handleNewTab}
        />
      </div>
    </div>
  );
}
