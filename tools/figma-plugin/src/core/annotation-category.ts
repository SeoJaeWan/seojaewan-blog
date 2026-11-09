/** 피그마 화면 언어가 달라도 같은 뜻으로 읽는 기본 주석 카테고리 이름(영어 기준). 소문자·공백 없앤 표기 → 기준 이름 */
const categoryAliases: Readonly<Record<string, string>> = {
  development: 'Development',
  개발: 'Development',
  개발자: 'Development',
  interaction: 'Interaction',
  인터랙션: 'Interaction',
  상호작용: 'Interaction',
  accessibility: 'Accessibility',
  접근성: 'Accessibility',
  content: 'Content',
  콘텐츠: 'Content',
  컨텐츠: 'Content',
  내용: 'Content',
};

/**
 * 주석 카테고리 이름을 영어 기준 이름으로 맞춘다. 피그마가 한국어 화면이면 기본 카테고리가 한국어 이름으로 나온다.
 * 대소문자와 앞뒤 공백은 무시한다. 모르는 이름(직접 만든 카테고리)은 그대로 둔다.
 * @codocs [[피그마 연동:모션]]
 * @param label 피그마가 준 카테고리 이름
 * @returns 영어 기준 이름, 모르는 이름이면 받은 그대로
 */
export function canonicalCategoryName(label: string): string {
  const key = label.trim().toLowerCase().replace(/\s+/gu, '');
  return categoryAliases[key] ?? label;
}
