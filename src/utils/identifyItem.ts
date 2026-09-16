// 물건 사진을 서버(내 컴퓨터)로 보내 Claude에게 이름을 짧게 추정받는다.
// API 키가 설정되지 않았거나 인터넷이 안 되면 조용히 null을 돌려준다 (이름칸은 그냥 비어있게 둔다).
export async function identifyItemPhoto(photo: string): Promise<string | null> {
  try {
    const res = await fetch('/api/identify-item', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ photo }),
    })
    if (!res.ok) return null
    const data = (await res.json()) as { name?: string }
    const name = data.name?.trim()
    return name ? name : null
  } catch {
    return null
  }
}
