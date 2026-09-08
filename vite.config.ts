import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { houseSyncPlugin } from './vite-house-sync-plugin.ts'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), houseSyncPlugin()],
  server: {
    host: true, // 같은 와이파이의 휴대폰에서도 접속할 수 있도록 허용
  },
})
