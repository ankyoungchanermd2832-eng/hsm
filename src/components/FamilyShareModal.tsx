import { useState } from 'react'
import {
  createFamilyCode,
  getFamilyCode,
  isFamilySyncAvailable,
  joinFamilyCode,
  leaveFamilyCode,
} from '../familySync'

interface FamilyShareModalProps {
  onClose: () => void
}

export function FamilyShareModal({ onClose }: FamilyShareModalProps) {
  const [code, setCode] = useState(() => getFamilyCode())
  const [joinInput, setJoinInput] = useState('')
  const [copied, setCopied] = useState(false)

  if (!isFamilySyncAvailable()) {
    return (
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal-card" onClick={(e) => e.stopPropagation()}>
          <h3>👪 가족 공유</h3>
          <p className="hint">아직 가족 공유 기능이 설정되지 않았어요. (README의 Firebase 설정 안내 참고)</p>
          <button className="btn" onClick={onClose}>닫기</button>
        </div>
      </div>
    )
  }

  const handleCreate = () => {
    setCode(createFamilyCode())
  }

  const handleJoin = () => {
    if (!joinInput.trim()) return
    joinFamilyCode(joinInput)
    setCode(getFamilyCode())
    setJoinInput('')
  }

  const handleLeave = () => {
    if (!window.confirm('가족 공유를 그만하고, 이 기기에는 로컬 데이터만 남길까요?')) return
    leaveFamilyCode()
    setCode(null)
  }

  const handleCopy = () => {
    if (!code) return
    void navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card family-share-card" onClick={(e) => e.stopPropagation()}>
        <h3>👪 가족 공유</h3>

        {code ? (
          <>
            <p className="hint">이 코드를 아는 가족은 모두 같은 도면/수납 데이터를 실시간으로 봐요.</p>
            <div className="family-code-display">
              <span>{code}</span>
              <button className="btn btn-sm" onClick={handleCopy}>{copied ? '복사됨!' : '복사'}</button>
            </div>
            <button className="btn btn-danger" onClick={handleLeave}>가족 공유 그만하기</button>
          </>
        ) : (
          <>
            <div className="family-share-section">
              <p className="hint small">아직 아무와도 공유하지 않은 상태예요. 아래 중 하나를 골라주세요.</p>
              <button className="btn btn-primary" onClick={handleCreate}>➕ 새로 공유 시작하기</button>
              <p className="hint small">코드가 생성되면 그 코드를 가족에게 카카오톡 등으로 알려주세요.</p>
            </div>
            <div className="family-share-section">
              <p className="hint small">가족이 이미 만든 코드가 있다면:</p>
              <div className="family-join-row">
                <input
                  value={joinInput}
                  onChange={(e) => setJoinInput(e.target.value)}
                  placeholder="예: 3F7QXK"
                  maxLength={6}
                />
                <button className="btn" onClick={handleJoin}>참여하기</button>
              </div>
              <p className="hint small">참여하면 이 기기의 데이터는 가족의 공유 데이터로 바뀌어요.</p>
            </div>
          </>
        )}

        <button className="btn storage-detail-close-btn" onClick={onClose}>닫기</button>
      </div>
    </div>
  )
}
