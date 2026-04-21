'use client'

import React from 'react'
import { ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

interface StatCardProps {
  title: string
  value: string | number
  trend?: string
  trendType?: 'positive' | 'negative' | 'neutral'
  isFeatured?: boolean
  loading?: boolean
}

const StatCard = ({ title, value, trend, trendType = 'neutral', isFeatured = false, loading = false }: StatCardProps) => {
  if (loading) {
    return <div className="h-[160px] skeleton border border-border-default rounded-2xl" />
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className={cn(
        "p-6 rounded-2xl flex flex-col justify-between h-[160px] relative overflow-hidden group transition-all duration-300",
        isFeatured 
          ? "bg-[#22c55e]" 
          : "bg-bg-card border border-border-default hover:border-border-visible"
      )}
    >
      <div className="flex justify-between items-start">
        <span className={cn(
          "font-plus-jakarta font-semibold text-[14px]",
          isFeatured ? "text-[#0a0a0a]/60" : "text-text-muted"
        )}>
          {title}
        </span>
        <div className={cn(
          "w-9 h-9 rounded-full flex items-center justify-center transition-all",
          isFeatured ? "bg-[#0a0a0a]/10" : "bg-bg-elevated border border-border-default group-hover:border-border-visible"
        )}>
          <ArrowUpRight size={18} className={isFeatured ? "text-[#0a0a0a]" : "text-text-muted"} />
        </div>
      </div>

      <div className="mt-2">
        <motion.h3 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={cn(
            "text-[40px] font-plus-jakarta font-extrabold leading-none tracking-tight",
            isFeatured ? "text-[#0a0a0a]" : "text-text-primary"
          )}
        >
          {value}
        </motion.h3>
        
        {trend && (
          <div className="mt-3 flex items-center gap-1.5">
            <span className={cn(
              "font-inter font-medium text-[12px] px-2 py-0.5 rounded-full flex items-center gap-1",
              isFeatured 
                ? "bg-[#0a0a0a]/10 text-[#0a0a0a]" 
                : trendType === 'positive' 
                  ? "bg-success-dim text-success" 
                  : "bg-danger-dim text-danger"
            )}>
              {trendType === 'positive' && <ArrowUpRight size={12} />}
              {trendType === 'negative' && <ArrowDownRight size={12} />}
              {trend}
            </span>
            <span className={cn(
              "text-[11px] font-inter",
              isFeatured ? "text-[#0a0a0a]/40" : "text-text-muted"
            )}>
              {isFeatured ? "Higher than last month" : "vs last month"}
            </span>
          </div>
        )}
      </div>
      
      {/* Subtle Pattern for Featured Card */}
      {isFeatured && (
        <div className="absolute top-0 right-0 p-8 pointer-events-none opacity-5">
           <svg width="100" height="100" viewBox="0 0 100 100">
             <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="8" fill="none" strokeDasharray="10 5" />
           </svg>
        </div>
      )}
    </motion.div>
  )
}

export default StatCard
