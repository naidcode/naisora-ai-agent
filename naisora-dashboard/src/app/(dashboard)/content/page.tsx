'use client'

import React, { useState, useEffect } from 'react'
import { 
  FileText, Sparkles, Send, 
  RefreshCw, CheckSquare, Plus,
  Image, Type, Quote
} from 'lucide-react'
import { cn } from '@/lib/utils'

import { supabase } from '@/lib/supabase'
import { runModule } from '@/lib/agent-api'

export default function ContentPage() {
  const [content, setContent] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchContent() {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('content')
          .select('*')
          .order('created_at', { ascending: false })
        
        if (error) throw error
        setContent(data || [])
      } catch (err: any) {
        console.error('Error fetching content:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchContent()
  }, [])

  const handleGenerate = async () => {
    setIsGenerating(true)
    const res = await runModule('blog_generator', { topic: 'Restaurant Marketing 2026' })
    if (res.success) {
      alert('Draft generation started!')
    } else {
      alert('Failed: ' + res.error)
    }
    setIsGenerating(false)
  }

  return (
    <div className="space-y-8 lg:space-y-12 animate-slide-up pb-12">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="space-y-2">
           <h1 className="text-[36px] lg:text-[42px] font-instrument italic font-normal text-text-primary leading-none">AI Content Machine</h1>
           <p className="text-[14px] text-text-muted">Generate high-converting blog and social media assets autonomously.</p>
        </div>
        <button 
          onClick={handleGenerate}
          disabled={isGenerating}
          className="btn-primary disabled:opacity-50"
        >
           {isGenerating ? <RefreshCw className="animate-spin" size={18} /> : <Sparkles size={18} />} 
           {isGenerating ? 'Generating...' : 'Generate New Draft'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         <div className="lg:col-span-1 space-y-6">
            <h2 className="text-[14px] font-bold uppercase tracking-[2px] text-text-muted px-2">Creative Profile</h2>
            <div className="card space-y-6">
               <div>
                  <label className="text-[11px] font-bold text-text-muted uppercase tracking-widest block mb-2">Primary Voice</label>
                  <div className="bg-bg-elevated p-3 rounded-xl border border-border-soft font-bold text-[14px]">Conversational Authority</div>
               </div>
               <div>
                  <label className="text-[11px] font-bold text-text-muted uppercase tracking-widest block mb-2">Target Audience</label>
                  <div className="bg-bg-elevated p-3 rounded-xl border border-border-soft font-bold text-[14px]">Bangalore Restaurant Owners</div>
               </div>
               <div>
                  <label className="text-[11px] font-bold text-text-muted uppercase tracking-widest block mb-2">Content Pillars</label>
                  <div className="flex flex-wrap gap-2 pt-1">
                     <span className="pill bg-green-primary/10 text-green-primary">ROI Focus</span>
                     <span className="pill bg-info/10 text-info">Local SEO</span>
                     <span className="pill bg-warning/10 text-warning">AI Trends</span>
                  </div>
               </div>
            </div>
         </div>

         <div className="lg:col-span-2 space-y-4">
            <h2 className="text-[14px] font-bold uppercase tracking-[2px] text-text-muted px-2">Recent AI Content</h2>
            <div className="space-y-4">
               {loading ? (
                  [1,2,3].map(i => (
                    <div key={i} className="h-24 bg-white/5 rounded-2xl animate-pulse" />
                  ))
               ) : error ? (
                  <div className="card p-12 text-center text-red-500">{error}</div>
               ) : content.length === 0 ? (
                  <div className="card p-12 text-center text-text-muted">No content generated yet.</div>
               ) : content.map((item, idx) => (
                  <div key={item.id} className="card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6 hover:border-green-primary/30 transition-all">
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-bg-elevated flex items-center justify-center text-text-muted">
                           {item.type === 'blog' ? <FileText size={20} /> : <Type size={20} />}
                        </div>
                        <div>
                           <h4 className="text-[16px] font-bold truncate max-w-[300px]">{item.title || item.topic}</h4>
                           <p className="text-[12px] text-text-muted">{item.type?.toUpperCase()} — {new Date(item.created_at).toLocaleDateString()}</p>
                        </div>
                     </div>
                     <div className="flex items-center gap-4">
                        <span className={cn(
                          "pill",
                          item.status === 'published' ? "pill-running" : "bg-bg-elevated text-text-muted"
                        )}>{item.status || 'draft'}</span>
                        <button className="btn-secondary py-2 px-6 text-xs">View</button>
                     </div>
                  </div>
               ))}
            </div>
         </div>
      </div>
    </div>
  )
}
