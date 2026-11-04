'use server'

import { NextResponse } from 'next/server'

export async function POST(req) {
  try {
    const body = await req.json()
    const { commandId, args = {} } = body || {}

    // Simple server-side command dispatcher (MVP)
    if (!commandId) return NextResponse.json({ error: 'missing commandId' }, { status: 400 })

    if (commandId === 'compact') {
      // Placeholder: in future, call summarization logic.
      // Accepts { text } and returns { compacted }
      const text = args.text || ''
      const compacted = text.length > 200 ? text.slice(0, 200) + '…' : text
      return NextResponse.json({ ok: true, result: compacted })
    }

    if (commandId === 'export') {
      // Return a stubbed export object (MVP)
      const payload = args.payload || { exportedAt: new Date().toISOString() }
      return NextResponse.json({ ok: true, export: payload })
    }

    return NextResponse.json({ error: 'unknown command' }, { status: 404 })
  } catch (err) {
    console.error('commands route error', err)
    return NextResponse.json({ error: err.message || 'server error' }, { status: 500 })
  }
}
