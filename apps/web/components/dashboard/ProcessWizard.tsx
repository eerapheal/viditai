"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Settings2, Sparkles, ChevronRight, ArrowLeft, Loader2, Zap, Languages, Activity, Mic, Volume2, VolumeX, Music } from "lucide-react";
import { usePresets, Preset } from "@/lib/hooks/use-presets";
import { useJobs } from "@/lib/hooks/use-jobs";
import { VideoMetadata } from "@/lib/hooks/use-videos";
import { GlassCard } from "@/components/ui/GlassCard";
import { AIButton } from "@/components/ui/AIButton";
import { VideoCropControl, VideoCropSettings } from "@/components/dashboard/VideoCropControl";
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

  // Phase 3 Audio Settings
  const [audioSettings, setAudioSettings] = useState({
    mode: "original",
    library_track: "",
  });
  
  // Phase 4 AI Features
  const [addCaptions, setAddCaptions] = useState(false);
  const [removeSilence, setRemoveSilence] = useState(true);
  const [removeLowMotion, setRemoveLowMotion] = useState(true);
  const [voiceoverText, setVoiceoverText] = useState("");
  const [cropSettings, setCropSettings] = useState<VideoCropSettings>({
    enabled: false,
    mode: "edge_to_edge",
    rect: { x: 0, y: 0, width: 1, height: 1 },
  });

  const handleStartProcess = async () => {
    setIsSubmitting(true);
    try {
      const jobType = selectedPreset ? selectedPreset.job_type : "pattern_cut";
      const parameters = {
        ...(selectedPresetId === "manual" ? customParams : selectedPreset?.parameters),
        audio_mode: audioSettings.mode,
        add_captions: addCaptions,
        remove_silence: removeSilence,
        remove_low_motion: removeLowMotion,
        text: voiceoverText,
        crop: cropSettings,
      };

      const job = await createJob(
        video.id, 
        jobType,
        parameters,
        selectedPresetId && selectedPresetId !== "manual" ? selectedPresetId : undefined
      );
      toast.success("AI processing started!");
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
              <p className="text-sm text-slate-400">Choose a crop, then pick a preset or create your own rhythm.</p>
            </div>

            <VideoCropControl video={video} value={cropSettings} onChange={setCropSettings} />

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
                         <div className="flex gap-1 flex-wrap">
                            <span className="text-[10px] bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-slate-400 capitalize">
                              {preset.job_type.replace(/_/g, " ")}
                            </span>
                            {preset.parameters?.keep_seconds && (
                              <span className="text-[10px] bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-slate-400">
                                {preset.parameters.keep_seconds}s keep
                              </span>
                            )}
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
                onClick={() => setStep(selectedPresetId === "manual" ? 2 : 3)}
                isLoading={isSubmitting}
                disabled={!selectedPresetId}
              >
                <div className="flex items-center gap-2">
                  <span>Next Step</span>
                  <ChevronRight size={18} />
                </div>
              </AIButton>
            </div>
          </motion.div>
        ) : step === 2 ? (
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
              <AIButton onClick={() => setStep(3)}>
                <div className="flex items-center gap-2">
                  <span>Next: Audio Settings</span>
                  <ChevronRight size={18} />
                </div>
              </AIButton>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
             <div className="flex items-center gap-4 mb-2">
                <button 
                  onClick={() => setStep(selectedPresetId === "manual" ? 2 : 1)} 
                  className="p-2 rounded-full bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-all"
                >
                  <ArrowLeft size={16} />
                </button>
                <h3 className="text-xl font-bold">Audio & Safety</h3>
             </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { id: "original", title: "Original", desc: "No changes.", icon: <Volume2 className="text-amber-400" size={18} /> },
                  { id: "mute", title: "Mute", desc: "Silent output.", icon: <VolumeX className="text-slate-400" size={18} /> },
                  { id: "replace", title: "Remix", desc: "Royalty-free.", icon: <Music className="text-blue-400" size={18} /> }
                ].map((mode) => (
                  <GlassCard
                    key={mode.id}
                    onClick={() => setAudioSettings(prev => ({ ...prev, mode: mode.id }))}
                    className={cn(
                      "p-3 cursor-pointer border-2 transition-all duration-300",
                      audioSettings.mode === mode.id ? "border-blue-500 bg-blue-500/5" : "border-slate-800 hover:border-slate-700"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-slate-900 flex items-center justify-center">
                        {mode.icon}
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-slate-100">{mode.title}</h4>
                        <p className="text-[10px] text-slate-500">{mode.desc}</p>
                      </div>
                    </div>
                  </GlassCard>
                ))}
              </div>

              {/* AI Features (Phase 4) */}
              <div className="space-y-4 pt-4 border-t border-slate-800">
                <div className="flex flex-col gap-1">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Advanced AI Magic</h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                    {/* Smart Trimming */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900/50 border border-slate-800">
                            <div className="flex items-center gap-3">
                                <Activity size={16} className="text-blue-400" />
                                <span className="text-sm font-medium">Remove Silence</span>
                            </div>
                            <button 
                                onClick={() => setRemoveSilence(!removeSilence)}
                                className={cn("w-10 h-5 rounded-full transition-all relative", removeSilence ? "bg-blue-500" : "bg-slate-700")}
                            >
                                <div className={cn("absolute top-1 w-3 h-3 bg-white rounded-full transition-all", removeSilence ? "right-1" : "left-1")} />
                            </button>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900/50 border border-slate-800">
                            <div className="flex items-center gap-3">
                                <Zap size={16} className="text-blue-400" />
                                <span className="text-sm font-medium">Trim Low Motion</span>
                            </div>
                            <button 
                                onClick={() => setRemoveLowMotion(!removeLowMotion)}
                                className={cn("w-10 h-5 rounded-full transition-all relative", removeLowMotion ? "bg-blue-500" : "bg-slate-700")}
                            >
                                <div className={cn("absolute top-1 w-3 h-3 bg-white rounded-full transition-all", removeLowMotion ? "right-1" : "left-1")} />
                            </button>
                        </div>
                    </div>

                    {/* Captions & Script */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900/50 border border-slate-800">
                            <div className="flex items-center gap-3">
                                <Languages size={16} className="text-amber-400" />
                                <span className="text-sm font-medium">AI Auto-Captions</span>
                            </div>
                            <button 
                                onClick={() => setAddCaptions(!addCaptions)}
                                className={cn("w-10 h-5 rounded-full transition-all relative", addCaptions ? "bg-amber-500" : "bg-slate-700")}
                            >
                                <div className={cn("absolute top-1 w-3 h-3 bg-white rounded-full transition-all", addCaptions ? "right-1" : "left-1")} />
                            </button>
                        </div>
                        
                        {selectedPreset?.job_type === "voiceover_generation" ? (
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                    <Mic size={12} /> AI Script
                                </label>
                                <textarea 
                                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 min-h-[80px]"
                                    placeholder="What should the AI say?"
                                    value={voiceoverText}
                                    onChange={(e) => setVoiceoverText(e.target.value)}
                                />
                            </div>
                        ) : (
                            <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/10 flex items-center gap-3">
                                <Sparkles className="text-blue-400" size={16} />
                                <p className="text-[11px] text-slate-400 leading-tight">
                                    AI will analyze your video and optimize it for social media automatically.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
              </div>

             <div className="flex items-center justify-end pt-6 border-t border-slate-800">
              <AIButton 
                onClick={handleStartProcess}
                isLoading={isSubmitting}
              >
                <div className="flex items-center gap-2">
                  <span>Start AutoCut</span>
                  <Play size={16} fill="currentColor" />
                </div>
              </AIButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
