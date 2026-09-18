// 휴대폰 하단(또는 제스처) 뒤로가기를 눌렀을 때 앱이 곧바로 꺼지지 않고, 열려있는 창을
// 한 단계씩 닫도록 브라우저 히스토리를 이용해 가로챈다. 아무 창도 열려있지 않은 메인
// 화면에서 뒤로가기를 누르면 앱을 종료할지 물어본다 (initExitGuard 콜백으로 알려준다).
import { useEffect, useRef } from 'react'

type CloseFn = () => void

const stack: CloseFn[] = []
// 우리가 직접 history.back()을 호출해서 생기는 popstate는 '진짜' 뒤로가기가 아니라
// 이미 닫힌 창을 히스토리에도 반영하는 것뿐이므로, 그 이벤트가 오면 스택을 건드리지 않고
// 그냥 넘긴다 - 이 값으로 그런 '메아리' popstate를 셀 수 만큼 구분해서 걸러낸다.
let pendingSkips = 0
let exitAttemptHandler: (() => void) | null = null
let listenerAttached = false

function ensureListener() {
  if (listenerAttached) return
  listenerAttached = true
  window.addEventListener('popstate', () => {
    if (pendingSkips > 0) {
      pendingSkips--
      return
    }
    const onClose = stack.pop()
    if (onClose) {
      onClose()
      return
    }
    // 스택이 비어있는데(열려있는 창이 없는데) 뒤로가기가 눌렸다면 메인 화면에서 누른
    // 것이다. 다시 한 칸 밀어넣어서 이 자리에 계속 머물게 하고, 종료를 물어본다.
    window.history.pushState({ hsmGuard: true }, '')
    exitAttemptHandler?.()
  })
}

/** 창을 열 때 호출한다. 반환하는 함수는 (뒤로가기가 아니라) 창 스스로 닫힐 때
 *  - 닫기 버튼, 바깥 탭 등 - 호출해서 남겨둔 히스토리 항목을 정리한다. */
export function pushBackable(onClose: CloseFn): () => void {
  ensureListener()
  window.history.pushState({}, '')
  stack.push(onClose)
  return () => {
    const idx = stack.lastIndexOf(onClose)
    if (idx === -1) return
    stack.splice(idx, 1)
    pendingSkips++
    window.history.back()
  }
}

/** 앱이 처음 시작될 때 한 번 호출한다. */
export function initExitGuard(onExitAttempt: () => void) {
  ensureListener()
  exitAttemptHandler = onExitAttempt
  window.history.pushState({ hsmGuard: true }, '')
}

/** 창(모달)을 여닫는 컴포넌트에서 쓰는 훅. isOpen이 true인 동안 뒤로가기를 가로채서
 *  onClose를 부르고, isOpen이 false가 되면(닫기 버튼 등으로) 히스토리를 정리한다. */
export function useBackClose(isOpen: boolean, onClose: CloseFn) {
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!isOpen) return
    return pushBackable(() => onCloseRef.current())
  }, [isOpen])
}
