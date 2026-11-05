import { describe, expect, it } from 'vitest';

import { checksOf, readReportedCases } from './playwright-results.ts';

// @codocs [[테스트 작성 규칙:E2E]]
describe('CI 결과', () => {
  it('시험 제목 끝의 [행위id#번호]로 케이스를 찾아 마지막 결과, 단계, trace를 꺼낸다', () => {
    const cases = readReportedCases({
      suites: [
        {
          suites: [
            {
              specs: [
                {
                  title: '#1 폴더를 연다 [desktop-open-item#1]',
                  tests: [
                    {
                      results: [
                        {
                          status: 'passed',
                          duration: 900,
                          attachments: [{ name: 'trace', path: 'C:/r/trace.zip' }],
                          steps: [{ title: '폴더가 열린다' }],
                        },
                      ],
                    },
                  ],
                },
                {
                  title: '#2 휴지통을 연다 [desktop-open-item#2]',
                  tests: [
                    {
                      results: [
                        {
                          status: 'failed',
                          duration: 5000,
                          attachments: [{ name: 'trace', path: 'C:/r/first.zip' }],
                          errors: [{ message: '\u001b[31mError: 못 찾음\u001b[39m\n자세히' }],
                        },
                        {
                          status: 'failed',
                          duration: 5000,
                          errors: [{ message: '다시 못 찾음\n자세히' }],
                          steps: [{ title: '휴지통이 열린다', error: { message: '못 찾음' } }],
                        },
                      ],
                    },
                  ],
                },
                { title: '고르는 표시가 없는 시험', tests: [{ results: [] }] },
              ],
            },
          ],
        },
      ],
    });
    expect(cases.get('[desktop-open-item#1]')).toEqual({
      status: 'passed',
      durationMs: 900,
      tracePath: 'C:/r/trace.zip',
      error: null,
      steps: [{ title: '폴더가 열린다', isFailed: false }],
    });
    expect(cases.get('[desktop-open-item#2]')).toEqual({
      status: 'failed',
      durationMs: 10000,
      tracePath: 'C:/r/first.zip',
      error: '다시 못 찾음\n자세히',
      steps: [{ title: '휴지통이 열린다', isFailed: true }],
    });
    expect(cases.size).toBe(2);
  });

  it('다시 해서 통과하면 flaky로 본다', () => {
    const cases = readReportedCases({
      suites: [
        {
          specs: [
            {
              title: 'a [x#1]',
              tests: [
                {
                  results: [
                    { status: 'failed', duration: 1 },
                    { status: 'passed', duration: 1 },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });
    expect(cases.get('[x#1]')?.status).toBe('flaky');
  });

  it('기대 결과마다 단계로 확인했는지, 실패했는지, 앞에서 실패해 확인하지 못했는지 맞춘다', () => {
    expect(
      checksOf(
        ['메뉴가 뜬다', '옮겨진다', '창이 닫힌다'],
        [
          { title: '메뉴가 뜬다', isFailed: false },
          { title: '옮겨진다', isFailed: true },
        ],
      ),
    ).toEqual([
      { name: '메뉴가 뜬다', status: 'passed' },
      { name: '옮겨진다', status: 'failed' },
      { name: '창이 닫힌다', status: 'unchecked' },
    ]);
  });
});
