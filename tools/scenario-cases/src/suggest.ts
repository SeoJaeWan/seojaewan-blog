import type { MissingSuggestion } from './table-types.ts';

/** 낱말로 보지 않는 흔한 말 */
const stopWords = new Set(['없음', '있음', '하나', '같은', '있는', '없는', '다른', '이름', '바로']);
/** 근거 문장으로 보일 최대 글자 수 */
const SENTENCE_LIMIT = 180;
/** 근거 문장이 짧으면 문장이 아니라 표 머리나 낱말이다 */
const SENTENCE_MIN = 7;
/** 값 전체가 문장에 있으면 더하는 점수 */
const EXACT_SCORE = 10;

/**
 * 문서 본문을 문장으로 나눈다. 표 칸, 목록 기호, 링크 표시는 문장 안의 글자로 본다.
 * @param body 섹션 본문(마크다운)
 * @returns 문장
 */
export function splitSentences(body: string): string[] {
  return body
    .replace(/\\\[\[/gu, '[[')
    .replace(/\|/gu, '\n')
    .split(/\n|(?<=다\.)\s+/u)
    .map((text) => text.replace(/^\s*(?:[-*]|\d+\.)\s*/u, '').trim())
    .filter((text) => text.length >= SENTENCE_MIN && !/^[-:\s]+$/u.test(text));
}

/**
 * 값을 문서에서 찾을 낱말로 나눈다. 조사와 흔한 말은 뺀다.
 * @param value 조건 값
 * @returns 낱말
 */
function tokensOf(value: string): string[] {
  return value
    .split(/[·\s/,+()]+/u)
    .map((token) => token.replace(/(?:을|를|이|가|에|의|로|으로)$/u, ''))
    .filter((token) => token.length >= 2 && !stopWords.has(token));
}

/**
 * 빠진 값의 근거가 될 문서 문장을 찾는다. 값 전체가 든 문장을 먼저, 그다음 낱말이 많이 든 짧은 문장을 고른다.
 * @codocs [[테스트 작성 규칙:E2E]]
 * @param value 조건 값
 * @param bodies 링크 → 섹션 본문(행위 케이스의 근거 섹션)
 * @returns 링크와 문장. 맞는 문장이 없으면 null
 */
export function findRule(
  value: string,
  bodies: ReadonlyMap<string, string>,
): { link: string; sentence: string } | null {
  const tokens = tokensOf(value);
  let best: { link: string; sentence: string; score: number } | null = null;
  for (const [link, body] of bodies) {
    for (const sentence of splitSentences(body)) {
      let score = sentence.includes(value) ? EXACT_SCORE : 0;
      for (const token of tokens) {
        if (sentence.includes(token)) {
          score += 2;
        }
      }
      if (
        score > 0 &&
        (best === null ||
          score > best.score ||
          (score === best.score && sentence.length < best.sentence.length))
      ) {
        best = { link, sentence, score };
      }
    }
  }
  if (best === null) {
    return null;
  }
  const sentence =
    best.sentence.length > SENTENCE_LIMIT
      ? `${best.sentence.slice(0, SENTENCE_LIMIT - 1)}…`
      : best.sentence;
  return { link: best.link, sentence };
}

/**
 * 문자열을 TS 작은따옴표 문자열로 쓴다.
 * @param text 글자
 * @returns `'…'`
 */
function quote(text: string): string {
  return `'${text.replace(/\\/gu, '\\\\').replace(/'/gu, "\\'")}'`;
}

/**
 * 빠진 값의 제안(시나리오, 근거 문장, 정의 파일에 붙일 뼈대)을 만든다.
 * @codocs [[테스트 작성 규칙:E2E]]
 * @param input 빠진 값과 만들 재료
 * @param input.key 조건 키
 * @param input.label 조건 이름
 * @param input.value 빠진 값
 * @param input.baseScenario 기준 케이스 시나리오
 * @param input.bodies 링크 → 근거 섹션 본문
 * @returns 제안
 */
export function suggestMissing(input: {
  key: string;
  label: string;
  value: string;
  baseScenario: string;
  bodies: ReadonlyMap<string, string>;
}): MissingSuggestion {
  const rule = findRule(input.value, input.bodies);
  const scenario = `기준 케이스에서 ${input.label}만 '${input.value}'(으)로 바꿔 한다 — ${input.baseScenario}`;
  const docs = rule === null ? "'[[문서:섹션]]'" : quote(rule.link);
  const caseSkeleton = [
    '{',
    `  id: 'TODO',`,
    `  change: { ${input.key}: ${quote(input.value)} },`,
    `  scenario: ${quote(scenario)},`,
    `  expected: ['TODO'],`,
    `  docs: [${docs}],`,
    '  async run({ page, check }) {',
    `    await check('TODO', async () => {});`,
    '  },',
    '},',
  ].join('\n');
  const noCaseSkeleton = [
    'noCase: {',
    `  ${input.key}: {`,
    `    ${quote(input.value)}: { reason: 'TODO', docs: [${docs}] },`,
    '  },',
    '},',
  ].join('\n');
  return { scenario, rule, caseSkeleton, noCaseSkeleton };
}
