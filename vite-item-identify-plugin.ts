import type { Connect, Plugin } from 'vite'

// 물건 사진을 찍으면 Claude(클라우드 AI)에게 사진을 보내 물건 이름을 짧게 추정받는다.
// API 키는 이 서버(내 컴퓨터)에서만 쓰이고, 브라우저 쪽 코드에는 절대 들어가지 않는다.

const ANTHROPIC_MODEL = 'claude-haiku-4-5-20251001'
const REQUEST_TIMEOUT_MS = 15000

function parseDataUrl(dataUrl: string): { mediaType: string; base64: string } | null {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(dataUrl)
  if (!match) return null
  return { mediaType: match[1], base64: match[2] }
}

function buildIdentifyMiddleware(apiKey: string | undefined): Connect.NextHandleFunction {
  return (req, res, next) => {
    const url = (req.url ?? '').split('?')[0]
    if (url !== '/api/identify-item' || req.method !== 'POST') {
      next()
      return
    }

    if (!apiKey) {
      res.statusCode = 501
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: 'no-api-key' }))
      return
    }

    let body = ''
    req.on('data', (chunk) => {
      body += chunk
    })
    req.on('end', () => {
      void (async () => {
        try {
          const parsed = JSON.parse(body) as { photo?: string }
          const image = parsed.photo ? parseDataUrl(parsed.photo) : null
          if (!image) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'invalid-photo' }))
            return
          }

          const controller = new AbortController()
          const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
          let response: Response
          try {
            response = await fetch('https://api.anthropic.com/v1/messages', {
              method: 'POST',
              signal: controller.signal,
              headers: {
                'content-type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
              },
              body: JSON.stringify({
                model: ANTHROPIC_MODEL,
                max_tokens: 20,
                messages: [
                  {
                    role: 'user',
                    content: [
                      { type: 'image', source: { type: 'base64', media_type: image.mediaType, data: image.base64 } },
                      {
                        type: 'text',
                        text: '이 사진 속 물건의 이름을 한국어로 아주 짧게(1~4단어) 알려줘. 설명이나 따옴표 없이 이름만 출력해.',
                      },
                    ],
                  },
                ],
              }),
            })
          } finally {
            clearTimeout(timer)
          }

          if (!response.ok) {
            res.statusCode = 502
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'upstream-error' }))
            return
          }

          const data = (await response.json()) as { content?: { type: string; text?: string }[] }
          const text = data.content?.find((c) => c.type === 'text')?.text ?? ''
          const name = text.trim().replace(/^["'“”]+|["'“”]+$/g, '').slice(0, 30)

          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ name }))
        } catch {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'failed' }))
        }
      })()
    })
  }
}

export function itemIdentifyPlugin(apiKey: string | undefined): Plugin {
  return {
    name: 'item-identify',
    configureServer(server) {
      server.middlewares.use(buildIdentifyMiddleware(apiKey))
    },
    configurePreviewServer(server) {
      server.middlewares.use(buildIdentifyMiddleware(apiKey))
    },
  }
}
