import { describe, expect, it } from 'vitest';

import { inheritedBindings, overrideSourceId, sourceLayerId } from './bindings';

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

// @codocs [[피그마 연동:구조 검사]]
describe('덮어쓴 레이어의 원본 레이어', () => {
  it('인스턴스 ID를 떼면 원본 컴포넌트 기준 레이어 ID가 된다', () => {
    expect(overrideSourceId('414:15967', 'I414:15967;13:91')).toBe('13:91');
    expect(overrideSourceId('414:15967', 'I414:15967;540:15628;13:91')).toBe('I540:15628;13:91');
    expect(overrideSourceId('I1:2;3:4', 'I1:2;3:4;5:6')).toBe('5:6');
  });

  it('그 인스턴스 안쪽이 아니면 null이다', () => {
    expect(overrideSourceId('414:15967', 'I999:1;13:91')).toBeNull();
  });
});
