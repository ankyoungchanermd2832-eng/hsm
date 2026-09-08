import fs from 'node:fs'
import path from 'node:path'
import type { Connect, Plugin } from 'vite'

// 같은 컴퓨터(run.bat)에서 켜진 서버를, 같은 와이파이의 PC/휴대폰이 함께 바라보게 해서
// 도면/방/수납공간/물건 데이터를 실시간으로 공유한다. 데이터는 이 컴퓨터의 로컬 파일에만
// 저장되고, 외부 클라우드로 전송되지 않는다.

const DATA_DIR = path.resolve(import.meta.dirname, '.data')
const DATA_FILE = path.join(DATA_DIR, 'house.json')

interface SyncPayload {
  house: unknown
  updatedAt: number
}

function readPayload(): SyncPayload | null {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8')
    return JSON.parse(raw) as SyncPayload
  } catch {
    return null
  }
}

function writePayload(house: unknown): SyncPayload {
  fs.mkdirSync(DATA_DIR, { recursive: true })
  const payload: SyncPayload = { house, updatedAt: Date.now() }
  fs.writeFileSync(DATA_FILE, JSON.stringify(payload), 'utf-8')
  return payload
}

const houseSyncMiddleware: Connect.NextHandleFunction = (req, res, next) => {
  const url = (req.url ?? '').split('?')[0]
  if (url !== '/api/house') {
    next()
    return
  }

  if (req.method === 'GET') {
    const payload = readPayload() ?? { house: null, updatedAt: 0 }
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify(payload))
    return
  }

  if (req.method === 'PUT') {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
    })
    req.on('end', () => {
      try {
        const parsed = JSON.parse(body) as { house: unknown }
        const payload = writePayload(parsed.house)
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify(payload))
      } catch {
        res.statusCode = 400
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: 'invalid body' }))
      }
    })
    return
  }

  next()
}

export function houseSyncPlugin(): Plugin {
  return {
    name: 'house-sync',
    configureServer(server) {
      server.middlewares.use(houseSyncMiddleware)
    },
    configurePreviewServer(server) {
      server.middlewares.use(houseSyncMiddleware)
    },
  }
}
