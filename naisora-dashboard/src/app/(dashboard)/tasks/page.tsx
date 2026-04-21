'use client'

import React, { useState } from 'react'
import { 
  CheckCircle2, Clock, Play, MoreVertical, 
  Plus, Calendar, Flag, MessageSquare, Zap
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

const initialTasks = [
  { id: 1, title: 'Finalize Restaurant SEO Strategy', priority: 'High', due: 'Today', status: 'pending', desc: 'Audit keywords for 5 Bangalore restaurants.' },
  { id: 2, title: 'Connect Supabase Realtime', priority: 'High', due: 'Today', status: 'in-progress', desc: 'Implement socket listeners for agent events.' },
  { id: 3, title: 'Optimize Mobile Navigation', priority: 'Medium', due: 'Tomorrow', status: 'completed', desc: 'Ensure 44px touch targets on all nav items.' },
  { id: 4, title: 'Draft Case Study for Empire', priority: 'Low', due: 'Oct 28', status: 'pending', desc: 'Document 14% conversion increase.' },
  { id: 5, title: 'Audit Agent Memory Logs', priority: 'Medium', due: 'Oct 30', status: 'pending', desc: 'Clean up persistent context for Railway instance.' },
]

export default function TasksPage() {
  const [tasks, setTasks] = useState(initialTasks)
  const [filter, setFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)

  const toggleTask = (id: number) => {
    setTasks(prev => prev.map(task => 
      task.id === id 
        ? { ...task, status: task.status === 'completed' ? 'pending' : 'completed' }
        : task
    ))
  }

  const filteredTasks = tasks.filter(task => {
    if (filter === 'all') return true
    if (filter === 'all-tasks') return true
    return task.status === filter
  })

  return (
    <div className="space-y-8 animate-slide-up pb-12">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="space-y-2">
           <h1 className="text-[36px] lg:text-[42px] font-instrument italic font-normal text-text-primary leading-none">Intelligence Stack</h1>
           <p className="text-[14px] text-text-muted">Prioritized operations and autonomous agent tasks.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="btn-primary py-3.5 px-6 shadow-lg shadow-green-primary/10"
        >
           <Plus size={18} /> Create Task
        </button>
      </div>

      {/* Tabs / Filters */}
      <div className="flex items-center gap-4 border-b border-border-soft overflow-x-auto no-scrollbar">
         {['All Tasks', 'Pending', 'In Progress', 'Completed'].map((tab) => {
           const tabId = tab.toLowerCase().replace(' ', '-')
           const isActive = filter === tabId || (filter === 'all' && tabId === 'all-tasks')
           return (
             <button 
               key={tab} 
               className={cn(
                 "pb-4 px-2 text-[14px] font-bold transition-all border-b-2 whitespace-nowrap",
                 isActive ? "text-green-primary border-green-primary" : "text-text-muted border-transparent hover:text-text-secondary"
               )}
               onClick={() => setFilter(tabId)}
             >
               {tab}
             </button>
           )
         })}
      </div>

      {/* Task List */}
      <div className="space-y-4">
        {filteredTasks.map((task) => (
          <div key={task.id} className="card group bg-bg-secondary/40 hover:bg-bg-secondary hover:border-border-strong p-5">
             <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                   <button 
                     onClick={() => toggleTask(task.id)}
                     className={cn(
                       "mt-1 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all shrink-0",
                       task.status === 'completed' ? "bg-green-primary border-green-primary text-bg-main" : "border-border-strong group-hover:border-green-primary"
                     )}
                   >
                     {task.status === 'completed' && <CheckCircle2 size={14} />}
                   </button>
                   <div>
                      <h3 className={cn(
                        "text-[16px] font-bold transition-all",
                        task.status === 'completed' ? "text-text-muted line-through" : "text-text-primary"
                      )}>{task.title}</h3>
                      <p className="text-[13px] text-text-muted mt-1 leading-relaxed max-w-2xl">{task.desc}</p>
                      
                      <div className="flex flex-wrap items-center gap-4 mt-4">
                         <div className="flex items-center gap-1.5 text-[11px] font-bold text-text-muted bg-bg-elevated/50 px-2.5 py-1 rounded-full border border-border-soft">
                            <Calendar size={12} /> {task.due}
                         </div>
                         <div className={cn(
                           "flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border",
                           task.priority === 'High' ? "bg-error/5 text-error border-error/10" : "bg-bg-elevated/50 text-text-muted border-border-soft"
                         )}>
                            <Flag size={12} /> {task.priority} Priority
                         </div>
                         {task.status !== 'completed' && (
                           <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-green-primary/5 text-green-primary text-[10px] font-bold animate-pulse">
                              AGENT ACTIVE
                           </div>
                         )}
                      </div>
                   </div>
                </div>
                
                <div className="flex items-center gap-2">
                   <button className="p-2 rounded-xl text-text-muted hover:text-white transition-colors">
                      <MessageSquare size={18} />
                   </button>
                   <button className="p-2 rounded-xl text-text-muted hover:text-white transition-colors">
                      <Play size={18} />
                   </button>
                   <button className="p-2 rounded-xl text-text-muted hover:text-white transition-colors">
                      <MoreVertical size={18} />
                   </button>
                </div>
             </div>
          </div>
        ))}
      </div>

      {/* Suggested by AI */}
      <div className="bg-green-primary/5 border border-green-primary/10 rounded-3xl p-6 lg:p-10 mt-12 relative overflow-hidden">
         <div className="absolute top-0 right-0 w-32 h-32 bg-green-primary/10 blur-[60px] rounded-full -translate-y-1/2 translate-x-1/2" />
         <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-green-primary flex items-center justify-center text-bg-main shadow-lg shadow-green-primary/20">
               <Zap size={16} fill="currentColor" />
            </div>
            <h3 className="text-[12px] font-extrabold text-green-primary uppercase tracking-[2px]">Agent Signal</h3>
         </div>
         <h4 className="text-[20px] font-instrument italic mb-6 max-w-lg leading-relaxed">"I noticed outreach conversion is higher on weekends. Should I create an automated re-optimization task?"</h4>
         <div className="flex gap-4">
            <button className="btn-primary text-xs px-6 py-3">Authorize Script</button>
            <button className="btn-secondary text-xs px-6 py-3 bg-transparent border-white/5 hover:border-text-muted text-text-muted">Ignore</button>
         </div>
      </div>

      {/* Task Modal */}
      <AnimatePresence>
        {showModal && (
          <>
            <motion.div 
               initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
               onClick={() => setShowModal(false)}
               className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[200]"
            />
            <motion.div 
               initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
               className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[450px] aspect-video bg-bg-secondary border border-border-strong rounded-3xl z-[210] p-10 text-center flex flex-col items-center justify-center gap-6 shadow-2xl"
            >
               <div className="w-16 h-16 rounded-full bg-green-primary/10 flex items-center justify-center text-green-primary">
                  <CheckSquare size={32} />
               </div>
               <h2 className="text-[24px] font-instrument italic">New Operational Task</h2>
               <p className="text-text-muted text-sm">Define a new directive for the agent. This task will be added to the prioritized stack.</p>
               <button onClick={() => {
                 setTasks(prev => [{
                   id: Date.now(),
                   title: 'New User Task',
                   priority: 'Medium',
                   due: 'New',
                   status: 'pending',
                   desc: 'Manually added operational task.'
                 }, ...prev])
                 setShowModal(false)
               }} className="btn-primary w-full py-4">Confirm Task</button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
