import { describe, expect, it } from 'vitest';

import { bindingBase, inheritedBindings, overrideSourceId, sourceLayerId } from './bindings';

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

// @codocs [[피그마 연동:구조 검사]]
describe('변형을 바꿔 끼운 인스턴스의 변수 연결 기준', () => {
  const swapped = ['I1:2;3:4'];

  it('바꿔 끼운 인스턴스 자신은 새 원본 컴포넌트와 비교한다', () => {
    expect(bindingBase('1:2', 'I1:2;3:4', swapped)).toEqual({
      kind: 'swapped',
      swappedId: 'I1:2;3:4',
      sourceId: null,
    });
  });

  it('바꿔 끼운 인스턴스 안쪽 레이어는 새 원본 컴포넌트 안 같은 레이어와 비교한다', () => {
    expect(bindingBase('1:2', 'I1:2;3:4;5:6', swapped)).toEqual({
      kind: 'swapped',
      swappedId: 'I1:2;3:4',
      sourceId: '5:6',
    });
    expect(bindingBase('1:2', 'I1:2;3:4;7:8;5:6', swapped)).toEqual({
      kind: 'swapped',
      swappedId: 'I1:2;3:4',
      sourceId: 'I7:8;5:6',
    });
  });

  it('가장 안쪽 교체 인스턴스를 기준으로 삼는다', () => {
    expect(bindingBase('1:2', 'I1:2;3:4;7:8;5:6', ['I1:2;3:4', 'I1:2;3:4;7:8'])).toEqual({
      kind: 'swapped',
      swappedId: 'I1:2;3:4;7:8',
      sourceId: '5:6',
    });
  });

  it('교체와 상관없는 레이어와 바깥 인스턴스 자신의 교체는 원래 자리와 비교한다', () => {
    expect(bindingBase('1:2', 'I1:2;9:9', swapped)).toEqual({ kind: 'outer' });
    expect(bindingBase('1:2', 'I1:2;3:45', swapped)).toEqual({ kind: 'outer' });
    expect(bindingBase('1:2', '1:2', ['1:2'])).toEqual({ kind: 'outer' });
    expect(bindingBase('1:2', 'I1:2;9:9', [])).toEqual({ kind: 'outer' });
  });
});
