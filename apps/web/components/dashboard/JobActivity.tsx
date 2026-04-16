"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, CheckCircle2, AlertCircle, Loader2, Download, ExternalLink, XCircle } from "lucide-react";
import { Job, useJobs } from "@/lib/hooks/use-jobs";
import { GlassCard } from "@/components/ui/GlassCard";
import { cn } from "@/lib/utils";

interface JobActivityProps {
  videoId?: string;
  onViewResult?: (job: Job) => void;
}

export function JobActivity({ videoId, onViewResult }: JobActivityProps) {
  const { jobs, isLoading } = useJobs(videoId);

  if (isLoading && jobs.length === 0) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="animate-spin text-blue-500" size={24} />
      </div>
    );
  }

  if (jobs.length === 0) {
    return null; // Don't show anything if no jobs
  }

  const getStatusIcon = (status: Job["status"]) => {
    switch (status) {
      case "completed": return <CheckCircle2 className="text-green-500" size={18} />;
      case "failed": return <AlertCircle className="text-red-500" size={18} />;
      case "processing": return <Loader2 className="animate-spin text-blue-500" size={18} />;
      case "cancelled": return <XCircle className="text-slate-500" size={18} />;
      default: return <Clock className="text-slate-500" size={18} />;
    }
  };

  const getStatusText = (status: Job["status"]) => {
    switch (status) {
      case "pending": return "In Queue";
      case "processing": return "AutoCutting...";
      case "completed": return "Ready";
      case "failed": return "Error";
      case "cancelled": return "Cancelled";
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500">Processing History</h3>
      <div className="grid grid-cols-1 gap-3">
        <AnimatePresence initial={false}>
          {jobs.map((job) => (
            <motion.div
              key={job.id}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              <GlassCard className="p-4 flex items-center justify-between gap-4 border-slate-800/50">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                    job.status === "completed" ? "bg-green-500/10" : 
                    job.status === "failed" ? "bg-red-500/10" : "bg-blue-500/10"
                  )}>
                    {getStatusIcon(job.status)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm uppercase tracking-tight truncate">
                         {job.job_type.replace(/_/g, " ")}
                      </span>
                      <span className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase",
                        job.status === "completed" ? "bg-green-500/20 text-green-400" :
                        job.status === "failed" ? "bg-red-500/20 text-red-400" :
                        "bg-blue-500/20 text-blue-400"
                      )}>
                        {getStatusText(job.status)}
                      </span>
                    </div>
                    
                    {job.status === "processing" && (
                      <div className="mt-2 space-y-1.5">
                        <div className="flex justify-between text-[10px] font-bold text-slate-400">
                          <span>Processing rhythm...</span>
                          <span>{job.progress_pct}%</span>
                        </div>
                        <div className="h-1 w-full bg-slate-900 rounded-full overflow-hidden">
                          <motion.div 
                            className="h-full bg-blue-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${job.progress_pct}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {(job.status === "completed" || job.status === "failed") && (
                       <div className="mt-1 space-y-1">
                          <p className="text-[11px] text-slate-500">
                            {job.status === "completed" ? "Successfully transformed video." : job.error_message}
                          </p>
                          {job.status === "completed" && job.risk_level && (
                            <div className="flex items-center gap-1.5 mt-1">
                               <span className={cn(
                                 "w-1.5 h-1.5 rounded-full animate-pulse",
                                 job.risk_level === "high" ? "bg-red-500" : 
                                 job.risk_level === "medium" ? "bg-amber-500" : "bg-green-500"
                               )} />
                               <span className={cn(
                                 "text-[9px] font-bold uppercase tracking-wider",
                                 job.risk_level === "high" ? "text-red-400" : 
                                 job.risk_level === "medium" ? "text-amber-400" : "text-green-400"
                               )}>
                                 {job.risk_level} Copyright Risk
                               </span>
                            </div>
                          )}
                       </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {job.status === "completed" && (
                    <>
                      <button 
                        onClick={() => onViewResult?.(job)}
                        className="p-2 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white transition-all"
                        title="View Result"
                      >
                        <ExternalLink size={18} />
                      </button>
                      <a 
                        href={`http://localhost:8000${job.download_url}`}
                        download
                        className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white transition-all"
                        title="Download"
                      >
                        <Download size={18} />
                      </a>
                    </>
                  )}
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
