import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    name: 'unit-images',
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
