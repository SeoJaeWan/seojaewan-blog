/** NotionCodeBlock의 코드, caption과 복사 visual 상태 props. */
export interface NotionCodeBlockProps {
  /** 코드 블록 아래 figcaption으로 렌더할 설명. */
  caption?: string;
  /** pre/code 안에 그대로 렌더하고 기능 계층이 복사 대상으로 사용하는 코드 문자열. */
  code: string;
  /** true이면 복사 버튼에 완료 상태를 표시한다. 기본값은 false이다. */
  copied?: boolean;
  /** 헤더에 표시할 언어 label. */
  language: string;
  /** 복사 버튼 클릭을 기능 계층에 위임한다. */
  onCopyCode?: () => void;
}

/**
 * 코드 블록 (원본 Notion code 대응).
 * 헤더에 언어 라벨과 controlled 복사 버튼을 두고, 본문은 가로 스크롤 pre로 그린다.
 * 구문 하이라이트는 후속 — sync 단계에서 정적 하이라이트(shiki류)를 붙이는 게 후보다.
 *
 * @param props.caption 코드 블록 아래 figcaption으로 렌더할 설명
 * @param props.code pre/code 안에 렌더하고 기능 계층이 복사 대상으로 사용하는 문자열
 * @param props.copied 복사 완료 문구를 표시할 visual 상태. 기본값은 false
 * @param props.language 헤더에 표시할 언어 label
 * @param props.onCopyCode 복사 버튼 클릭을 기능 계층에 위임하는 callback
 */
export const NotionCodeBlock = ({
  caption,
  code,
  copied = false,
  language,
  onCopyCode,
}: NotionCodeBlockProps) => (
  <figure className="wb-notion-code" data-copied={copied ? "true" : undefined}>
    <div className="wb-notion-code__frame">
      <div className="wb-notion-code__header">
        <span className="wb-notion-code__language">{language}</span>
        <button className="wb-notion-code__copy" onClick={onCopyCode} type="button">
          {copied ? "복사됨" : "복사"}
        </button>
      </div>
      <pre className="wb-notion-code__pre">
        <code>{code}</code>
      </pre>
    </div>
    {caption ? <figcaption className="wb-notion-code__caption">{caption}</figcaption> : null}
  </figure>
);
