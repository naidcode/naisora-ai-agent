'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { 
  Zap, TrendingUp, Users, MessageSquare, 
  ArrowUpRight, ChevronRight, Play, CheckCircle2,
  AlertCircle, Sparkles, Plus
} from 'lucide-react'
import { cn } from '@/lib/utils'

import { supabase } from '@/lib/supabase'

const CommandCenter = () => {
  const [stats, setStats] = React.useState({
    leads: '0',
    messages: '0',
    replies: '0%',
    revenue: '$0'
  })
  const [feed, setFeed] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true)
        
        // Fetch Stats
        const { count: leadCount } = await supabase.from('leads').select('*', { count: 'exact', head: true })
        const { count: outreachCount } = await supabase.from('outreach').select('*', { count: 'exact', head: true })
        
        setStats({
          leads: (leadCount || 0).toString(),
          messages: (outreachCount || 0).toString(),
          replies: '14.2%', // Mocked for now as we need deeper queries
          revenue: '$2.4k'   // Mocked for now
        })

        // Fetch recent activity from alerts
        const { data: recentAlerts } = await supabase
          .from('alerts')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10)
        
        setFeed(recentAlerts || [])

      } catch (err) {
        console.error('Overview fetch error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()

    // Realtime Subscriptions
    const channel = supabase
      .channel('live-dashboard')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'alerts'
      }, (payload) => {
        setFeed(prev => [payload.new, ...prev.slice(0, 9)])
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'leads'
      }, (payload: any) => {
        setStats(prev => ({ ...prev, leads: (parseInt(prev.leads) + 1).toString() }))
        // Also add to feed
        setFeed(prev => [{
          id: payload.new.id,
          title: 'New Lead Found',
          message: `Agent identified ${payload.new.business_name} in ${payload.new.area}`,
          type: 'info',
          created_at: payload.new.created_at
        }, ...prev.slice(0, 9)])
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return (
    <div className="space-y-8 lg:space-y-12">
      {/* 1. Header & Agent Status */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="space-y-2">
           <h1 className="text-[36px] lg:text-[48px] font-instrument italic font-normal text-text-primary leading-[1.1]">Command Center</h1>
           <p className="text-[14px] lg:text-[16px] text-text-muted max-w-md">Your AI agent is active and optimizing current workflows.</p>
        </div>
        <div className="flex items-center gap-3">
           <button className="flex-1 lg:flex-none btn-secondary text-sm px-6 py-3">View Logs</button>
           <button className="flex-1 lg:flex-none btn-primary text-sm px-6 py-3">
             <Plus size={18} /> New Campaign
           </button>
        </div>
      </div>

      {/* 2. Today Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 overflow-x-auto pb-4 sm:pb-0 scrollbar-hide no-scrollbar">
        {[
          { label: 'Total Leads', value: stats.leads, trend: '+12%', icon: Users },
          { label: 'Msgs Sent', value: stats.messages, trend: '+5%', icon: MessageSquare },
          { label: 'Reply Rate', value: stats.replies, trend: '+2.1%', icon: TrendingUp },
          { label: 'Rev Prediction', value: stats.revenue, trend: '+14%', icon: Zap },
        ].map((stat, idx) => (
          <div key={idx} className="card min-w-[240px] sm:min-w-0 group hover:glow-green">
             <div className="flex justify-between items-start mb-6">
                <div className="w-10 h-10 rounded-xl bg-bg-elevated flex items-center justify-center text-text-muted group-hover:text-green-primary transition-all">
                   <stat.icon size={20} />
                </div>
                <div className="flex items-center gap-1 text-[11px] font-bold text-green-primary bg-green-primary/10 px-2 py-0.5 rounded-full">
                   {stat.trend}
                </div>
             </div>
             <p className="text-[13px] text-text-muted font-medium mb-1">{stat.label}</p>
             <h3 className="text-[28px] font-plus-jakarta font-bold text-text-primary">{loading ? '...' : stat.value}</h3>
          </div>
        ))}
      </div>

      {/* 3. AI Suggestions */}
      <div className="space-y-4">
        <h2 className="text-[14px] font-bold uppercase tracking-[2px] text-text-muted px-2">Intelligence Radar</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
           <div className="card bg-green-primary/5 border-green-primary/20 glow-green relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Sparkles size={120} className="text-green-primary" />
              </div>
              <div className="relative z-10 flex flex-col h-full">
                 <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-green-primary flex items-center justify-center text-bg-main shadow-lg shadow-green-primary/20">
                       <Zap size={16} fill="currentColor" />
                    </div>
                    <span className="text-[12px] font-bold text-green-primary uppercase tracking-widest">High Probability</span>
                 </div>
                 <h3 className="text-[20px] font-bold mb-2">Optimize Outreach Strategy</h3>
                 <p className="text-[14px] text-text-muted mb-8 max-w-sm">Agent suggests shifting focus to "Instagram DM" for hospitality leads in Bangalore. Predicted reply rate +12%.</p>
                 <div className="mt-auto">
                    <button className="flex items-center gap-2 text-[14px] font-bold text-green-primary hover:gap-3 transition-all group/btn">
                       Authorize Agent <ChevronRight size={16} />
                    </button>
                 </div>
              </div>
           </div>

           <div className="card bg-white/5 border-white/10 group relative overflow-hidden">
              <div className="relative z-10 flex flex-col h-full">
                 <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-text-muted">
                       <TrendingUp size={16} />
                    </div>
                    <span className="text-[12px] font-bold text-text-muted uppercase tracking-widest">Market Insight</span>
                 </div>
                 <h3 className="text-[20px] font-bold mb-2">New Competitor Detected</h3>
                 <p className="text-[14px] text-text-muted mb-8 max-w-sm">"Cloud Kitchen OS" is targeting 3 of your high-value restaurants. Suggested counter-offer ready.</p>
                 <div className="mt-auto">
                    <button className="flex items-center gap-2 text-[14px] font-bold text-text-primary hover:gap-3 transition-all group/btn">
                       Analyze Risks <ChevronRight size={16} />
                    </button>
                 </div>
              </div>
           </div>
        </div>
      </div>

      {/* 4. Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
         {/* Tasks */}
         <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between px-2">
               <h2 className="text-[14px] font-bold uppercase tracking-[2px] text-text-muted">Current Stack</h2>
               <button className="text-[11px] font-bold text-green-primary hover:underline">View All</button>
            </div>
            <div className="space-y-3">
               {[
                 { title: 'Finalize SEO Strategy', tag: 'High', due: '2h', status: 'pending' },
                 { title: 'Update Client Portal', tag: 'Medium', due: '5h', status: 'in-progress' },
                 { title: 'Scrape Bangalore Cafes', tag: 'Low', due: '1d', status: 'completed' },
               ].map((task, idx) => (
                 <div key={idx} className="card py-4 flex items-center justify-between group bg-bg-secondary/40">
                    <div className="flex items-center gap-4">
                       <button className={cn(
                         "w-6 h-6 rounded-md border-2 transition-all flex items-center justify-center",
                         task.status === 'completed' ? "bg-green-primary border-green-primary text-bg-main" : "border-border-strong group-hover:border-green-primary"
                       )}>
                         {task.status === 'completed' && <CheckCircle2 size={14} />}
                       </button>
                       <div>
                          <p className={cn("text-[14px] font-medium transition-all", task.status === 'completed' && "text-text-muted line-through")}>{task.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                             <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">{task.tag}</span>
                             <span className="text-[10px] text-text-muted/60">•</span>
                             <span className="text-[10px] text-text-muted/60">Due in {task.due}</span>
                          </div>
                       </div>
                    </div>
                    <button className="text-text-muted opacity-0 group-hover:opacity-100 transition-opacity">
                       <Play size={16} />
                    </button>
                 </div>
               ))}
            </div>
         </div>

         {/* Activity Feed */}
         <div className="lg:col-span-5 space-y-4">
            <h2 className="text-[14px] font-bold uppercase tracking-[2px] text-text-muted px-2">Agent Feed</h2>
            <div className="card space-y-6 pt-8 bg-bg-secondary/40 min-h-[300px] overflow-hidden">
               {loading ? (
                 <div className="p-4 space-y-4">
                    {[1,2,3].map(i => <div key={i} className="h-12 bg-white/5 rounded-xl animate-pulse" />)}
                 </div>
               ) : feed.length === 0 ? (
                 <div className="flex flex-col items-center justify-center h-full text-text-muted py-20">
                    <AlertCircle size={32} className="mb-2 opacity-20" />
                    <p className="text-sm">Feed is currently empty</p>
                 </div>
               ) : feed.map((item, i) => (
                 <motion.div 
                   key={item.id} 
                   initial={{ opacity: 0, x: -10 }}
                   animate={{ opacity: 1, x: 0 }}
                   className="flex gap-4 relative px-2"
                 >
                    {i !== feed.length - 1 && <div className="absolute top-6 left-[15px] w-px h-full bg-border-soft" />}
                    <div className="w-4 h-4 rounded-full bg-bg-elevated border-2 border-border-strong flex items-center justify-center shrink-0 z-10">
                       <div className={cn(
                         "w-1.5 h-1.5 rounded-full",
                         item.type === 'error' ? "bg-red-500" : item.type === 'warning' ? "bg-warning" : "bg-green-primary"
                       )} />
                    </div>
                    <div className="space-y-1">
                       <p className="text-[13px] text-text-secondary leading-snug">
                          <span className="font-bold text-text-primary">{item.title || 'Agent'}</span>: {item.message}
                       </p>
                       <p className="text-[11px] text-text-muted">
                         {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                       </p>
                    </div>
                 </motion.div>
               ))}
            </div>
         </div>
      </div>
    </div>
  )
}

export default CommandCenter
