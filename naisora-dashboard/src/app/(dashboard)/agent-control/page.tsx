'use client'

import React from 'react'
import { 
  Cpu, Power, Shield, Settings, 
  Terminal, Activity, Zap, Play, 
  Square, RefreshCw, AlertTriangle
} from 'lucide-react'
import { cn } from '@/lib/utils'

import { getAgentStatus, runModule } from '@/lib/agent-api'
import { useAgentStatus } from '@/hooks/useAgentStatus'

export default function AgentControlPage() {
  const { status, uptime } = useAgentStatus()
  const [isSyncing, setIsSyncing] = React.useState(false)

  const handleSync = async () => {
    setIsSyncing(true)
    const res = await runModule('system/masterSwitch', { action: 'sync' })
    if (res.success) {
      alert('Agent synchronized successfully!')
    } else {
      alert('Sync failed: ' + res.error)
    }
    setIsSyncing(false)
  }

  const handleStop = async () => {
    if (!confirm('This will stop all autonomous operations. Are you sure?')) return
    await runModule('system/masterSwitch', { action: 'stop' })
    alert('Emergency Stop command sent.')
  }

  return (
    <div className="space-y-8 lg:space-y-12 animate-slide-up pb-12">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="space-y-2">
           <h1 className="text-[36px] lg:text-[42px] font-instrument italic font-normal text-text-primary leading-none">Agent Nerve Center</h1>
           <p className="text-[14px] text-text-muted">Master control for autonomous operations and AI stability.</p>
        </div>
        <div className="flex items-center gap-3">
           <button className="flex-1 lg:flex-none btn-secondary text-sm">Safe Mode</button>
           <button 
             onClick={handleStop}
             className="flex-1 lg:flex-none btn-primary bg-error text-white hover:bg-red-600 border-none text-sm"
           >
             <Power size={18} /> Emergency Stop
           </button>
        </div>
      </div>

      {/* Control Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         {/* Live Status Card */}
         <div className="lg:col-span-1 space-y-6">
             <div className={cn(
               "card p-8 border-green-primary/30 text-center",
               status === 'running' ? "bg-green-primary/5 glow-green" : "bg-red-500/5"
             )}>
                <div className="relative w-24 h-24 mx-auto mb-6">
                   <div className={cn(
                     "absolute inset-0 rounded-full blur-2xl opacity-20",
                     status === 'running' ? "bg-green-primary animate-pulse" : "bg-red-500"
                   )} />
                   <div className={cn(
                     "relative bg-bg-secondary w-full h-full rounded-2xl border flex items-center justify-center shadow-2xl",
                     status === 'running' ? "border-green-primary/50 text-green-primary" : "border-red-500/50 text-red-500"
                   )}>
                      <Cpu size={40} className={status === 'running' ? "animate-pulse" : ""} />
                   </div>
                </div>
                <h3 className="text-[20px] font-bold text-text-primary mb-1">Agent-01-NAS</h3>
                <p className={cn(
                  "text-[12px] font-bold uppercase tracking-[2px] mb-8",
                  status === 'running' ? "text-green-primary" : "text-red-500"
                )}>{status === 'running' ? 'Active & Stable' : 'Offline'}</p>
                
                <div className="space-y-3">
                   <div className="flex justify-between text-[13px] p-3 rounded-xl bg-bg-elevated/40 border border-border-soft">
                      <span className="text-text-muted">Agent Uptime</span>
                      <span className="font-bold">{Math.floor(uptime / 60)}m {Math.floor(uptime % 60)}s</span>
                   </div>
                   <div className="flex justify-between text-[13px] p-3 rounded-xl bg-bg-elevated/40 border border-border-soft">
                      <span className="text-text-muted">Status</span>
                      <span className="font-bold capitalize">{status}</span>
                   </div>
                </div>
             </div>

             <div className="card p-6 border-warning/10 bg-warning/5">
                 <div className="flex items-center gap-3 mb-4">
                   <AlertTriangle className="text-warning" size={20} />
                   <h4 className="text-[14px] font-bold text-warning uppercase">Security Log</h4>
                 </div>
                 <p className="text-[13px] text-text-muted leading-relaxed">No unauthorized access attempts blocked in last 24h. Environment isolated and secured.</p>
             </div>
          </div>

          {/* Configuration Settings */}
          <div className="lg:col-span-2 space-y-6">
             <h2 className="text-[14px] font-bold uppercase tracking-[2px] text-text-muted px-2">Operational Bounds</h2>
             <div className="card space-y-8">
                {[
                  { label: 'Autonomous Scoping', desc: 'Allows agent to find new leads without approval.', toggle: true },
                  { label: 'Direct Outreach', desc: 'Allows agent to send messages after scoring.', toggle: false },
                  { label: 'Social Content Generation', desc: 'Automatically drafts blog and Instagram posts.', toggle: true },
                  { label: 'Priority Escalation', desc: 'Escalates critical alerts to primary phone.', toggle: true },
                ].map((setting, idx) => (
                  <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2 first:pt-0 last:pb-0">
                     <div className="space-y-1">
                        <h4 className="text-[16px] font-bold">{setting.label}</h4>
                        <p className="text-[13px] text-text-muted max-w-sm">{setting.desc}</p>
                     </div>
                     <button className={cn(
                       "relative w-12 h-6 rounded-full transition-all duration-300 shrink-0",
                       setting.toggle ? "bg-green-primary" : "bg-bg-elevated"
                     )}>
                        <div className={cn(
                          "absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-300 shadow-xl",
                          setting.toggle ? "left-7" : "left-1"
                        )} />
                     </button>
                  </div>
                ))}
             </div>

             <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div 
                  onClick={handleSync}
                  className={cn(
                    "card p-6 group hover:border-green-primary/30 transition-all cursor-pointer",
                    isSyncing && "opacity-50 pointer-events-none"
                  )}
                >
                   <div className="flex items-center justify-between mb-2">
                      <span className="text-[12px] font-bold text-text-muted uppercase tracking-widest">Railway Sync</span>
                      <RefreshCw size={16} className={cn("text-green-primary", isSyncing && "animate-spin")} />
                   </div>
                   <h3 className="text-[18px] font-bold">Synchronize Agent</h3>
                   <p className="text-[12px] text-text-muted mt-1">Push latest memory and model weights.</p>
                </div>
               <div className="card p-6 group hover:border-info/30 transition-all cursor-pointer">
                  <div className="flex items-center justify-between mb-2">
                     <span className="text-[12px] font-bold text-text-muted uppercase tracking-widest">Model Sandbox</span>
                     <Shield size={16} className="text-info" />
                  </div>
                  <h3 className="text-[18px] font-bold">Training Mode</h3>
                  <p className="text-[12px] text-text-muted mt-1">Run agent in testing environment only.</p>
               </div>
            </div>
         </div>
      </div>
    </div>
  )
}
