import { describe, expect, it } from 'vitest';

import { inheritedBindings, sourceLayerId } from './bindings';

// @codocs [[피그마 연동:구조 검사]]
describe('바꿔 끼운 아이콘의 크기 연결', () => {
  it('자기 연결이 없고 값이 원본 레이어와 같으면 원본 레이어의 연결을 쓴다', () => {
    expect(
      inheritedBindings({}, { width: 'size-icon-16', height: 'size-icon-16' }, () => true),
    ).toEqual({ width: 'size-icon-16', height: 'size-icon-16' });
  });

  it('값을 덮어쓴 필드는 물려받지 않는다', () => {
    expect(
      inheritedBindings({}, { width: 'a', height: 'b' }, (field) => field === 'height'),
    ).toEqual({ height: 'b' });
  });

  it('자기 연결이 있으면 그것을 쓴다', () => {
    expect(inheritedBindings({ width: 'own' }, { width: 'source' }, () => true)).toEqual({
      width: 'own',
    });
  });

  it('인스턴스 안쪽 레이어 ID의 마지막 조각이 원본 레이어 ID다', () => {
    expect(sourceLayerId('I414:15967;540:15628;414:5744;13:91')).toBe('13:91');
    expect(sourceLayerId('13:91')).toBeNull();
  });
});
