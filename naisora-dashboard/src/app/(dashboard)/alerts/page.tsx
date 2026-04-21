'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, AlertTriangle, Info, CheckCircle, Clock, X, SlidersHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchAlerts() {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('alerts')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50)
        
        if (error) throw error
        setAlerts(data || [])
      } catch (err: any) {
        console.error('Error fetching alerts:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchAlerts()
  }, [])

  const getIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'warning': return <AlertTriangle className="text-warning" size={18} />
      case 'error': return <X className="text-error" size={18} />
      case 'success': return <CheckCircle className="text-green-primary" size={18} />
      default: return <Info className="text-info" size={18} />
    }
  }

  return (
    <div className="space-y-8 animate-slide-up">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="space-y-2">
           <h1 className="text-[36px] lg:text-[42px] font-instrument italic font-normal text-text-primary">Intelligence Feed</h1>
           <p className="text-[14px] text-text-muted">Real-time alerts and strategic updates from the AI agent.</p>
        </div>
        <button className="btn-secondary text-sm px-6">
          <SlidersHorizontal size={16} /> Filter Feed
        </button>
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="p-12 space-y-4">
             {[1,2,3,4,5].map(i => (
               <div key={i} className="h-20 bg-white/5 rounded-xl animate-pulse" />
             ))}
          </div>
        ) : error ? (
          <div className="p-20 text-center space-y-4">
             <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 mx-auto">
                <X size={32} />
             </div>
             <h3 className="text-xl font-bold text-text-primary">Failed to load alerts</h3>
             <p className="text-text-muted">{error}</p>
          </div>
        ) : alerts.length === 0 ? (
          <div className="p-20 text-center space-y-4">
             <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-text-muted mx-auto">
                <Bell size={32} />
             </div>
             <h3 className="text-xl font-bold text-text-primary">No alerts yet</h3>
             <p className="text-text-muted">Your feed is clear. The agent is working quietly.</p>
          </div>
        ) : (
          <div className="divide-y divide-border-soft">
            {alerts.map((alert) => (
              <motion.div 
                key={alert.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-6 flex gap-6 hover:bg-white/[0.02] transition-colors"
              >
                <div className="shrink-0 mt-1">
                  <div className="w-10 h-10 rounded-xl bg-bg-elevated flex items-center justify-center">
                    {getIcon(alert.type || 'info')}
                  </div>
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[15px] font-bold text-text-primary">{alert.title || 'System Notification'}</h4>
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-text-muted uppercase tracking-wider">
                      <Clock size={12} />
                      {new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <p className="text-[14px] text-text-secondary leading-relaxed">
                    {alert.message}
                  </p>
                  {alert.meta && (
                    <div className="pt-2">
                       <span className="text-[11px] font-bold px-2.5 py-1 rounded-md bg-white/5 text-text-muted">
                         REF: {JSON.stringify(alert.meta)}
                       </span>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
