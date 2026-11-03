import { devices } from '@playwright/test';

import { test } from './behaviors/behavior-test.ts';
import type { CheckExpected } from './behaviors/define-behavior.ts';
import { loadBehaviors } from './behaviors/load-behaviors.ts';

const behaviors = await loadBehaviors();

// @codocs [[테스트 작성 규칙:E2E]]
// 행위 정의 파일의 케이스 하나가 시험 하나다. 제목 끝의 `[행위#번호]`로 케이스 하나만 고를 수 있다.
// 기대 결과(`expected`)마다 그 이름의 `test.step`으로 확인하고, 확인하지 않은 기대 결과가 있으면 실패한다.
for (const behavior of behaviors) {
  test.describe(`${behavior.area} › ${behavior.name}`, () => {
    behavior.cases.forEach((behaviorCase, index) => {
      const number = index + 1;
      test.describe(() => {
        if (behaviorCase.device !== undefined) {
          // 장치 설정의 브라우저 종류는 describe 안에서 바꿀 수 없어 뺀다(모두 Chromium이다).
          const { userAgent, viewport, deviceScaleFactor, isMobile, hasTouch } =
            devices[behaviorCase.device];
          test.use({ userAgent, viewport, deviceScaleFactor, isMobile, hasTouch });
        }
        test(
          `#${number} ${behaviorCase.scenario} [${behavior.id}#${number}]`,
          { annotation: behaviorCase.docs.map((doc) => ({ type: 'codocs', description: doc })) },
          async ({ page, context, touch }) => {
            const checked = new Set<string>();
            /**
             * 기대 결과 하나를 그 이름의 단계로 확인한다.
             * @param expected 케이스의 기대 결과 항목
             * @param body 확인할 동작과 `expect`
             */
            async function check(
              expected: string,
              body: Parameters<CheckExpected>[1],
            ): Promise<void> {
              if (!behaviorCase.expected.includes(expected)) {
                throw new Error(`기대 결과에 없는 확인: ${expected}`);
              }
              checked.add(expected);
              await test.step(expected, async () => {
                await body();
              });
            }
            await behaviorCase.run({ page, context, touch, check });
            const unchecked = behaviorCase.expected.filter((expected) => !checked.has(expected));
            if (unchecked.length > 0) {
              throw new Error(`확인하지 않은 기대 결과: ${unchecked.join(' / ')}`);
            }
          },
        );
      });
    });
  });
}
