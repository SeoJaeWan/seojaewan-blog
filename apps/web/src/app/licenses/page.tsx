import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: '라이선스 | seojaewan',
};

/**
 * 제3자 라이선스 고지를 보여준다. 저장소 루트의 THIRD_PARTY_NOTICES.md를 빌드할 때 읽는다.
 * 창 UI가 생기는 7단계(기능 구현)에서 라이선스 창 안으로 옮긴다.
 * @returns 라이선스 고지 화면
 */
export default async function LicensesPage(): Promise<ReactNode> {
  const notices = await readFile(
    path.join(process.cwd(), '..', '..', 'THIRD_PARTY_NOTICES.md'),
    'utf8',
  );

  return (
    <main>
      <pre style={{ whiteSpace: 'pre-wrap', padding: 16 }}>{notices}</pre>
    </main>
  );
}
