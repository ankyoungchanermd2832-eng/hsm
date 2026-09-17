import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './ErrorBoundary.tsx'
import { initHouseSync } from './sync.ts'
import { initFamilySync } from './familySync.ts'

// 동기화 기능에서 예상치 못한 문제가 생겨도 앱 자체는 뜨도록 감싼다.
try {
  initHouseSync()
} catch (err) {
  console.error('로컬 동기화를 시작하지 못했어요.', err)
}
try {
  initFamilySync()
} catch (err) {
  console.error('가족 공유 동기화를 시작하지 못했어요.', err)
}

// 휴대폰 홈 화면에 "추가"해서 앱처럼 쓸 수 있으려면 서비스워커가 등록돼 있어야 한다.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch(() => {})
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
