import { CABINET_DESIGNS } from '../cabinetDesigns'
import { IsoCube } from './IsoCube'
import './CabinetGallery.css'

interface CabinetGalleryProps {
  onSelect: (designId: string) => void
  onClose: () => void
}

export function CabinetGallery({ onSelect, onClose }: CabinetGalleryProps) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card cabinet-gallery-card" onClick={(e) => e.stopPropagation()}>
        <div className="cabinet-gallery-header">
          <h3>싱크대 디자인 고르기</h3>
          <button className="btn" onClick={onClose}>
            닫기 ✕
          </button>
        </div>
        <p className="hint">원하는 디자인을 선택하면 주방에 배치돼요. 배치 후 자유롭게 위치를 옮길 수 있어요.</p>
        <div className="cabinet-grid">
          {CABINET_DESIGNS.map((d) => (
            <button key={d.id} className="cabinet-card" onClick={() => onSelect(d.id)}>
              <div className="cabinet-preview" style={{ background: d.countertopColor }}>
                <IsoCube color={d.doorColor} icon="🍽️" width={54} height={54} hasTopBox={d.hasUpper} />
              </div>
              <span>{d.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
