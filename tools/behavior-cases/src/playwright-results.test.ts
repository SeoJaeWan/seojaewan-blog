import { describe, expect, it } from 'vitest';

import { readReportedCases } from './playwright-results.ts';

// @codocs [[테스트 작성 규칙:E2E]]
describe('CI 결과', () => {
  it('시험 제목 끝의 [행위id#번호]로 케이스를 찾아 마지막 결과와 trace를 꺼낸다', () => {
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
                        { status: 'failed', duration: 5000, errors: [{ message: '다시 못 찾음' }] },
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
    });
    expect(cases.get('[desktop-open-item#2]')).toEqual({
      status: 'failed',
      durationMs: 10000,
      tracePath: 'C:/r/first.zip',
      error: '다시 못 찾음',
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
});
