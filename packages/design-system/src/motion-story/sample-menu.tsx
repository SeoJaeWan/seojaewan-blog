import type { JSX } from 'react';

import menuItemExport from '../../figma/components/menu-item/export.json';
import { Menu } from '../components/menu/menu';
import { MenuItem } from '../components/menu-item/menu-item';
import { FigmaFrame } from '../story/figma-frame';

type SampleMenuProps = {
  motionClassName: string;
  labels: readonly string[];
  width?: 'default' | 'view-options';
};

/**
 * 메뉴 모션 흐름(motion-menu-enter 등)의 자르는 틀과 그 안의 메뉴 조립을 그리고, 모션 클래스를 틀에 건다.
 * 메뉴 높이가 흐름과 같아야 translate %가 흐름의 px 값으로 읽히므로 흐름과 같은 항목 수를 메뉴 항목의 피그마 크기로 그린다.
 * @codocs [[피그마 연동:모션]]
 * @param props 컴포넌트 속성
 * @param props.motionClassName 모션 클래스. 자르는 틀에 걸고 틀 바로 안의 메뉴가 움직인다
 * @param props.labels 메뉴 항목 글자. 위에서부터 그린다
 * @param props.width 메뉴 너비. view-options는 보기 메뉴(Menu/ViewOptions) 너비다
 * @returns 자르는 틀과 메뉴
 */
export function SampleMenu({
  motionClassName,
  labels,
  width = 'default',
}: SampleMenuProps): JSX.Element {
  return (
    <div className={motionClassName}>
      <Menu className={width === 'view-options' ? 'w-size-menu-view-options-width' : undefined}>
        {labels.map(
          /**
           * 메뉴 항목 하나를 피그마 크기로 그린다.
           * @param label 항목 글자
           * @returns 메뉴 항목
           */
          (label) => (
            <FigmaFrame key={label} source={menuItemExport}>
              <MenuItem isStandalone label={label} />
            </FigmaFrame>
          ),
        )}
      </Menu>
    </div>
  );
}
