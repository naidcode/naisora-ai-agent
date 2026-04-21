'use client'

import React from 'react'
import { 
  Globe, Search, TrendingUp, ArrowUpRight, 
  BarChart2, MousePointer2, Target, Link as LinkIcon
} from 'lucide-react'
import { cn } from '@/lib/utils'

const keywords = [
  { term: 'best restaurant in bangalore', volume: '12k', rank: 3, trend: '+2' },
  { term: 'ai marketing for cafes', volume: '4.5k', rank: 12, trend: '+14' },
  { term: 'restaurant growth agency', volume: '8.2k', rank: 1, trend: '0' },
  { term: 'bangalore hospitality leads', volume: '2.1k', rank: 24, trend: '-3' },
  { term: 'automated restaurant outreach', volume: '1.2k', rank: 5, trend: '+8' },
]

export default function SeoPage() {
  return (
    <div className="space-y-8 lg:space-y-12 animate-slide-up pb-12">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="space-y-2">
           <h1 className="text-[36px] lg:text-[42px] font-instrument italic font-normal text-text-primary leading-none">SEO Intelligence</h1>
           <p className="text-[14px] text-text-muted">Global visibility and keyword performance monitoring.</p>
        </div>
        <div className="flex items-center gap-3">
           <button className="flex-1 lg:flex-none btn-secondary text-sm">Download Report</button>
           <button className="flex-1 lg:flex-none btn-primary text-sm">Scan Keywords</button>
        </div>
      </div>

      {/* Overview Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Avg Position', value: '4.2', trend: '+1.2', icon: Target },
          { label: 'Organic Traffic', value: '18.4k', trend: '+24%', icon: TrendingUp },
          { label: 'Domain Rating', value: '42', trend: '+4', icon: Globe },
          { label: 'Backlinks', value: '852', trend: '+12', icon: LinkIcon },
        ].map((stat, idx) => (
          <div key={idx} className="card p-5">
             <p className="text-[11px] font-bold text-text-muted uppercase tracking-[2px] mb-4">{stat.label}</p>
             <div className="flex items-end justify-between">
                <h3 className="text-[28px] font-plus-jakarta font-bold line-none leading-none">{stat.value}</h3>
                <span className="text-[12px] font-bold text-green-primary">{stat.trend}</span>
             </div>
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
         {/* Keywords Table */}
         <div className="lg:col-span-8 space-y-4">
            <h2 className="text-[14px] font-bold uppercase tracking-[2px] text-text-muted px-2">Top Keywords</h2>
            <div className="card p-0 overflow-hidden">
               <table className="w-full text-left">
                  <thead>
                     <tr className="border-b border-border-soft bg-bg-secondary/40">
                        <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-text-muted">Term</th>
                        <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-text-muted text-center">Volume</th>
                        <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-text-muted text-center">Pos</th>
                        <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-text-muted text-right">Trend</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-border-soft">
                     {keywords.map((kw, i) => (
                       <tr key={i} className="hover:bg-white/5 transition-colors group">
                          <td className="px-6 py-5 font-medium text-[14px] text-text-primary">{kw.term}</td>
                          <td className="px-6 py-5 text-[14px] text-text-muted text-center">{kw.volume}</td>
                          <td className="px-6 py-5 text-center">
                             <span className={cn(
                               "px-2 py-1 rounded-lg font-bold text-[13px]",
                               kw.rank <= 3 ? "bg-green-primary/10 text-green-primary" : "bg-bg-elevated text-text-muted"
                             )}>#{kw.rank}</span>
                          </td>
                          <td className="px-6 py-5 text-right">
                             <span className={cn(
                               "text-[12px] font-bold",
                               kw.trend.startsWith('+') ? "text-green-primary" : kw.trend.startsWith('-') ? "text-error" : "text-text-muted"
                             )}>{kw.trend}</span>
                          </td>
                       </tr>
                     ))}
                  </tbody>
               </table>
            </div>
         </div>

         {/* Health Score */}
         <div className="lg:col-span-4 space-y-6">
            <h2 className="text-[14px] font-bold uppercase tracking-[2px] text-text-muted px-2">Visibility Health</h2>
            <div className="card p-8 flex flex-col items-center text-center">
               <div className="relative w-32 h-32 mb-6">
                  <svg className="w-full h-full transform -rotate-90">
                     <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-bg-elevated" />
                     <circle 
                        cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="12" fill="transparent" 
                        strokeDasharray="364" strokeDashoffset="44"
                        className="text-green-primary" 
                     />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                     <span className="text-[32px] font-bold">88</span>
                     <span className="text-[10px] uppercase font-bold text-text-muted tracking-widest">Great</span>
                  </div>
               </div>
               <h4 className="text-[18px] font-bold mb-2">Visibility is Peak</h4>
               <p className="text-[13px] text-text-muted">Agent has fixed 14 broken links and optimized all meta-tags this week.</p>
               <button className="w-full btn-secondary mt-8 text-xs py-3 border-border-soft hover:border-green-primary">Full Content Audit</button>
            </div>
         </div>
      </div>
    </div>
  )
}
