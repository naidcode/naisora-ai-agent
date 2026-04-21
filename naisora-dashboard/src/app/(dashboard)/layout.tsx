'use client'

import React from 'react'
import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'
import BottomNav from '@/components/layout/BottomNav'
import { SidebarProvider } from '@/hooks/use-sidebar'

function DashboardContent({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-screen bg-bg-main overflow-hidden text-text-primary">
      {/* 
        NO-OVERLAP FLEX ARCHITECTURE 
        The Sidebar is a direct flex child. On desktop, it takes its width and 
        the 'flex-1' container takes the REST of the space. Overlap is impossible.
      */}
      <Sidebar />
      
      <div className="flex-1 flex flex-col min-w-0 relative">
        <Topbar />
        
        <main className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="p-4 md:p-8 lg:p-12 max-w-[1600px] mx-auto w-full pb-32 lg:pb-12">
            {children}
          </div>
        </main>

        <BottomNav />
      </div>
    </div>
  )
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <DashboardContent>{children}</DashboardContent>
    </SidebarProvider>
  )
}
