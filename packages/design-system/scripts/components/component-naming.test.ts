import { describe, expect, it } from 'vitest';

import {
  booleanInputName,
  componentFileName,
  componentIdentifier,
  inputName,
  layerClassName,
  layerClassSegment,
  nestedEventInputName,
  storyExportName,
  variantValueName,
} from './component-naming.ts';

// @codocs [[디자인 시스템:컴포넌트 입력]]
describe('컴포넌트 입력', () => {
  it('피그마 속성 이름은 낙타 표기의 입력 이름이 된다', () => {
    expect(inputName('Variant')).toBe('variant');
    expect(inputName('Close icon')).toBe('closeIcon');
  });

  it('변형 값은 소문자와 하이픈으로 정규화한다', () => {
    expect(variantValueName('Two line')).toBe('two-line');
    expect(variantValueName('Accent')).toBe('accent');
  });

  it('켜고 끄는 속성은 접두어가 없으면 is를 붙이고, 있으면 그대로 둔다', () => {
    expect(booleanInputName('Checked')).toBe('isChecked');
    expect(booleanInputName('Has icon')).toBe('hasIcon');
  });

  it('안에 박힌 버튼은 on + 레이어 이름이고 끝의 button은 뗀다', () => {
    expect(nestedEventInputName('close button', '')).toBe('onClose');
    expect(nestedEventInputName('rename field', 'Change')).toBe('onRenameChange');
  });

  it('컴포넌트 이름은 PascalCase 식별자와 kebab-case 파일 이름이 된다', () => {
    expect(componentIdentifier('MessageBox')).toBe('MessageBox');
    expect(componentFileName('MessageBox')).toBe('message-box');
  });
});

// @codocs [[디자인 시스템:생성 결과 검증]]
describe('레이어 클래스', () => {
  it('레이어 자리(키)로 클래스를 짓고 마디는 __로 잇는다', () => {
    expect(layerClassName('message-box', layerClassSegment('footer/primary button'))).toBe(
      'message-box__footer__primary-button',
    );
  });

  it('루트는 root이고 같은 이름 형제의 순번은 -n으로 붙인다', () => {
    expect(layerClassSegment('')).toBe('root');
    expect(layerClassSegment('items/item[2]')).toBe('items__item-2');
  });
});

// @codocs [[디자인 시스템:스토리 규칙]]
describe('스토리 이름', () => {
  it('변형 값을 PascalCase로 이어 스토리 이름을 짓고, 변형이 없으면 Default다', () => {
    expect(storyExportName(['Standard', 'Rest'])).toBe('StandardRest');
    expect(storyExportName([])).toBe('Default');
  });
});
