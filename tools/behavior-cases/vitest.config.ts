import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    name: 'unit-behavior-cases',
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
