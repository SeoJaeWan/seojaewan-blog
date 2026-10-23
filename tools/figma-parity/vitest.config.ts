import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    name: 'figma-parity',
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
