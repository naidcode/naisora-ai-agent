'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, Mail, CheckSquare, Menu } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSidebar } from '@/hooks/use-sidebar'

const BottomNav = () => {
  const pathname = usePathname()
  const { toggle } = useSidebar()

  const navItems = [
    { label: 'Home', icon: LayoutDashboard, href: '/' },
    { label: 'Leads', icon: Users, href: '/leads' },
    { label: 'Outreach', icon: Mail, href: '/outreach' },
    { label: 'Tasks', icon: CheckSquare, href: '/tasks' },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-bg-main border-t border-border-soft flex items-center justify-around px-2 z-50 lg:hidden glass">
      {navItems.map((item) => {
        const isActive = pathname === item.href
        const Icon = item.icon
        
        return (
          <Link 
            key={item.href} 
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center gap-1 min-w-[64px] transition-all duration-200",
              isActive ? "text-green-primary" : "text-text-muted hover:text-text-secondary"
            )}
          >
            <Icon size={20} className={cn("transition-transform duration-200", isActive && "scale-110")} />
            <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
          </Link>
        )
      })}
      
      <button 
        onClick={toggle}
        className="flex flex-col items-center justify-center gap-1 min-w-[64px] text-text-muted"
      >
        <Menu size={20} />
        <span className="text-[10px] font-bold uppercase tracking-wider">Menu</span>
      </button>
    </nav>
  )
}

export default BottomNav
