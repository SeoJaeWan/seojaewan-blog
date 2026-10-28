import 'server-only';

import type { ThemeRegistration } from 'shiki';

import { CODE_SYNTAXES, type CodeSyntax } from '@/shared/utils/post-body/post-body';

/** 코드 강조 테마 이름 */
export const CODE_HIGHLIGHT_THEME_NAME = 'seojaewan-code-syntax';

/**
 * 색 갈래마다 칠할 문법 범위(TextMate scope). VS Code 기본 밝은 테마(Light+)의 scope 목록을 보고 묶었다.
 * Light+에서 같은 색인 scope를 그 색의 갈래로 묶고, 우리 갈래에 없는 Light+ 색은 쓰임이 가까운 갈래로 옮겼다.
 * - `true`·`false`·`null`(`constant.language`)은 Light+처럼 키워드다.
 * - 흐름 키워드(`keyword.control`)는 Light+에서 키워드 규칙보다 뒤에 와 흐름 키워드 색을 이기므로 흐름 키워드에만 둔다.
 * - Light+가 따로 칠하지 않는 매개변수(`variable.parameter`)와 구두점(`punctuation`)은 갈래가 있어 더했다.
 *   문자열의 따옴표와 주석 기호는 Light+처럼 문자열·주석 색이 되도록 구두점보다 자세한 scope를 더했다.
 * - 정규식(`#811f3f`·`#d16969`)과 이스케이프 글자(`#ee0000`)는 문자열로 옮겼다.
 *   `#0070c1`은 상수로 선언한 변수(`variable.other.constant`)면 변수·속성(선언과 쓰는 곳의 색을 맞춘다), 열거형 멤버면 숫자·상수다.
 *   `#0451a5`는 속성 이름이면 변수·속성, 값이면 숫자·상수, 마크다운 기호면 연산자·구두점으로 옮겼다.
 *   잘못된 글자(`invalid`)는 빨간 태그 속성 이름, 남색(`#000080`)은 변수·속성, 검정은 기본 글자나 연산자·구두점이다.
 * 기본 글자(`text`)는 테마의 기본 글자색이고, 바깥 색을 기본 글자색으로 되돌리는 scope만 둔다.
 * Light+의 글자 모양(굵게·기울임)은 따르지 않는다.
 * @codocs [[기술 스택:글 본문 처리]]
 */
