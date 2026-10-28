import 'katex/dist/katex.min.css';

import type { JSX } from 'react';

type KatexHtmlProps = {
  /** 서버가 KaTeX로 그려 보낸 수식 HTML */
  html: string;
};

/**
 * 서버가 KaTeX로 그린 수식 HTML을 넣는다. 수식을 계산하지 않고 HTML과 KaTeX CSS·폰트만 쓴다.
 * KaTeX CSS는 이 파일만 불러오고, 이 파일은 수식이 있을 때만 받는다(`PostBlocks`가 지연해 불러온다).
 * KaTeX의 블록 수식 위아래 여백(1em)은 빼고 Equation의 여백(8)만 쓴다. KaTeX CSS는 Tailwind 레이어 밖이라 레이어 안의
 * 유틸리티를 이기므로 `!`(important)로 뺀다. 넓은 수식은 가로로만 스크롤한다(KaTeX 글자 상자가 세로로 조금 넘쳐
 * 세로 스크롤 막대가 생기지 않게 한다).
 * @codocs [[기술 스택:글 본문 처리]]
 * @param props
 */
export function KatexHtml(props: KatexHtmlProps): JSX.Element {
  const { html } = props;
  return (
    <div
      className="max-w-full overflow-x-auto overflow-y-hidden type-body-large text-text-fill-primary [&_.katex-display]:m-0!"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
