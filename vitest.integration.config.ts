/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

// 集成测试：调用真实 endpoint。需用 VITE_TEST_BASE_URL 环境变量启用。
export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  define: {
    'import.meta.env.DEV': false,
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.integration.test.ts'],
    testTimeout: 60000,
  },
})
