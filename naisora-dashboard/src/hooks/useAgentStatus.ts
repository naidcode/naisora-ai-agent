import { useState, useEffect } from 'react'
import { getAgentStatus } from '@/lib/agent-api'

export function useAgentStatus() {
  const [status, setStatus] = useState<'running' | 'offline' | 'checking'>('checking')
  const [uptime, setUptime] = useState<number>(0)

  useEffect(() => {
    const check = async () => {
      const data = await getAgentStatus()
      setStatus(data.status === 'running' ? 'running' : 'offline')
      setUptime(data.uptime || 0)
    }
    
    check()
    const interval = setInterval(check, 30000) // check every 30 seconds
    return () => clearInterval(interval)
  }, [])

  return { status, uptime }
}
