import { describe, expect, it, vi } from 'vitest';

import { renderEquationHtml } from './equation-render';

vi.mock('server-only', () => ({}));

// @codocs [[기술 스택:글 본문 처리]]
describe('기술 스택:글 본문 처리', () => {
  it('수식은 서버에서 KaTeX HTML로 그린다(블록 수식, 화면 읽기용 MathML 포함)', () => {
    const html = renderEquationHtml(String.raw`x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}`);
    expect(html).toContain('class="katex-display"');
    expect(html).toContain('class="katex-html"');
    expect(html).toContain('<math');
  });

  it('잘못된 식은 그리지 않는다(undefined)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(renderEquationHtml(String.raw`\frac{1`)).toBeUndefined();
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });

  it('위험한 명령(\\href 등)은 링크로 그리지 않는다', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const html = renderEquationHtml(String.raw`\href{javascript:alert(1)}{x}`) ?? '';
    expect(html).not.toContain('href=');
    warn.mockRestore();
  });
});
