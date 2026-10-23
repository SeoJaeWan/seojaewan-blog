import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { tokensCssText } from './export-tokens';

const packageRoot = path.resolve(import.meta.dirname, '../../../../packages/design-system');

// @codocs [[피그마 연동:토큰 검사]]
describe('토큰 PR의 tokens.css', () => {
  it('저장소의 tokens.json에서 만든 결과가 저장소의 tokens.css와 같다(변환 스크립트와 같은 함수)', () => {
    const json = readFileSync(path.join(packageRoot, 'figma/tokens.json'), 'utf8');
    const css = readFileSync(path.join(packageRoot, 'src/tokens.css'), 'utf8');
    expect(tokensCssText(json)).toBe(css);
  });
});
