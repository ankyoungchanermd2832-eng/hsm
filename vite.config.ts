import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { houseSyncPlugin } from './vite-house-sync-plugin.ts'
import { itemIdentifyPlugin } from './vite-item-identify-plugin.ts'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // .env.local 등에 적어둔 ANTHROPIC_API_KEY는 이 설정 파일(서버)에서만 읽고,
  // 브라우저로 전달되는 코드에는 절대 포함시키지 않는다 (VITE_ 접두사를 안 붙였기 때문).
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react(), houseSyncPlugin(), itemIdentifyPlugin(env.ANTHROPIC_API_KEY)],
    server: {
      host: true, // 같은 와이파이의 휴대폰에서도 접속할 수 있도록 허용
    },
  }
})
