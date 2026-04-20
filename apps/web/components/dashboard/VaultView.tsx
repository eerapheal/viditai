"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Library, Download, Play, Share2, Shield, Clock,
  CheckCircle2, Info, AlertTriangle, Loader2, ArrowRight
} from "lucide-react";
import { Job, useJobs } from "@/lib/hooks/use-jobs";
import { GlassCard } from "@/components/ui/GlassCard";
import { cn } from "@/lib/utils";
import { API_BASE } from "@/lib/config";

interface VaultViewProps {
  onViewResult?: (job: Job) => void;
}

export function VaultView({ onViewResult }: VaultViewProps) {
  const { jobs, isLoading } = useJobs();
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const completedJobs = jobs.filter((j) => j.status === "completed");
  const processingJobs = jobs.filter(
    (j) => j.status === "pending" || j.status === "processing"
  );

  const getRiskConfig = (level?: string) => {
    switch (level?.toLowerCase()) {
      case "low":
        return { color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/20", label: "Low Risk" };
      case "medium":
        return { color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20", label: "Medium Risk" };
      case "high":
        return { color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20", label: "High Risk" };
      default:
        return { color: "text-slate-400", bg: "bg-slate-500/10", border: "border-slate-500/20", label: "Unknown" };
    }
  };

  const getJobTypeLabel = (type: string) =>
    type
      .replace(/_/g, " ")
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

  if (isLoading && jobs.length === 0) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="animate-spin text-blue-500" size={28} />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Library className="text-amber-500" size={18} />
            </div>
            <span className="text-xs font-bold text-amber-500 uppercase tracking-widest">Video Vault</span>
          </div>
          <h2 className="text-3xl font-bold">Your Exports</h2>
          <p className="text-slate-400 mt-1 text-sm">
            {completedJobs.length} completed · {processingJobs.length} in progress
          </p>
        </div>
      </div>

      {/* Processing Banner */}
      <AnimatePresence>
        {processingJobs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-4 p-4 rounded-2xl bg-blue-500/5 border border-blue-500/20"
          >
            <Loader2 className="animate-spin text-blue-400 shrink-0" size={20} />
            <div className="flex-1">
              <p className="text-sm font-bold text-blue-300">
                {processingJobs.length} job{processingJobs.length > 1 ? "s" : ""} in progress
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                This page refreshes automatically every few seconds.
              </p>
            </div>
            <div className="flex gap-2">
              {processingJobs.map((j) => (
                <div key={j.id} className="text-right">
                  <p className="text-[10px] font-bold text-blue-400">
                    {getJobTypeLabel(j.job_type)}
                  </p>
                  <div className="w-24 h-1.5 bg-slate-800 rounded-full mt-1 overflow-hidden">
                    <motion.div
                      className="h-full bg-blue-500 rounded-full"
                      animate={{ width: `${j.progress_pct ?? j.progress ?? 5}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty State */}
      {completedJobs.length === 0 && !isLoading && (
        <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed border-slate-800 rounded-3xl">
          <div className="w-16 h-16 rounded-2xl bg-slate-900 flex items-center justify-center mb-5">
            <Library className="text-slate-600" size={32} />
          </div>
          <h3 className="text-xl font-bold mb-2">No exports yet</h3>
          <p className="text-slate-500 text-sm max-w-xs">
            Upload a video and run it through the AI Studio to see your results here.
          </p>
        </div>
      )}

      {/* Vault Grid */}
      {completedJobs.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <AnimatePresence initial={false}>
            {completedJobs.map((job, idx) => {
              const risk = getRiskConfig(job.risk_level);
              const isHovered = hoveredId === job.id;
              return (
                <motion.div
                  key={job.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: idx * 0.04 }}
                  onMouseEnter={() => setHoveredId(job.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  <GlassCard className="overflow-hidden border-slate-800/50 group hover:border-slate-700 transition-all duration-300">
                    {/* Video Thumbnail / Preview */}
                    <div className="relative aspect-video bg-black overflow-hidden">
                      {job.download_url ? (
                        <video
                          src={job.download_url?.startsWith("http") ? job.download_url : `${API_BASE}${job.download_url}`}
                          className={cn(
                            "w-full h-full object-cover transition-all duration-500",
                            isHovered ? "scale-105 opacity-90" : "scale-100 opacity-60"
                          )}
                          muted
                          loop
                          playsInline
                          autoPlay={isHovered}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-900">
                          <Play className="text-slate-700" size={36} />
                        </div>
                      )}

                      {/* Overlay controls */}
                      <div className={cn(
                        "absolute inset-0 flex items-center justify-center gap-3 transition-all duration-300",
                        isHovered ? "opacity-100" : "opacity-0"
                      )}>
                        <a
                          href={job.download_url ? (job.download_url.startsWith("http") ? job.download_url : `${API_BASE}${job.download_url}`) : "#"}
                          download
                          className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur border border-white/20 text-xs font-bold hover:bg-white/20 transition-all"
                          onClick={(e) => !job.download_url && e.preventDefault()}
                        >
                          <Download size={14} />
                          Download
                        </a>
                        {onViewResult && (
                          <button
                            onClick={() => onViewResult(job)}
                            className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/80 backdrop-blur border border-blue-400/30 text-xs font-bold hover:bg-blue-500 transition-all"
                          >
                            <ArrowRight size={14} />
                            View
                          </button>
                        )}
                      </div>

                      {/* Type badge */}
                      <div className="absolute top-3 left-3">
                        <span className="px-2.5 py-1 rounded-full bg-black/50 backdrop-blur text-[10px] font-bold text-slate-300 border border-white/10">
                          {getJobTypeLabel(job.job_type)}
                        </span>
                      </div>

                      {/* Risk badge */}
                      <div className="absolute top-3 right-3">
                        <span className={cn(
                          "px-2.5 py-1 rounded-full text-[10px] font-bold border backdrop-blur",
                          risk.bg, risk.color, risk.border
                        )}>
                          <Shield size={9} className="inline mr-1" />
                          {risk.label}
                        </span>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="text-green-500 shrink-0" size={14} />
                          <span className="text-xs font-medium text-slate-300">
                            {new Date(job.created_at).toLocaleDateString("en-US", {
                              month: "short", day: "numeric", year: "numeric"
                            })}
                          </span>
                        </div>
                        {(job as any).output_duration_seconds && (
                          <div className="flex items-center gap-1 text-[10px] text-slate-500">
                            <Clock size={10} />
                            <span>{(job as any).output_duration_seconds.toFixed(1)}s</span>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <a
                          href={job.download_url ? (job.download_url.startsWith("http") ? job.download_url : `${API_BASE}${job.download_url}`) : "#"}
                          download
                          className={cn(
                            "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all",
                            job.download_url
                              ? "bg-blue-600 hover:bg-blue-500 text-white"
                              : "bg-slate-800 text-slate-500 cursor-not-allowed"
                          )}
                          onClick={(e) => !job.download_url && e.preventDefault()}
                        >
                          <Download size={13} />
                          Save
                        </a>
                        {onViewResult && (
                          <button
                            onClick={() => onViewResult(job)}
                            className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition-all"
                          >
                            <ArrowRight size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
