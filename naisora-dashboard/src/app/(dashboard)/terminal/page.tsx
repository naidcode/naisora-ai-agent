'use client'

import React, { useState, useEffect, useRef } from 'react'
import { 
  Terminal as TerminalIcon, ChevronRight, Play, 
  Square, RefreshCw, Download, Zap, Database, Cpu 
} from 'lucide-react'
import { cn } from '@/lib/utils'

import { streamLogs, runModule } from '@/lib/agent-api'
import { useAgentStatus } from '@/hooks/useAgentStatus'

export default function TerminalPage() {
  const [logs, setLogs] = useState<any[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isProcessRunning, setIsProcessRunning] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const { status, uptime } = useAgentStatus()

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [logs])

  // Real log streaming
  useEffect(() => {
    let source: any
    
    async function startStreaming() {
      source = await streamLogs((data) => {
        setLogs(prev => [...prev.slice(-100), {
          time: new Date(data.time || Date.now()).toLocaleTimeString('en-GB'),
          source: data.source || 'AGENT',
          message: data.message,
          type: data.type || 'info'
        }])
      })
    }

    startStreaming()
    return () => {
      if (source) source.close()
    }
  }, [])

  const handleCommand = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim()) return

    const timestamp = new Date().toLocaleTimeString('en-GB')
    const userLog = { time: timestamp, source: 'USER', message: inputValue, type: 'info' }
    setLogs(prev => [...prev, userLog])

    // Real command execution via run-module
    const command = inputValue.toLowerCase()
    
    if (command === 'clear') {
      setLogs([])
      setInputValue('')
      return
    }

    try {
      const res = await runModule('commander', { command })
      setLogs(prev => [...prev, { 
        time: new Date().toLocaleTimeString('en-GB'), 
        source: 'SYSTEM', 
        message: res.success ? `Executed: ${command}` : `Error: ${res.error}`, 
        type: res.success ? 'success' : 'error' 
      }])
    } catch (err) {
      setLogs(prev => [...prev, { 
        time: new Date().toLocaleTimeString('en-GB'), 
        source: 'SYSTEM', 
        message: 'Failed to communicate with agent', 
        type: 'error' 
      }])
    }

    setInputValue('')
  }

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col gap-6 animate-slide-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
         <div>
            <h1 className="text-[32px] font-instrument italic font-normal text-text-primary">Agent Terminal</h1>
            <p className="text-[14px] text-text-muted">Real-time status and raw command interface.</p>
         </div>
         <div className="flex items-center gap-3">
            <button className="btn-secondary text-[13px] py-2 px-4 border-border-soft">
               <Download size={16} /> Save
            </button>
            <button 
              onClick={() => setIsProcessRunning(!isProcessRunning)}
              className={cn(
                "btn-primary text-[13px] py-2 px-6 transition-all",
                isProcessRunning ? "bg-error text-white hover:bg-red-600 shadow-none" : ""
              )}
            >
               {isProcessRunning ? <Square size={16} /> : <Play size={16} />}
               {isProcessRunning ? 'Stop Agent' : 'Start Agent'}
            </button>
         </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
         {/* Live Console */}
         <div className="lg:col-span-9 bg-[#050505] border border-border-soft rounded-2xl flex flex-col overflow-hidden shadow-2xl relative">
            <div className="px-5 py-3 border-b border-border-soft bg-bg-secondary/50 flex items-center justify-between">
               <div className="flex items-center gap-3">
                  <div className="flex gap-1.5">
                     <div className="w-2.5 h-2.5 rounded-full bg-error/50" />
                     <div className="w-2.5 h-2.5 rounded-full bg-warning/50" />
                     <div className="w-2.5 h-2.5 rounded-full bg-success/50" />
                  </div>
                  <span className="text-[12px] font-medium text-text-muted">naisora@agent:~</span>
               </div>
               <div className="flex items-center gap-4 text-[11px] text-text-muted font-bold font-plus-jakarta">
                  <span className="flex items-center gap-1.5"><Cpu size={12} /> 12.4% CPU</span>
                  <span className="flex items-center gap-1.5"><Database size={12} /> 256MB RAM</span>
               </div>
            </div>

            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-6 font-mono text-[13px] leading-relaxed no-scrollbar scroll-smooth"
            >
              <div className="space-y-1.5">
                 {logs.map((log, idx) => (
                   <div key={idx} className="flex gap-4 group">
                      <span className="shrink-0 text-text-muted/40 whitespace-nowrap">[{log.time}]</span>
                      <span className={cn(
                        "shrink-0 font-bold",
                        log.type === 'success' ? "text-green-primary" :
                        log.type === 'warning' ? "text-warning" :
                        log.type === 'error' ? "text-error" : "text-info"
                      )}>
                        {log.source}:
                      </span>
                      <span className={cn(
                        "flex-1",
                        log.type === 'success' ? "text-green-primary/80" : "text-text-secondary"
                      )}>
                        {log.message}
                      </span>
                   </div>
                 ))}
                 <div className="flex items-center gap-2 pt-2">
                    <ChevronRight size={14} className="text-green-primary animate-pulse" />
                    <span className="inline-block w-2.5 h-4 bg-green-primary animate-pulse" />
                 </div>
              </div>
            </div>

            {/* Input Area */}
            <form onSubmit={handleCommand} className="p-4 border-t border-border-soft bg-bg-secondary/30">
               <div className="flex items-center gap-4 bg-[#0a0a0a] border border-border-soft rounded-xl px-4 py-3 focus-within:border-green-primary/50 transition-all">
                  <span className="text-green-primary font-bold">$</span>
                  <input 
                    type="text" 
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Enter agent command..."
                    className="flex-1 bg-transparent border-none focus:outline-none text-text-primary text-[14px] placeholder:text-text-muted/30"
                  />
               </div>
            </form>
         </div>

         {/* Side Info */}
         <div className="lg:col-span-3 space-y-6">
            <div className="card p-6 bg-bg-secondary/40 border-border-soft">
               <h3 className="text-[14px] font-bold mb-5 flex items-center gap-2 uppercase tracking-widest">
                  <Zap size={16} className="text-green-primary" /> Active Nodes
               </h3>
               <div className="space-y-5">
                  {[
                    { name: 'Lead Scraper', status: isProcessRunning ? 'active' : 'idle' },
                    { name: 'NLP Scorer', status: 'idle' },
                    { name: 'WhatsApp Bot', status: isProcessRunning ? 'active' : 'idle' },
                  ].map((proc, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                       <span className="text-[13px] text-text-muted font-medium">{proc.name}</span>
                       <div className="flex items-center gap-2">
                          <div className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            proc.status === 'active' ? "bg-green-primary shadow-[0_0_8px_rgba(34,197,94,1)]" : "bg-text-muted"
                          )} />
                          <span className="text-[10px] font-extrabold uppercase text-text-secondary tracking-widest">{proc.status}</span>
                       </div>
                    </div>
                  ))}
               </div>
            </div>

            <div className="card p-6 bg-info/5 border-info/10">
               <h3 className="text-[14px] font-bold mb-4 text-info uppercase tracking-widest">Help Desk</h3>
               <div className="space-y-2">
                  {['/help', '/status', '/sync', '/start'].map((cmd) => (
                    <button 
                      key={cmd}
                      onClick={() => setInputValue(cmd.substring(1))}
                      className="w-full text-left px-3 py-2.5 rounded-xl bg-bg-elevated/50 text-[12px] font-mono hover:bg-info hover:text-white transition-all text-text-muted"
                    >
                      {cmd}
                    </button>
                  ))}
               </div>
            </div>
         </div>
      </div>
    </div>
  )
}
