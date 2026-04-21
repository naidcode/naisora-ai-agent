'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  Users, Mail, Globe, Cpu, Radar,
  Settings, Terminal as TerminalIcon, Zap, X, 
  ChevronLeft, ChevronRight, CheckSquare, LayoutDashboard
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSidebar } from '@/hooks/use-sidebar'
import { motion, AnimatePresence } from 'framer-motion'
import { useAgentStatus } from '@/hooks/useAgentStatus'

const SidebarContent = ({ 
  mobile = false, 
  isCollapsed, 
  pathname, 
  status, 
  close, 
  toggleCollapse 
}: { 
  mobile?: boolean, 
  isCollapsed: boolean, 
  pathname: string, 
  status: string, 
  close: () => void, 
  toggleCollapse: () => void 
}) => {
  const sections = [
    {
      label: 'Core',
      items: [
        { label: 'Overview', icon: LayoutDashboard, href: '/' },
        { label: 'Leads', icon: Users, href: '/leads' },
        { label: 'Outreach', icon: Mail, href: '/outreach' },
        { label: 'Tasks', icon: CheckSquare, href: '/tasks' },
      ]
    },
    {
      label: 'Intelligence',
      items: [
        { label: 'SEO', icon: Globe, href: '/seo' },
        { label: 'AI Content', icon: Zap, href: '/content' },
        { label: 'Market Radar', icon: Radar, href: '/radar' },
      ]
    },
    {
      label: 'System',
      items: [
        { label: 'Agent Control', icon: Cpu, href: '/agent-control' },
        { label: 'Live Logs', icon: TerminalIcon, href: '/terminal' },
        { label: 'Settings', icon: Settings, href: '/settings' },
      ]
    }
  ]

  return (
    <div className="flex flex-col h-full bg-bg-main relative border-r border-white/5">
      {/* Brand Logo */}
      <div className={cn(
        "h-20 flex items-center px-6 transition-all duration-300 shrink-0",
        isCollapsed && !mobile ? "justify-center px-0" : "justify-between"
      )}>
        <Link href="/" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-green-primary flex items-center justify-center shrink-0">
            <span className="font-instrument italic text-[22px] text-bg-main leading-none font-bold">N</span>
          </div>
          {(!isCollapsed || mobile) && (
            <span className="font-plus-jakarta font-extrabold text-[14px] tracking-[2px] text-text-primary uppercase">NAISORA</span>
          )}
        </Link>
        {mobile && (
          <button onClick={close} className="text-text-muted hover:text-text-primary">
            <X size={20} />
          </button>
        )}
      </div>

      {/* Collapse Toggle */}
      {!mobile && (
        <button 
          onClick={toggleCollapse}
          className="absolute -right-3 top-24 w-6 h-6 rounded-full bg-bg-elevated border border-border-soft flex items-center justify-center text-text-muted hover:text-green-primary z-50 transition-all shadow-xl hidden lg:flex"
        >
          {isCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-8 no-scrollbar">
        {sections.map((section) => (
          <div key={section.label} className="space-y-1">
            {(!isCollapsed || mobile) && (
              <h3 className="px-4 mb-2 text-[9px] font-bold uppercase tracking-[2.5px] text-text-muted/40">
                {section.label}
              </h3>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = pathname === item.href
                const Icon = item.icon

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "group relative px-4 py-2.5 rounded-xl flex items-center gap-3 transition-all duration-200",
                      isActive 
                        ? "bg-white/5 text-text-primary border-l-2 border-green-primary rounded-l-none" 
                        : "text-text-muted hover:text-text-secondary hover:bg-white/[0.02]",
                      isCollapsed && !mobile ? "justify-center px-0 mx-1 border-l-0" : ""
                    )}
                  >
                    <Icon size={18} className={cn(
                      "shrink-0 transition-colors",
                      isActive ? "text-green-primary" : "text-text-muted"
                    )} />
                    {(!isCollapsed || mobile) && (
                      <span className="text-[13.5px] font-semibold truncate tracking-tight">{item.label}</span>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>
      
      {/* Footer Agent Status */}
      <div className={cn("p-4 border-t border-white/5 shrink-0", isCollapsed && !mobile && "p-2 flex justify-center")}>
         <div className={cn(
           "bg-white/[0.02] border border-white/5 rounded-2xl p-3 flex items-center gap-3",
           isCollapsed && !mobile ? "w-10 h-10 p-0 justify-center rounded-xl" : ""
         )}>
            <div className={cn(
              "w-2 h-2 rounded-full",
              status === 'running' ? "bg-green-primary animate-pulse" : "bg-red-500"
            )} />
            {(!isCollapsed || mobile) && (
              <p className="text-[11px] font-bold text-text-primary tracking-tighter uppercase truncate">
                AGENT {status === 'running' ? 'LIVE' : status === 'checking' ? 'CHECKING' : 'OFFLINE'}
              </p>
            )}
         </div>
      </div>
    </div>
  )
}

const Sidebar = () => {
  const pathname = usePathname()
  const { isOpen, close, isCollapsed, toggleCollapse } = useSidebar()
  const { status } = useAgentStatus()

  return (
    <>
      {/* Desktop Sidebar (Pure Flex) */}
      <aside 
        className={cn(
          "hidden lg:flex flex-col h-screen shrink-0 border-r border-white/5 transition-all duration-500 ease-in-out overflow-hidden z-20",
          isCollapsed ? "w-[80px]" : "w-[260px]"
        )}
      >
        <SidebarContent 
          isCollapsed={isCollapsed} 
          pathname={pathname} 
          status={status} 
          close={close} 
          toggleCollapse={toggleCollapse} 
        />
      </aside>

      {/* Mobile Drawer (Fixed Overlay) */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={close} className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[100] lg:hidden"
            />
            <motion.aside
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 h-full w-[280px] bg-bg-main z-[110] lg:hidden"
            >
              <SidebarContent 
                mobile 
                isCollapsed={isCollapsed} 
                pathname={pathname} 
                status={status} 
                close={close} 
                toggleCollapse={toggleCollapse} 
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

export default Sidebar
