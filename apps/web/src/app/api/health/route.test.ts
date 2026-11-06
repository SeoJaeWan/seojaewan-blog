import { describe, expect, it } from 'vitest';

import { GET } from './route';

// @codocs [[배포 환경:배포(CD)]]
describe('배포 환경:배포(CD)', () => {
  it('상태 확인 주소는 200과 ok를 돌려준다', async () => {
    const response = GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'ok' });
  });
});
