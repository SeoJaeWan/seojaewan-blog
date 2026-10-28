import 'server-only';

import katex from 'katex';

/**
 * 수식(LaTeX)을 KaTeX로 그려 HTML로 돌려준다. 서버가 본문을 만들 때 부르고, 브라우저는 이 HTML과 KaTeX CSS만 쓴다.
 * Notion 수식 블록은 한 줄을 차지하는 수식이라 display 모드로 그린다. 화면에는 HTML, 화면 읽기 프로그램에는 MathML을 함께 넣는다.
 * 위험한 명령(`\href`, `\includegraphics` 등)은 막는다(`trust: false`).
 * 식이 잘못되면 KaTeX의 오류 색(토큰이 아닌 색)으로 그리지 않고 그리지 않은 것(undefined)으로 돌려준다.
 * 그러면 글 화면은 식 글자를 그대로 보인다.
 * @codocs [[기술 스택:글 본문 처리]]
 * @param expression 수식(LaTeX)
 * @returns KaTeX HTML. 그리지 못하면 undefined
 */
export function renderEquationHtml(expression: string): string | undefined {
  try {
    return katex.renderToString(expression, {
      displayMode: true,
      output: 'htmlAndMathml',
      throwOnError: true,
      trust: false,
    });
  } catch (error) {
    if (error instanceof katex.ParseError) {
      console.warn(`[post-body] 수식을 그리지 못했다: ${error.message}`);
      return undefined;
    }
    throw error;
  }
}
