// 이 앱은 PC의 로컬 서버(run.vbs)에 실시간으로 연결되어 있어야 최신 데이터를
// 볼 수 있어서, 오프라인 캐싱을 하면 오히려 오래된 화면을 보여줄 위험이 있다.
// 그래서 캐싱 전략 없이, 휴대폰 홈 화면에 "설치 가능한 앱"이 되기 위한
// 최소한의 서비스워커만 등록해둔다 - 모든 요청은 그대로 네트워크로 흘려보낸다.
self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', () => {
  // 가로채지 않는다 (기본 브라우저 동작 그대로)
})
