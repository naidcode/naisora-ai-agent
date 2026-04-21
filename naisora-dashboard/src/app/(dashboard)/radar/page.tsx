'use client'

import React from 'react'
import { Radar as RadarIcon, Sparkles, Zap, TrendingUp, Target, ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const opportunities = [
  { title: 'New Hospitality Cluster in Indiranagar', probability: 94, impact: 'High', desc: '4 new fine-dining restaurants opened this week. Lead density is 3x average.' },
  { title: 'Decreasing Domain Velocity for Competitor', probability: 82, impact: 'Medium', desc: 'Competitor "XYZ Agency" stopped posting blogs. Opportunity to capture organic traffic.' },
  { title: 'Social Engagement Spike for "The Golden Spoon"', probability: 78, impact: 'High', desc: '350% increase in comments on recent post. High intent signal detected.' },
]

export default function RadarPage() {
  return (
    <div className="space-y-8 lg:space-y-12 animate-slide-up pb-12">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="space-y-2">
           <h1 className="text-[36px] lg:text-[42px] font-instrument italic font-normal text-text-primary leading-none">Opportunity Radar</h1>
           <p className="text-[14px] text-text-muted">Autonomous market analysis and high-probability business triggers.</p>
        </div>
        <button className="btn-primary">
           <RefreshCw size={18} className="animate-spin-slow" /> Re-Scan Market
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
         {opportunities.map((opp, idx) => (
           <div key={idx} className="card p-8 bg-gradient-to-br from-bg-secondary to-bg-main hover:border-green-primary/30 transition-all group">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                 <div className="flex items-start gap-6">
                    <div className="w-14 h-14 rounded-2xl bg-green-primary/10 border border-green-primary/20 flex items-center justify-center text-green-primary shrink-0 group-hover:scale-110 transition-transform">
                       <Zap size={28} />
                    </div>
                    <div className="space-y-2">
                       <div className="flex items-center gap-3">
                          <h3 className="text-[22px] font-bold text-text-primary">{opp.title}</h3>
                          <span className={cn(
                            "pill text-[10px]",
                            opp.impact === 'High' ? "pill-running" : "bg-info/10 text-info"
                          )}>{opp.impact} Impact</span>
                       </div>
                       <p className="text-[15px] text-text-muted max-w-2xl leading-relaxed">{opp.desc}</p>
                    </div>
                 </div>
                 
                 <div className="flex items-center gap-8 lg:text-right">
                    <div className="space-y-1">
                       <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest block">Probability</span>
                       <span className="text-[28px] font-plus-jakarta font-bold text-green-primary">{opp.probability}%</span>
                    </div>
                    <button className="btn-primary py-3.5 px-8 shadow-lg shadow-green-primary/10">Execute Action</button>
                 </div>
              </div>
           </div>
         ))}
      </div>

      {/* Analytics Section */}
      <div className="card p-12 text-center space-y-6 bg-white/5 border-white/10">
         <RadarIcon size={64} className="mx-auto text-text-muted opacity-20" />
         <h3 className="text-[24px] font-instrument italic">The Radar is scanning 1,424 nodes across Bangalore.</h3>
         <p className="text-text-muted max-w-lg mx-auto">Our agent is currently analyzing real-time data from G-Maps, Instagram, and LinkedIn to find your next high-converting client.</p>
         <div className="pt-4">
            <span className="bg-bg-elevated px-4 py-2 rounded-full border border-border-soft text-[12px] font-bold text-text-secondary">
               Next scan in 14 minutes
            </span>
         </div>
      </div>
    </div>
  )
}

function RefreshCw({ size, className }: { size?: number, className?: string }) {
  return <TrendingUp size={size} className={className} />
}
