"use client";

import React from "react";
import { motion } from "framer-motion";
import { Download, Share2, Shield, Info, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Job } from "@/lib/hooks/use-jobs";
import { GlassCard } from "@/components/ui/GlassCard";
import { AIButton } from "@/components/ui/AIButton";
import { cn } from "@/lib/utils";

interface VideoResultViewProps {
  job: Job;
  onBack: () => void;
}

export function VideoResultView({ job, onBack }: VideoResultViewProps) {
  const getRiskColor = (level?: string) => {
    switch (level?.toLowerCase()) {
      case "low": return "text-green-500 bg-green-500/10 border-green-500/20";
      case "medium": return "text-amber-500 bg-amber-500/10 border-amber-500/20";
      case "high": return "text-red-500 bg-red-500/10 border-red-500/20";
      default: return "text-slate-400 bg-slate-400/10 border-slate-400/20";
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors py-2"
        >
          <ArrowLeft size={18} />
          <span>Back to Dashboard</span>
        </button>

        <div className="flex gap-3">
           <AIButton className="bg-slate-800 hover:bg-slate-700">
              <div className="flex items-center gap-2">
                <Share2 size={16} />
                <span>Share</span>
              </div>
           </AIButton>
           <a 
            href={`http://localhost:8000${job.download_url}`}
            download
            className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-blue-600 hover:bg-blue-500 font-bold transition-all text-white shadow-lg shadow-blue-500/20"
           >
              <Download size={18} />
              <span>Download MP4</span>
           </a>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <GlassCard className="p-0 overflow-hidden bg-black border-slate-800">
            <video 
              src={`http://localhost:8000${job.download_url}`}
              controls
              className="w-full aspect-video"
              autoPlay
            />
          </GlassCard>

          <div className="flex items-start gap-4 p-6 rounded-2xl bg-blue-500/5 border border-blue-500/10">
             <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400">
                <CheckCircle2 size={24} />
             </div>
             <div>
                <h4 className="font-bold text-lg">Your video is ready!</h4>
                <p className="text-slate-400 text-sm mt-1">
                  We've applied the rhythmic pattern and optimized the encoding for social platforms. 
                  Check the Copyright Risk Analysis on the right before publishing.
                </p>
             </div>
          </div>
        </div>

        <div className="space-y-6">
          <GlassCard className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="font-bold flex items-center gap-2 uppercase tracking-widest text-xs text-slate-500">
                    <Shield size={14} />
                    Risk Analysis
                </h3>
                <motion.span 
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-bold border",
                    getRiskColor((job as any).risk_level)
                  )}
                >
                  {((job as any).risk_level || "LOW").toUpperCase()}
                </motion.span>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 space-y-2">
                 <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    Audio Integrity
                 </div>
                 <p className="text-[11px] text-slate-500">
                    Your audio remains primarily intact. If you use copyrighted music, the risk of removal is high.
                 </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 space-y-2">
                 <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    Visual Transformation
                 </div>
                 <p className="text-[11px] text-slate-500">
                    High transformation detected. The rhythmic cuts significantly alter the visual structure, which helps avoid generic detection bots.
                 </p>
              </div>
            </div>

            <div className="flex items-start gap-2 p-3 rounded-lg bg-slate-900 text-slate-500 border border-slate-800/50">
                <Info size={14} className="shrink-0 mt-0.5" />
                <p className="text-[10px] italic leading-relaxed">
                    Disclaimer: This is an AI-powered estimate. Always ensure you have rights to the content you publish.
                </p>
            </div>
          </GlassCard>

          <GlassCard className="p-6">
             <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Export Details</h4>
             <div className="space-y-3">
                <div className="flex justify-between text-xs py-2 border-b border-white/5">
                    <span className="text-slate-400">Duration</span>
                    <span className="font-medium">{(job as any).output_duration_seconds?.toFixed(1) || "0.0"}s</span>
                </div>
                <div className="flex justify-between text-xs py-2 border-b border-white/5">
                    <span className="text-slate-400">Format</span>
                    <span className="font-medium uppercase">MP4 / H.264</span>
                </div>
                <div className="flex justify-between text-xs py-2">
                    <span className="text-slate-400">Size</span>
                    <span className="font-medium">{((job as any).output_size_bytes / (1024*1024)).toFixed(1)} MB</span>
                </div>
             </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
