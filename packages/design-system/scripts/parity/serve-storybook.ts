import { storybookStaticDir } from '../package-paths.ts';
import { PARITY_PORT } from './parity-config.ts';
import { startStaticServer } from './static-server.ts';

// Playwright Test의 webServer가 띄우는 Storybook 정적 서버다. 끝날 때까지 떠 있는다.
// 사용법: node scripts/parity/serve-storybook.ts
const server = await startStaticServer(storybookStaticDir, PARITY_PORT);
console.log(`[parity] Storybook 정적 빌드를 ${server.url}에서 띄웠다.`);
