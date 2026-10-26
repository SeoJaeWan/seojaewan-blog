import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { buildDesignTokens } from '../design-tokens';
import { controlBorderPaintStyle, tokensInput } from '../design-tokens.fixture';
import { stableStringify } from '../stable-json';
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

// @codocs [[피그마 연동:토큰 생성]]
describe('내보낸 그라데이션 방향', () => {
  it('칠의 gradientTransform이 tokens.json에 남아 tokens.css에서 같은 각도가 된다', () => {
    const [gradient] = controlBorderPaintStyle.paints;
    if (gradient === undefined || !('gradientTransform' in gradient)) {
      throw new Error('fixture에 그라디언트가 없다');
    }
    const diagonal = {
      name: 'Icon Color/Diagonal',
      paints: [
        {
          ...gradient,
          gradientTransform: [
            [0.5, -0.5, 0.5],
            [0.5, 0.5, -0.5],
          ],
        },
      ],
    };
    const { tokens } = buildDesignTokens(
      tokensInput({ paintStyles: [controlBorderPaintStyle, diagonal] }),
    );
    const css = tokensCssText(stableStringify(tokens));
    expect(css).toContain('  --icon-color-diagonal: linear-gradient(45deg, ');
    expect(css).toContain('  --elevation-control-border: linear-gradient(to bottom, ');
  });
});
