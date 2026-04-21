'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Search, Filter, Plus, MoreHorizontal, 
  MapPin, MessageSquare, Phone, ChevronRight, X,
  ExternalLink, TrendingUp, Users, Target, Mail, RefreshCw
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { runModule } from '@/lib/agent-api'

export default function LeadsPage() {
  const [leads, setLeads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedLead, setSelectedLead] = useState<any>(null)
  const [showNewModal, setShowNewModal] = useState(false)
  const [isScraping, setIsScraping] = useState(false)

  React.useEffect(() => {
    async function fetchLeads() {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('leads')
          .select('*')
          .order('created_at', { ascending: false })
        
        if (error) throw error
        setLeads(data || [])
      } catch (err: any) {
        console.error('Error fetching leads:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchLeads()
  }, [])

  const handleRunScraper = async () => {
    setIsScraping(true)
    const res = await runModule('scraper/googleMapsScraper', { areas: ['Bangalore'], searchTypes: ['restaurants'] })
    if (res.success) {
      alert('Lead scraper started!')
    } else {
      alert('Failed: ' + res.error)
    }
    setIsScraping(false)
  }

  return (
    <div className="space-y-8 animate-slide-up">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="space-y-2">
           <h1 className="text-[36px] lg:text-[42px] font-instrument italic font-normal text-text-primary">Leads Intelligence</h1>
           <p className="text-[14px] text-text-muted">Manage your high-probability restaurant sales pipeline.</p>
        </div>
        <div className="flex items-center gap-3">
           <button 
             onClick={handleRunScraper}
             disabled={isScraping}
             className="flex-1 lg:flex-none btn-secondary text-sm px-6 py-3 disabled:opacity-50"
           >
             <RefreshCw size={18} className={cn("mr-2 inline", isScraping && "animate-spin")} />
             {isScraping ? 'Scraping...' : 'Run Lead Scraper'}
           </button>
           <button 
             onClick={() => setShowNewModal(true)}
             className="flex-1 lg:flex-none btn-primary text-sm px-6 py-3"
           >
             <Plus size={18} /> New Lead
           </button>
        </div>
      </div>

      {/* Grid Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Scoped', value: '1,284', icon: Users },
          { label: 'Conversion', value: '14.2%', icon: Target },
          { label: 'Hot Leads', value: '42', icon: TrendingUp },
          { label: 'In Queue', value: '156', icon: MessageSquare },
        ].map((stat, idx) => (
          <div key={idx} className="card p-4 lg:p-5 group">
             <div className="w-8 h-8 rounded-lg bg-bg-elevated flex items-center justify-center text-text-muted mb-4 group-hover:text-green-primary transition-all">
                <stat.icon size={16} />
             </div>
             <p className="text-[11px] font-bold text-text-muted uppercase tracking-widest">{stat.label}</p>
             <h3 className="text-[20px] lg:text-[24px] font-plus-jakarta font-bold mt-1">{stat.value}</h3>
          </div>
        ))}
      </div>

      {/* Mobile-First: Search & Table Transformed to Cards */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-[400px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
            <input 
              type="text" 
              placeholder="Search leads..."
              className="w-full bg-bg-secondary border border-border-soft rounded-2xl py-3 pl-12 pr-4 text-[14px] focus:outline-none focus:border-green-primary transition-all"
            />
          </div>
          <button className="w-full md:w-auto flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border border-border-strong text-[14px] font-medium text-text-secondary hover:bg-bg-elevated">
            <Filter size={18} /> Filters
          </button>
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block card p-0 overflow-hidden">
          {loading ? (
            <div className="p-12 space-y-4">
               {[1,2,3,4,5].map(i => (
                 <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />
               ))}
            </div>
          ) : error ? (
            <div className="p-20 text-center space-y-4">
               <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 mx-auto">
                  <X size={32} />
               </div>
               <h3 className="text-xl font-bold text-text-primary">Failed to load leads</h3>
               <p className="text-text-muted">{error}</p>
            </div>
          ) : leads.length === 0 ? (
            <div className="p-20 text-center space-y-4">
               <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-text-muted mx-auto">
                  <Users size={32} />
               </div>
               <h3 className="text-xl font-bold text-text-primary">No leads found</h3>
               <p className="text-text-muted">Start the lead scraper to find new opportunities.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-bg-elevated/10 border-b border-border-soft">
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-text-muted">Restaurant</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-text-muted">Score</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-text-muted">Status</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-text-muted">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-soft">
                {leads.map((lead) => (
                  <tr 
                    key={lead.id} 
                    onClick={() => setSelectedLead(lead)}
                    className="hover:bg-white/5 transition-all cursor-pointer group"
                  >
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-bg-elevated flex items-center justify-center font-bold text-green-primary">
                          {lead.business_name?.[0] || 'L'}
                        </div>
                        <div>
                          <h4 className="text-[14px] font-bold text-text-primary">{lead.business_name}</h4>
                          <div className="flex items-center gap-1 text-[12px] text-text-muted">
                             <MapPin size={10} /> {lead.area || 'Bangalore'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                         <span className={cn(
                           "pill",
                           (lead.computed_score || 0) > 90 ? "pill-running" : (lead.computed_score || 0) > 70 ? "bg-info/10 text-info" : "pill-warning"
                         )}>{lead.computed_score || lead.score || 0}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className={cn(
                        "pill",
                        lead.status === 'Hot' ? "pill-running" : "bg-bg-elevated text-text-muted"
                      )}>{lead.status || 'New'}</span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                         <button className="p-2 rounded-lg hover:bg-bg-elevated text-text-muted group-hover:text-green-primary transition-all">
                           <Mail size={16} />
                         </button>
                         <button className="p-2 rounded-lg hover:bg-bg-elevated text-text-muted group-hover:text-green-primary transition-all">
                           <MoreHorizontal size={16} />
                         </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Mobile Card View */}
        <div className="lg:hidden space-y-4 pb-20">
          {loading ? (
            [1,2,3].map(i => (
              <div key={i} className="h-32 bg-white/5 rounded-2xl animate-pulse" />
            ))
          ) : leads.map((lead) => (
            <div 
              key={lead.id} 
              onClick={() => setSelectedLead(lead)}
              className="card bg-bg-secondary/60 hover:glow-green"
            >
              <div className="flex justify-between items-start mb-4">
                 <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-bg-elevated flex items-center justify-center font-bold text-green-primary text-xl">
                      {lead.business_name?.[0] || 'L'}
                    </div>
                    <div>
                      <h4 className="text-[16px] font-bold text-text-primary">{lead.business_name}</h4>
                      <p className="text-[12px] text-text-muted">{lead.area || 'Bangalore'}</p>
                    </div>
                 </div>
                 <span className={cn(
                    "pill",
                    lead.status === 'Hot' ? "pill-running" : "bg-bg-elevated text-text-muted"
                 )}>{lead.status || 'New'}</span>
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-border-soft">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-text-muted tracking-widest">Lead Score</span>
                    <span className="text-[14px] font-bold text-green-primary">{(lead.computed_score || lead.score || 0)}/100</span>
                  </div>
                  <ChevronRight size={20} className="text-text-muted" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Slide-in Detail Detail Panel */}
      <AnimatePresence>
        {selectedLead && (
          <>
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setSelectedLead(null)}
               className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100]"
            />
            <motion.div 
               initial={{ x: '100%' }}
               animate={{ x: 0 }}
               exit={{ x: '100%' }}
               transition={{ type: 'spring', damping: 25, stiffness: 200 }}
               className="fixed top-0 bottom-0 right-0 w-full max-w-[500px] bg-bg-main border-l border-border-soft z-[110] p-8 overflow-y-auto"
            >
               <div className="flex items-center justify-between mb-10">
                  <span className="pill pill-running">AI SCORING ACTIVE</span>
                  <button onClick={() => setSelectedLead(null)} className="w-10 h-10 rounded-full bg-bg-secondary flex items-center justify-center text-text-muted hover:text-white">
                    <X size={20} />
                  </button>
               </div>

               <div className="flex items-center gap-6 mb-12">
                  <div className="w-20 h-20 rounded-3xl bg-green-primary flex items-center justify-center text-bg-main font-bold text-[32px]">
                    {(selectedLead.business_name || 'L')[0]}
                  </div>
                  <div>
                    <h2 className="text-[28px] font-instrument italic leading-none mb-1">{selectedLead.business_name}</h2>
                    <p className="text-text-muted">{selectedLead.area || 'Bangalore'}, India</p>
                  </div>
               </div>

               <div className="space-y-8">
                  <div className="grid grid-cols-2 gap-4">
                     <div className="card bg-bg-secondary/40">
                        <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">Probability</p>
                        <h4 className="text-[20px] font-bold text-green-primary">{selectedLead.computed_score || selectedLead.score || 0}%</h4>
                     </div>
                     <div className="card bg-bg-secondary/40">
                        <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">Industry</p>
                        <h4 className="text-[18px] font-bold">Restaurant</h4>
                     </div>
                  </div>

                  <div className="space-y-4">
                     <h3 className="text-[14px] font-bold uppercase tracking-widest text-text-muted">Intelligence Notes</h3>
                     <div className="card bg-bg-secondary/20 p-4 border-l-4 border-green-primary">
                        <p className="text-[13px] text-text-secondary leading-relaxed">Agent detected high social activity on Instagram last night. Owner posted about a new fusion menu. High engagement opportunity detected.</p>
                     </div>
                  </div>

                  <div className="space-y-4">
                     <h3 className="text-[14px] font-bold uppercase tracking-widest text-text-muted">Agent Memory</h3>
                     <div className="space-y-4 pl-2">
                        {[
                          { time: '2h ago', event: 'Scraped Instagram profile' },
                          { time: '1d ago', event: 'Calculated sentiment score' },
                          { time: '3d ago', event: 'Lead identified in G-Maps' },
                        ].map((m, i) => (
                          <div key={i} className="flex gap-4 relative">
                            <div className="w-2 h-2 rounded-full bg-border-strong mt-1.5" />
                            <div>
                               <p className="text-[13px] font-medium">{m.event}</p>
                               <p className="text-[11px] text-text-muted">{m.time}</p>
                            </div>
                          </div>
                        ))}
                     </div>
                  </div>
               </div>

               {/* Sticky Action Bar */}
               <div className="sticky bottom-0 left-0 right-0 pt-12 pb-4 bg-gradient-to-t from-bg-main to-transparent">
                  <div className="flex gap-3">
                     <button className="flex-1 btn-primary py-4">
                        <MessageSquare size={18} /> Send WhatsApp
                     </button>
                     <button className="w-14 btn-secondary flex items-center justify-center p-0">
                        <Phone size={18} />
                     </button>
                  </div>
               </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      {/* New Lead Modal */}
      <AnimatePresence>
        {showNewModal && (
          <>
            <motion.div 
               initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
               onClick={() => setShowNewModal(false)}
               className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[200]"
            />
            <motion.div 
               initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
               className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[450px] aspect-video bg-bg-secondary border border-border-strong rounded-3xl z-[210] p-10 text-center flex flex-col items-center justify-center gap-6 shadow-2xl"
            >
               <div className="w-16 h-16 rounded-full bg-green-primary/10 flex items-center justify-center text-green-primary">
                  <Plus size={32} />
               </div>
               <h2 className="text-[24px] font-instrument italic">Add New Lead Intelligence</h2>
               <p className="text-text-muted text-sm">Our agent will automatically score and enrichment this lead after creation.</p>
               <button onClick={() => setShowNewModal(false)} className="btn-primary w-full py-4">Create Lead (Mock)</button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
