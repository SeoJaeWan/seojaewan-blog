import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    name: 'unit-notion-webhook',
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
