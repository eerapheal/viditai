"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Settings2, Sparkles, ChevronRight, ArrowLeft, Loader2, Zap } from "lucide-react";
import { usePresets, Preset } from "@/lib/hooks/use-presets";
import { useJobs } from "@/lib/hooks/use-jobs";
import { VideoMetadata } from "@/lib/hooks/use-videos";
import { GlassCard } from "@/components/ui/GlassCard";
import { AIButton } from "@/components/ui/AIButton";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ProcessWizardProps {
  video: VideoMetadata;
  onComplete?: (job: any) => void;
  onCancel?: () => void;
}

export function ProcessWizard({ video, onComplete, onCancel }: ProcessWizardProps) {
  const { presets, isLoading: loadingPresets } = usePresets();
  const { createJob } = useJobs();
  const [step, setStep] = useState(1);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Custom parameters for Phase 2
  const [customParams, setCustomParams] = useState({
    keep_seconds: 4.0,
    cut_seconds: 1.0,
  });

  const handleStartProcess = async () => {
    if (!selectedPresetId && step === 1) {
        setStep(2); // Go to manual if nothing selected? Actually, let's force selection.
        return;
    }

    setIsSubmitting(true);
    try {
      const job = await createJob(
        video.id, 
        selectedPresetId || undefined, 
        selectedPresetId === "manual" ? customParams : undefined
      );
      toast.success("Job started!");
      if (onComplete) onComplete(job);
    } catch (err: any) {
      toast.error(err.message || "Failed to start processing");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedPreset = presets.find(p => p.id === selectedPresetId);

  return (
    <div className="space-y-8 py-4">
      <AnimatePresence mode="wait">
        {step === 1 ? (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="flex flex-col gap-1">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Sparkles className="text-blue-400" size={20} />
                Select Editing Style
              </h3>
              <p className="text-sm text-slate-400">Choose a preset or create your own rhythm.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {presets.map((preset) => (
                <GlassCard
                  key={preset.id}
                  onClick={() => setSelectedPresetId(preset.id)}
                  className={cn(
                    "p-4 cursor-pointer border-2 transition-all duration-300 relative group",
                    selectedPresetId === preset.id ? "border-blue-500 bg-blue-500/5 ring-4 ring-blue-500/10" : "border-slate-800 hover:border-slate-700"
                  )}
                >
                  <div className="flex flex-col h-full justify-between gap-4">
                    <div className="space-y-1">
                      <h4 className="font-bold text-slate-100 flex items-center gap-2">
                        {preset.name}
                        {preset.pro_only && (
                          <span className="text-[10px] bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded-full uppercase tracking-widest border border-amber-500/20">PRO</span>
                        )}
                      </h4>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {preset.description}
                      </p>
                    </div>
                    
                    <div className="flex items-center justify-between mt-2">
                         <div className="flex gap-1">
                            {Object.entries(preset.parameters).slice(0, 2).map(([k, v]) => (
                                <span key={k} className="text-[10px] bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-slate-400">
                                   {k.replace('_seconds', '')}: {v as any}s
                                </span>
                            ))}
                         </div>
                         {selectedPresetId === preset.id && <Zap size={14} className="text-blue-500 fill-blue-500" />}
                    </div>
                  </div>
                </GlassCard>
              ))}

              <GlassCard
                onClick={() => setSelectedPresetId("manual")}
                className={cn(
                  "p-4 cursor-pointer border-2 border-dashed transition-all duration-300",
                  selectedPresetId === "manual" ? "border-blue-500 bg-blue-500/5 ring-4 ring-blue-500/10" : "border-slate-800 hover:border-slate-700 hover:bg-white/[0.02]"
                )}
              >
                <div className="flex flex-col items-center justify-center h-full gap-2 text-center py-4">
                  <Settings2 className={cn("transition-colors", selectedPresetId === "manual" ? "text-blue-500" : "text-slate-500")} size={24} />
                  <div>
                    <h4 className={cn("font-bold text-sm", selectedPresetId === "manual" ? "text-blue-400" : "text-slate-300")}>Manual Control</h4>
                    <p className="text-[11px] text-slate-500 mt-1">Set your own keep/cut timing</p>
                  </div>
                </div>
              </GlassCard>
            </div>

            <div className="flex items-center justify-between pt-6 border-t border-slate-800">
              <button onClick={onCancel} className="text-sm font-medium text-slate-400 hover:text-slate-300 transition-colors">
                Back to projects
              </button>
              <AIButton 
                onClick={selectedPresetId === "manual" ? () => setStep(2) : handleStartProcess}
                isLoading={isSubmitting}
                disabled={!selectedPresetId}
              >
                <div className="flex items-center gap-2">
                  <span>{selectedPresetId === "manual" ? "Next Step" : "Start Processing"}</span>
                  {selectedPresetId !== "manual" ? <Play size={16} fill="currentColor" /> : <ChevronRight size={18} />}
                </div>
              </AIButton>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
             <div className="flex items-center gap-4 mb-2">
                <button 
                  onClick={() => setStep(1)} 
                  className="p-2 rounded-full bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-all"
                >
                  <ArrowLeft size={16} />
                </button>
                <h3 className="text-xl font-bold">Custom Pattern</h3>
             </div>

             <GlassCard className="p-6 space-y-8">
                <div className="space-y-6">
                    <div className="space-y-3">
                        <div className="flex justify-between">
                            <label className="text-sm font-medium text-slate-300">Keep Content (Seconds)</label>
                            <span className="text-sm font-bold text-blue-400">{customParams.keep_seconds}s</span>
                        </div>
                        <input 
                            type="range" 
                            min="0.5" 
                            max="10" 
                            step="0.1" 
                            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                            value={customParams.keep_seconds}
                            onChange={(e) => setCustomParams(p => ({ ...p, keep_seconds: parseFloat(e.target.value) }))}
                        />
                    </div>

                    <div className="space-y-3">
                        <div className="flex justify-between">
                            <label className="text-sm font-medium text-slate-300">Cut Content (Seconds)</label>
                            <span className="text-sm font-bold text-red-400">{customParams.cut_seconds}s</span>
                        </div>
                        <input 
                            type="range" 
                            min="0.1" 
                            max="5" 
                            step="0.1" 
                            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-red-500"
                            value={customParams.cut_seconds}
                            onChange={(e) => setCustomParams(p => ({ ...p, cut_seconds: parseFloat(e.target.value) }))}
                        />
                    </div>
                </div>

                {/* Rhythm Visualizer */}
                <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Rhythm Preview</span>
                    <div className="h-6 w-full bg-slate-900 rounded-full border border-slate-800 overflow-hidden flex">
                        {Array.from({ length: 10 }).map((_, i) => (
                             <React.Fragment key={i}>
                                <div 
                                    className="bg-blue-500/40 h-full border-r border-blue-500/20" 
                                    style={{ flex: customParams.keep_seconds }} 
                                />
                                <div 
                                    className="bg-red-500/10 h-full border-r border-red-500/20" 
                                    style={{ flex: customParams.cut_seconds }} 
                                />
                             </React.Fragment>
                        ))}
                    </div>
                </div>
             </GlassCard>

             <div className="flex items-center justify-end pt-6 border-t border-slate-800">
              <AIButton 
                onClick={handleStartProcess}
                isLoading={isSubmitting}
              >
                <div className="flex items-center gap-2">
                  <span>Create Custom Job</span>
                  <Zap size={16} fill="currentColor" />
                </div>
              </AIButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
