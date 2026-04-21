'use client'

import React from 'react'
import { Search, Bell, Menu } from 'lucide-react'
import { useSidebar } from '@/hooks/use-sidebar'
import { cn } from '@/lib/utils'

import { useAgentStatus } from '@/hooks/useAgentStatus'
import { supabase } from '@/lib/supabase'

const Topbar = () => {
  const { toggle } = useSidebar()
  const { status } = useAgentStatus()

  const [unreadCount, setUnreadCount] = React.useState(0)

  React.useEffect(() => {
    async function fetchAlerts() {
      const { count } = await supabase
        .from('alerts')
        .select('*', { count: 'exact', head: true })
        // In a real app we'd filter for unread: true
      setUnreadCount(count || 0)
    }
    fetchAlerts()
    
    const channel = supabase
      .channel('topbar-alerts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'alerts' }, () => {
        setUnreadCount(prev => prev + 1)
      })
      .subscribe()
      
    return () => { supabase.removeChannel(channel) }
  }, [])

  return (
    <header className="sticky top-0 h-16 lg:h-20 bg-bg-main/70 backdrop-blur-xl border-b border-border-soft flex items-center justify-between px-6 lg:px-10 z-40">
      <div className="flex items-center gap-4">
        <button 
          onClick={toggle}
          className="lg:hidden w-10 h-10 rounded-xl bg-bg-secondary border border-border-soft flex items-center justify-center text-text-primary active:scale-95 transition-transform"
        >
          <Menu size={20} />
        </button>
        
        {/* Search */}
        <div className="relative group hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
          <input 
            type="text" 
            placeholder="Search Intelligence..."
            className="w-[200px] lg:w-[320px] bg-bg-secondary border border-border-soft rounded-xl py-2 pl-10 pr-4 text-[13px] focus:w-[240px] lg:focus:w-[400px] transition-all outline-none focus:border-green-primary/50"
          />
        </div>
      </div>

      <div className="flex items-center gap-4 lg:gap-8">
        {/* Agent Status Indicator (Centerpiece on Desktop) */}
        <div className={cn(
          "hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border",
          status === 'running' 
            ? "bg-green-primary/10 border-green-primary/20" 
            : "bg-red-500/10 border-red-500/20"
        )}>
           <div className="relative">
             <div className={cn(
               "w-2 h-2 rounded-full",
               status === 'running' ? "bg-green-primary" : "bg-red-500"
             )} />
             {status === 'running' && (
               <div className="absolute inset-0 w-2 h-2 rounded-full bg-green-primary animate-ping" />
             )}
           </div>
           <span className={cn(
             "text-[12px] font-bold uppercase tracking-wider",
             status === 'running' ? "text-green-primary" : "text-red-500"
           )}>
             Agent {status === 'running' ? 'Live' : status === 'checking' ? 'Checking' : 'Offline'}
           </span>
        </div>

        <div className="flex items-center gap-2">
          <a href="/alerts" className="w-10 h-10 rounded-xl flex items-center justify-center text-text-muted hover:text-white transition-colors relative">
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-4 h-4 bg-green-primary text-[10px] font-bold text-bg-main rounded-full flex items-center justify-center ring-2 ring-bg-main animate-bounce">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </a>
          
          <div className="h-6 w-px bg-border-soft mx-2 hidden lg:block" />
          
          <button className="flex items-center gap-3 p-1 rounded-xl transition-all group">
            <div className="w-8 h-8 lg:w-9 lg:h-9 rounded-full bg-bg-elevated flex items-center justify-center text-text-muted font-bold text-[12px] group-hover:border-green-primary border border-transparent transition-all">
              NP
            </div>
          </button>
        </div>
      </div>
    </header>
  )
}

export default Topbar
