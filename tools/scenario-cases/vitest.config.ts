import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    name: 'unit-scenario-cases',
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
