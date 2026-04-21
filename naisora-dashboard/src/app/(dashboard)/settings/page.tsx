'use client'

import React from 'react'
import { 
  User, Shield, Bell, Database, 
  Smartphone, Monitor, Globe, Mail,
  CreditCard, Key, Smartphone as MobileIcon,
  ChevronRight
} from 'lucide-react'
import { cn } from '@/lib/utils'

export default function SettingsPage() {
  const sections = [
    {
      title: 'Global Configuration',
      items: [
        { label: 'Agency Profile', desc: 'Manage your agency name, logo, and primary location.', icon: User },
        { label: 'Security & Access', desc: 'Update passwords and manage multi-factor authentication.', icon: Shield },
        { label: 'Cloud Database', desc: 'Configure Supabase and Railway environment variables.', icon: Database },
      ]
    },
    {
      title: 'Alerts & Communcation',
      items: [
        { label: 'Push Notifications', desc: 'Receive real-time agent alerts on desktop and mobile.', icon: Bell },
        { label: 'Email Integration', desc: 'Connect hey@naisora.com for automated outreach.', icon: Mail },
        { label: 'WhatsApp API', desc: 'Manage your business API keys and message templates.', icon: MobileIcon },
      ]
    }
  ]

  return (
    <div className="space-y-8 lg:space-y-12 animate-slide-up pb-12">
      <div className="space-y-2">
         <h1 className="text-[36px] lg:text-[42px] font-instrument italic font-normal text-text-primary leading-none">Settings</h1>
         <p className="text-[14px] text-text-muted">Configure your agency's internal operating system parameters.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
         <div className="lg:col-span-8 space-y-12">
            {sections.map((section) => (
              <div key={section.title} className="space-y-4">
                 <h2 className="text-[14px] font-bold uppercase tracking-[2px] text-text-muted px-2">{section.title}</h2>
                 <div className="space-y-px rounded-2xl overflow-hidden border border-border-soft">
                    {section.items.map((item, i) => (
                      <button key={i} className="w-full bg-bg-secondary/40 hover:bg-bg-secondary p-6 flex items-center justify-between group transition-all text-left">
                         <div className="flex items-center gap-5">
                            <div className="w-10 h-10 rounded-xl bg-bg-elevated flex items-center justify-center text-text-muted group-hover:text-green-primary transition-colors">
                               <item.icon size={20} />
                            </div>
                            <div>
                               <h4 className="text-[16px] font-bold">{item.label}</h4>
                               <p className="text-[13px] text-text-muted mt-0.5">{item.desc}</p>
                            </div>
                         </div>
                         <ChevronRight size={18} className="text-text-muted group-hover:text-text-primary transition-all group-hover:translate-x-1" />
                      </button>
                    ))}
                 </div>
              </div>
            ))}
         </div>

         <div className="lg:col-span-4 space-y-8">
            <div className="card p-8 bg-green-primary/5 border-green-primary/20 glow-green">
               <h3 className="text-[18px] font-bold mb-4">Subscription Plan</h3>
               <p className="text-[14px] text-text-secondary mb-6">You are currently on the **Scale Plan** with unlimited agent instances.</p>
               <button className="w-full btn-primary py-3 px-6 text-sm">Upgrade Support</button>
            </div>

            <div className="card p-6 bg-red-500/5 border-red-500/10">
               <h3 className="text-[14px] font-bold text-red-500 uppercase tracking-widest mb-4">Danger Zone</h3>
               <p className="text-[13px] text-text-muted mb-6">Permanently delete your agency workspace and all agent memory logs.</p>
               <button className="w-full text-red-500 text-[13px] font-bold hover:underline py-2 text-left">Delete Workspace</button>
            </div>
         </div>
      </div>
    </div>
  )
}