export const codeSyntaxScopes = {
  attribute: [
    'entity.other.attribute-name',
    'support.type.vendored.property-name',
    'support.type.property-name',
    'source.css variable',
    'source.coffee.embedded',
    'invalid',
  ],
  comment: ['comment', 'punctuation.definition.comment'],
  constant: [
    'constant.numeric',
    'variable.other.enummember',
    'keyword.operator.plus.exponent',
    'keyword.operator.minus.exponent',
    'markup.inserted',
    'markup.changed',
    'meta.preprocessor.numeric',
    'support.constant.property-value',
    'support.constant.font-name',
    'support.constant.media-type',
    'support.constant.media',
    'constant.other.color.rgb-value',
    'constant.other.rgb-value',
    'support.constant.color',
    'keyword.other.unit',
    'constant.sha.git-rebase',
  ],
  function: [
    'entity.name.function',
    'support.function',
    'support.constant.handlebars',
    'source.powershell variable.other.member',
    'entity.name.operator.custom-literal',
    'support.function.git-rebase',
  ],
  keyword: [
    'constant.language',
    'meta.preprocessor',
    'entity.name.function.preprocessor',
    'storage',
    'storage.type',
    'storage.modifier',
    'keyword.operator.noexcept',
    'string.comment.buffered.block.pug',
    'string.quoted.pug',
    'string.interpolated.pug',
    'string.unquoted.plain.in.yaml',
    'string.unquoted.plain.out.yaml',
    'string.unquoted.block.yaml',
    'string.quoted.single.yaml',
    'string.quoted.double.xml',
    'string.quoted.single.xml',
    'string.unquoted.cdata.xml',
    'string.quoted.double.html',
    'string.quoted.single.html',
    'string.unquoted.html',
    'string.quoted.single.handlebars',
    'string.quoted.double.handlebars',
    'punctuation.definition.template-expression.begin',
    'punctuation.definition.template-expression.end',
    'punctuation.section.embedded',
    'keyword',
    'keyword.operator.new',
    'keyword.operator.expression',
    'keyword.operator.cast',
    'keyword.operator.sizeof',
    'keyword.operator.alignof',
    'keyword.operator.typeid',
    'keyword.operator.alignas',
    'keyword.operator.instanceof',
    'keyword.operator.logical.python',
    'keyword.operator.wordlike',
    'variable.language',
    'constant.character',
    'constant.other.option',
  ],
  'keyword-control': [
    'keyword.control',
    'source.cpp keyword.operator.new',
    'source.cpp keyword.operator.delete',
    'keyword.other.using',
    'keyword.other.directive.using',
    'keyword.other.operator',
    'entity.name.operator',
  ],
  parameter: ['variable.parameter'],
  punctuation: [
    'punctuation',
    'keyword.operator',
    'keyword.operator.quantifier.regexp',
    'punctuation.definition.quote.begin.markdown',
    'punctuation.definition.list.begin.markdown',
  ],
  string: [
    'string',
    'punctuation.definition.string',
    'meta.embedded.assembly',
    'markup.deleted',
    'meta.preprocessor.string',
    'constant.regexp',
    'string.regexp',
    'punctuation.definition.group.regexp',
    'punctuation.definition.group.assertion.regexp',
    'punctuation.definition.character-class.regexp',
    'punctuation.character.set.begin.regexp',
    'punctuation.character.set.end.regexp',
    'keyword.operator.negation.regexp',
    'support.other.parenthesis.regexp',
    'constant.character.character-class.regexp',
    'constant.other.character-class.set.regexp',
    'constant.other.character-class.regexp',
    'constant.character.set.regexp',
    'keyword.operator.or.regexp',
    'keyword.control.anchor.regexp',
    'constant.character.escape',
  ],
  tag: [
    'entity.name.tag',
    'entity.name.selector',
    'entity.other.attribute-name.class.css',
    'source.css entity.other.attribute-name.class',
    'entity.other.attribute-name.id.css',
    'entity.other.attribute-name.parent-selector.css',
    'entity.other.attribute-name.parent.less',
    'source.css entity.other.attribute-name.pseudo-class',
    'entity.other.attribute-name.pseudo-element.css',
    'source.css.less entity.other.attribute-name.id',
    'entity.other.attribute-name.scss',
    'markup.heading',
    'markup.inline.raw',
    'punctuation.definition.tag',
    'punctuation.section.embedded.begin.php',
    'punctuation.section.embedded.end.php',
  ],
  type: [
    'support.class',
    'support.type',
    'entity.name.type',
    'entity.name.namespace',
    'entity.other.attribute',
    'entity.name.scope-resolution',
    'entity.name.class',
    'storage.type.numeric.go',
    'storage.type.byte.go',
    'storage.type.boolean.go',
    'storage.type.string.go',
    'storage.type.uintptr.go',
    'storage.type.error.go',
    'storage.type.rune.go',
    'storage.type.cs',
    'storage.type.generic.cs',
    'storage.type.modifier.cs',
    'storage.type.variable.cs',
    'storage.type.annotation.java',
    'storage.type.generic.java',
    'storage.type.java',
    'storage.type.object.array.java',
    'storage.type.primitive.array.java',
    'storage.type.primitive.java',
    'storage.type.token.java',
    'storage.type.groovy',
    'storage.type.annotation.groovy',
    'storage.type.parameters.groovy',
    'storage.type.generic.groovy',
    'storage.type.object.array.groovy',
    'storage.type.primitive.array.groovy',
    'storage.type.primitive.groovy',
    'meta.type.cast.expr',
    'meta.type.new.expr',
    'support.constant.math',
    'support.constant.dom',
    'support.constant.json',
    'entity.other.inherited-class',
    'punctuation.separator.namespace.ruby',
  ],
  variable: [
    'variable',
    'meta.definition.variable.name',
    'variable.other.constant',
    'support.variable',
    'entity.name.variable',
    'constant.other.placeholder',
    'meta.object-literal.key',
    'meta.structure.dictionary.key.python',
    'support.type.property-name.json',
    'meta.diff.header',
    'markup.bold',
  ],
  // 기본 글자색으로 되돌리는 scope다. Light+가 검정으로 칠해 바깥 색을 덮는 곳이다.
  text: [
    'meta.embedded',
    'source.groovy.embedded',
    'string meta.image.inline.markdown',
    'variable.legacy.builtin.python',
    'meta.template.expression',
    'storage.modifier.import.java',
    'variable.language.wildcard.java',
    'storage.modifier.package.java',
    'entity.name.label',
  ],
} as const satisfies Record<CodeSyntax, readonly string[]>;

/**
 * 색 갈래의 CSS 변수 값. 디자인 시스템이 피그마 `code-syntax/*` 변수에서 만든 `--code-syntax-*`다.
 * @param syntax 색 갈래
 * @returns `var(--code-syntax-<갈래>)`
 */
export function codeSyntaxColor(syntax: CodeSyntax): string {
  return `var(--code-syntax-${syntax})`;
}

/**
 * 우리 코드 강조 테마. 내장 테마를 쓰지 않고, scope를 어느 `code-syntax` 변수로 칠할지만 적는다.
 * 색 값은 CSS 변수라 색은 디자인 시스템 토큰이 정한다(Shiki는 hex가 아닌 색 값을 테마에 넣는 것을 지원한다).
 * @codocs [[기술 스택:글 본문 처리]]
 */
export const codeHighlightTheme: ThemeRegistration = {
  name: CODE_HIGHLIGHT_THEME_NAME,
  type: 'light',
  fg: codeSyntaxColor('text'),
  bg: 'transparent',
  settings: CODE_SYNTAXES.map((syntax) => ({
    scope: [...codeSyntaxScopes[syntax]],
    settings: { foreground: codeSyntaxColor(syntax) },
  })),
};
