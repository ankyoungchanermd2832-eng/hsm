// 가-나-다 / a-b-c 순 정렬을 위한 콜레이터.
// 한글은 초성 기준으로, 영문은 알파벳 기준으로 자연스럽게 정렬된다.
const collator = new Intl.Collator(['ko', 'en'], { sensitivity: 'base', numeric: true })

export function byName<T extends { name: string }>(a: T, b: T): number {
  return collator.compare(a.name, b.name)
}

export function sortByName<T extends { name: string }>(list: T[]): T[] {
  return [...list].sort(byName)
}
