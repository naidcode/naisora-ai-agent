'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { 
  Send, MessageSquare, Target, Zap, 
  RefreshCw, TrendingUp, MousePointer2,
  ChevronRight, ArrowRight
} from 'lucide-react'
import { cn } from '@/lib/utils'

import { runModule } from '@/lib/agent-api'

const OutreachPage = () => {
  const [isScanning, setIsScanning] = React.useState(false)

  const handleScan = async () => {
    setIsScanning(true)
    const res = await runModule('scraper/googleMapsScraper', {
      areas: ["Koramangala", "Indiranagar"],
      searchTypes: ["restaurants"],
      maxPerSearch: 10
    })
    if (res.success) {
      alert('Lead scanning started!')
    } else {
      alert('Failed to start scan: ' + res.error)
    }
    setIsScanning(false)
  }

  return (
    <div className="space-y-8 lg:space-y-12 animate-slide-up">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="space-y-2">
           <h1 className="text-[36px] lg:text-[42px] font-instrument italic font-normal text-text-primary">Outreach Engine</h1>
           <p className="text-[14px] text-text-muted">Automated conversational intelligence and campaign monitoring.</p>
        </div>
        <div className="flex items-center gap-3">
           <button className="flex-1 lg:flex-none btn-secondary text-sm">Refresh Stats</button>
           <button 
             onClick={handleScan}
             disabled={isScanning}
             className="flex-1 lg:flex-none btn-primary text-sm shadow-lg shadow-green-primary/10 disabled:opacity-50"
           >
             <RefreshCw size={18} className={cn(isScanning && "animate-spin")} /> {isScanning ? 'Scanning...' : 'Scan New Leads'}
           </button>
        </div>
      </div>

      {/* Stats Quick Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {[
          { label: 'Msgs Sent', value: '8,432', icon: Send, color: 'text-info' },
          { label: 'Reply Rate', value: '12.8%', icon: MessageSquare, color: 'text-warning' },
          { label: 'Open Rate', value: '64.2%', icon: MousePointer2, color: 'text-green-primary' },
          { label: 'Success', value: '94%', icon: Target, color: 'text-success' },
        ].map((stat, idx) => (
          <div key={idx} className="card p-5 group">
             <div className="w-10 h-10 rounded-2xl bg-bg-elevated flex items-center justify-center text-text-muted mb-4 group-hover:text-green-primary transition-all">
                <stat.icon size={20} />
             </div>
             <p className="text-[11px] font-bold text-text-muted uppercase tracking-[2px]">{stat.label}</p>
             <h3 className={cn("text-[24px] lg:text-[28px] font-plus-jakarta font-bold mt-1", stat.color)}>{stat.value}</h3>
          </div>
        ))}
      </div>

      {/* Mission Control Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
         <div className="lg:col-span-8 card bg-gradient-to-br from-bg-secondary to-bg-main p-8 min-h-[400px] flex flex-col justify-between">
            <div>
               <div className="flex items-center gap-2 mb-6">
                  <div className="w-2 h-2 rounded-full bg-green-primary animate-pulse" />
                  <span className="text-[11px] font-bold text-green-primary uppercase tracking-[2px]">System Status: Optimization Phase</span>
               </div>
               <h2 className="text-[28px] lg:text-[36px] font-instrument italic mb-4">Agent is currently drafting <span className="text-green-primary">24 new DMs</span> for Bangalore restaurants.</h2>
               <p className="text-text-muted max-w-xl leading-relaxed text-[15px]">The agent has detected a trend in "organic food" interest across 14 target restaurants. Adjusting campaign language to focus on supply chain transparency.</p>
            </div>
            
            <div className="flex flex-wrap gap-4 mt-12">
               <div className="bg-bg-elevated/50 px-4 py-2 rounded-xl border border-border-soft flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-info" />
                  <span className="text-[13px] font-bold">Email Channel ACTIVE</span>
               </div>
               <div className="bg-bg-elevated/50 px-4 py-2 rounded-xl border border-border-soft flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-success" />
                  <span className="text-[13px] font-bold">WhatsApp Channel ACTIVE</span>
               </div>
            </div>
         </div>

         <div className="lg:col-span-4 space-y-6">
            <div className="card p-6 bg-white/5 border-white/10 group">
               <h3 className="text-[12px] font-bold text-text-muted uppercase tracking-widest mb-4">A/B Testing Beta</h3>
               <div className="space-y-4">
                  <div className="space-y-2">
                     <div className="flex justify-between items-center text-[13px]">
                        <span className="font-bold">Growth Formula</span>
                        <span className="text-green-primary">84% success</span>
                     </div>
                     <div className="h-1.5 w-full bg-bg-elevated rounded-full overflow-hidden">
                        <div className="h-full bg-green-primary w-[84%]" />
                     </div>
                  </div>
                  <div className="space-y-2">
                     <div className="flex justify-between items-center text-[13px]">
                        <span className="font-bold">Direct ROI Hook</span>
                        <span className="text-info">52% success</span>
                     </div>
                     <div className="h-1.5 w-full bg-bg-elevated rounded-full overflow-hidden">
                        <div className="h-full bg-info w-[52%]" />
                     </div>
                  </div>
               </div>
               <button className="w-full mt-6 flex items-center justify-center gap-2 text-[13px] font-bold text-text-muted hover:text-white transition-all">
                  Manage Variants <ArrowRight size={14} />
               </button>
            </div>

            <div className="card p-6 border-green-primary/20 bg-green-primary/5 glow-green">
               <h3 className="text-[12px] font-bold text-green-primary uppercase tracking-widest mb-4">Agent Suggestion</h3>
               <p className="text-[14px] text-text-secondary leading-relaxed mb-6">"Based on current data, your reply rate is highest at **11:00 AM IST**. Should I reschedule all pending messages to this slot?"</p>
               <button className="btn-primary w-full py-3 text-sm">Reschedule Now</button>
            </div>
         </div>
      </div>
    </div>
  )
}

export default OutreachPage
