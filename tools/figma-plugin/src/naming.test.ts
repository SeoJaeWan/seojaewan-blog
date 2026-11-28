import { describe, expect, it } from 'vitest';

import {
  assetFile,
  assetFilePath,
  assetName,
  componentLayoutPath,
  componentSchemaPath,
  componentSlug,
  figmaNodeUrl,
} from './naming';
import { monoColorSvg, utf8Decode } from './svg-normalize';
import { utf8Encode } from './utf8';

// @codocs [[디자인 시스템:스키마]]
describe('컴포넌트 파일 자리', () => {
  it('컴포넌트 폴더 이름은 컴포넌트 이름의 kebab-case다', () => {
    expect(componentSlug('TaskbarPreviewList')).toBe('taskbar-preview-list');
    expect(componentSlug('Button')).toBe('button');
  });

  it('연속한 대문자와 공백도 단어로 나눈다', () => {
    expect(componentSlug('SVGIcon Button')).toBe('svg-icon-button');
  });

  it('이름을 만들 수 없는 컴포넌트면 중단한다', () => {
    expect(() => componentSlug('버튼')).toThrow('파일 이름을 만들 수 없다');
  });

  it('스키마와 검증 자료는 src/components/<이름>/ 아래 <이름>.json, <이름>.layout.json이다', () => {
    expect(componentSchemaPath('message-box')).toBe(
      'packages/design-system/src/components/message-box/message-box.json',
    );
    expect(componentLayoutPath('message-box')).toBe(
      'packages/design-system/src/components/message-box/message-box.layout.json',
    );
  });
});

// @codocs [[디자인 시스템:피그마 플러그인]]
describe('피그마 링크', () => {
  it('노드 ID의 :를 -로 바꿔 파일의 노드 주소를 만든다', () => {
    expect(figmaNodeUrl('13:62')).toBe(
      'https://www.figma.com/design/XV9Y1UT5UH4tC5hSqLVipZ/?node-id=13-62',
    );
  });
});

// @codocs [[디자인 시스템:자산]]
describe('자산 파일', () => {
  it('자산은 src/assets/<묶음>/<이름>에 두고, 확장자는 내보낸 형식이다', () => {
    expect(assetName({ group: 'Icons', name: 'ic_fluent_add_20_regular' })).toBe(
      'icons/ic_fluent_add_20_regular',
    );
    expect(assetName({ group: 'Illustrations', name: 'file/Folder' })).toBe(
      'illustrations/file-folder',
    );
    expect(assetName({ group: 'Images', name: 'wallpaper/Bloom' })).toBe('images/wallpaper-bloom');
    expect(assetFile('images/wallpaper-bloom', 'jpg')).toBe('images/wallpaper-bloom.jpg');
    expect(assetFilePath('icons/a.svg')).toBe('packages/design-system/src/assets/icons/a.svg');
  });

  it('한 가지 색 자산 SVG의 색은 currentColor가 되고 색 불투명도는 지운다', () => {
    const svg = '<svg><path fill="#242424" fill-opacity="0.6" d="M0"/><rect fill="none"/></svg>';
    expect(utf8Decode(monoColorSvg(utf8Encode(svg)))).toBe(
      '<svg><path fill="currentColor" d="M0"/><rect fill="none"/></svg>',
    );
  });
});
