import { devices } from '@playwright/test';

import { test } from './behaviors/behavior-test.ts';
import { loadBehaviors } from './behaviors/load-behaviors.ts';

const behaviors = await loadBehaviors();

// @codocs [[테스트 작성 규칙:E2E]]
// 행위 정의 파일의 케이스 하나가 시험 하나다. 제목 끝의 `[행위#번호]`로 케이스 하나만 고를 수 있다.
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
          `#${number} ${behaviorCase.purpose} [${behavior.id}#${number}]`,
          { annotation: behaviorCase.docs.map((doc) => ({ type: 'codocs', description: doc })) },
          async ({ page, context, touch }) => {
            await behaviorCase.run({ page, context, touch });
          },
        );
      });
    });
  });
}
