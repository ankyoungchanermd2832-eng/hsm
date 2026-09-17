import { useEffect, useState } from 'react'
import './InstallBanner.css'

const DISMISS_KEY = 'hsm-install-banner-dismissed'

type BannerKind = 'kakao' | 'ios' | 'android' | null

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as { standalone?: boolean }).standalone === true
  )
}

function detectKakaoInApp(): boolean {
  return /KAKAOTALK/i.test(navigator.userAgent)
}

function detectIOS(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

export function InstallBanner() {
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === '1')
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setInstallEvent(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  if (dismissed || isStandalone()) return null

  const kind: BannerKind = detectKakaoInApp() ? 'kakao' : detectIOS() ? 'ios' : installEvent ? 'android' : null
  if (!kind) return null

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1')
    setDismissed(true)
  }

  const handleInstallClick = () => {
    void installEvent?.prompt().then(() => setInstallEvent(null))
  }

  return (
    <div className="install-banner">
      {kind === 'kakao' && (
        <p>
          📱 카카오톡 브라우저에서는 앱 설치가 안 돼요. 오른쪽 아래 <strong>⋮</strong> 또는{' '}
          <strong>공유 아이콘</strong>을 눌러 <strong>"다른 브라우저로 열기"</strong>를 선택해주세요.
        </p>
      )}
      {kind === 'ios' && (
        <p>
          📱 홈 화면에 추가하려면 하단 <strong>공유 버튼</strong>(⬆️)을 누른 뒤{' '}
          <strong>"홈 화면에 추가"</strong>를 선택해주세요.
        </p>
      )}
      {kind === 'android' && (
        <p>
          📱 앱처럼 설치해서 쓰시겠어요?{' '}
          <button className="btn btn-sm btn-primary" onClick={handleInstallClick}>설치하기</button>
        </p>
      )}
      <button className="install-banner-close" onClick={dismiss} aria-label="닫기">✕</button>
    </div>
  )
}
