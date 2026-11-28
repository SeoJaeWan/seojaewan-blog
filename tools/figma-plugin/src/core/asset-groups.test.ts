import { describe, expect, it } from 'vitest';

import { assetGroupOf } from './asset-groups';

// @codocs [[디자인 시스템:자산]]
describe('자산 묶음은 원본 컴포넌트가 놓인 구역으로 정한다', () => {
  it('Foundations / Icons 아래의 컴포넌트는 Icons다', () => {
    expect(
      assetGroupOf('Foundations', ['Foundations / Icons', 'size/fluent/20', 'icons', 'cell/add']),
    ).toBe('Icons');
  });

  it('Foundations / Assets 아래의 컴포넌트는 그것이 든 group/<묶음> 프레임의 이름이 묶음이다', () => {
    expect(assetGroupOf('Foundations', ['Foundations / Assets', 'group/Images'])).toBe('Images');
    expect(assetGroupOf('Foundations', ['Foundations / Assets', 'group/Shapes', 'row'])).toBe(
      'Shapes',
    );
    expect(assetGroupOf('Foundations', ['Foundations / Assets', 'group/Illustrations'])).toBe(
      'Illustrations',
    );
  });

  it('구역 밖의 group/ 프레임과 다른 페이지는 자산이 아니다', () => {
    expect(assetGroupOf('Foundations', ['Foundations / Color', 'group/Images'])).toBeNull();
    expect(assetGroupOf('Controls', ['Foundations / Icons'])).toBeNull();
    expect(assetGroupOf('Foundations', ['Foundations / Assets', 'group/Unknown'])).toBeNull();
  });
});
