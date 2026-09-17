import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initHouseSync } from './sync.ts'
import { initFamilySync } from './familySync.ts'

initHouseSync()
initFamilySync()

// 휴대폰 홈 화면에 "추가"해서 앱처럼 쓸 수 있으려면 서비스워커가 등록돼 있어야 한다.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch(() => {})
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
