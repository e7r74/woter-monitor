import { NextResponse } from 'next/server'

interface WialonRequest {
  svc: string
  params: Record<string, unknown>
  sid?: string
}

export async function POST(request: Request) {
  try {
    const body: WialonRequest = await request.json()

    // 1. Используем const для svc и sid, так как они не меняются
    const { svc, sid } = body
    // 2. Используем let для params, так как мы будем их модифицировать
    let { params } = body

    // 3. Логика подстановки токена
    if (svc === 'token/login') {
      const token = process.env.WIALON_TOKEN

      if (!token) {
        console.error('Критическая ошибка: WIALON_TOKEN не найден в .env.local')
        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
      }

      params = { token: token }
    }

    if (!svc) {
      return NextResponse.json({ error: 'Missing svc parameter' }, { status: 400 })
    }

    // 4. Формируем безопасный URL
    const encodedParams = encodeURIComponent(JSON.stringify(params))
    let url = `https://hst-api.wialon.com/wialon/ajax.html?svc=${svc}&params=${encodedParams}`

    if (sid) {
      url += `&sid=${sid}`
    }

    // 5. Запрос к Wialon
    const response = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
    })

    if (!response.ok) {
      throw new Error(`Wialon error: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    console.error('WIALON PROXY ERROR:', errorMessage)

    return NextResponse.json({ error: 'Internal Server Error', details: errorMessage }, { status: 500 })
  }
}
