import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    name: 'unit-figma-plugin',
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
