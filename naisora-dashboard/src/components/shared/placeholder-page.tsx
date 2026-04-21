import React from 'react'

export default function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-[28px] font-plus-jakarta font-bold text-text-primary">{title}</h1>
        <p className="text-text-muted">This module is currently being synchronized with the AI agent core.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-40 bg-bg-card border border-border-default rounded-2xl p-6 relative overflow-hidden">
             <div className="skeleton h-4 w-1/3 mb-4" />
             <div className="skeleton h-8 w-2/3 mb-2" />
             <div className="skeleton h-4 w-1/2" />
             <div className="absolute top-0 right-0 p-6 opacity-10">
               <div className="w-12 h-12 rounded-full border-2 border-dashed border-white/20" />
             </div>
          </div>
        ))}
      </div>
      
      <div className="bg-bg-card border border-border-default rounded-2xl p-8 flex flex-col items-center justify-center text-center min-h-[300px]">
        <div className="w-16 h-16 rounded-2xl bg-green-dim flex items-center justify-center text-green-primary mb-6 animate-pulse">
           <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
           </svg>
        </div>
        <h2 className="text-xl font-plus-jakarta font-bold mb-2">Syncing Data...</h2>
        <p className="text-text-muted max-w-md">The {title} module is establishing a secure tunnel to your AI agent instance on Railway.</p>
      </div>
    </div>
  )
}
