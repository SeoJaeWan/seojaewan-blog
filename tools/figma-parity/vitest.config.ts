import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    name: 'unit-figma-parity',
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
