const AGENT_URL = process.env.NEXT_PUBLIC_AGENT_API_URL || process.env.AGENT_API_URL

if (!AGENT_URL) {
  console.warn('WARNING: NEXT_PUBLIC_AGENT_API_URL is missing. Agent communication will fail.')
}

const AGENT_SECRET = process.env.NEXT_PUBLIC_AGENT_API_SECRET || process.env.AGENT_API_SECRET || 'naisora_secret_2026'

const headers = {
  'Content-Type': 'application/json',
  'x-api-secret': AGENT_SECRET
}

export async function getAgentStatus() {
  if (!AGENT_URL) return { status: 'offline' }
  try {
    const res = await fetch(`${AGENT_URL}/status`, { 
      headers,
      cache: 'no-store'
    })
    if (!res.ok) throw new Error('Agent unreachable')
    return await res.json()
  } catch (err) {
    console.error('Agent Status Error:', err)
    return { status: 'offline' }
  }
}

export async function runModule(module: string, params: Record<string, any> = {}) {
  try {
    const res = await fetch(`${AGENT_URL}/run-module`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ module, params })
    })
    return await res.json()
  } catch (err) {
    return { success: false, error: 'Connection failed' }
  }
}

export async function streamLogs(onMessage: (data: { time?: string; source?: string; message: string; type?: string }) => void) {
  const source = new EventSource(`${AGENT_URL}/logs?secret=${AGENT_SECRET}`)
  source.onmessage = (e) => onMessage(JSON.parse(e.data))
  source.onerror = (e) => {
    console.error('SSE Error:', e)
    source.close()
  }
  return source
}
