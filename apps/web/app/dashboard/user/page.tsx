"use client";

import React, { useState } from "react";
import { useAuth } from "@/lib/contexts/auth-context";
import { GlassCard } from "@/components/ui/GlassCard";
import { Video, Star, Clock, Plus, LayoutGrid, History, Sparkles, ArrowLeft } from "lucide-react";
import { useVideos, VideoMetadata } from "@/lib/hooks/use-videos";
import { useJobs, Job } from "@/lib/hooks/use-jobs";
import { VideoUpload } from "@/components/dashboard/VideoUpload";
import { VideoGrid } from "@/components/dashboard/VideoGrid";
import { ProcessWizard } from "@/components/dashboard/ProcessWizard";
import { JobActivity } from "@/components/dashboard/JobActivity";
import { VideoResultView } from "@/components/dashboard/VideoResultView";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

type ViewState = "overview" | "upload" | "process" | "result";

export default function UserDashboard() {
  const { user } = useAuth();
  const { videos, isLoading: loadingVideos, deleteVideo } = useVideos();
  const { jobs } = useJobs();
  
  const [viewState, setViewState] = useState<ViewState>("overview");
  const [selectedVideo, setSelectedVideo] = useState<VideoMetadata | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  const activeJobsCount = jobs.filter(j => j.status === "processing").length;
  const totalExports = user?.monthly_exports_used || 0;

  const handleVideoSelect = (video: VideoMetadata) => {
    setSelectedVideo(video);
    setViewState("process");
  };

  const handleViewResult = (job: Job) => {
    setSelectedJob(job);
    setViewState("result");
  };

  return (
    <div className="space-y-8 min-h-screen">
      <AnimatePresence mode="wait">
        {viewState === "overview" && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8"
          >
            {/* Header */}
            <div className="flex items-end justify-between">
              <div>
                <h2 className="text-3xl font-bold font-glow">Welcome, {user?.full_name?.split(" ")[0] || "Creator"}</h2>
                <p className="text-slate-400 mt-1">Transform your footage into viral hits.</p>
              </div>
              
              <button 
                onClick={() => setViewState("upload")}
                className="flex items-center gap-2 px-6 py-3 rounded-full bg-blue-600 hover:bg-blue-500 font-bold transition-all shadow-lg shadow-blue-500/20 active:scale-95 group overflow-hidden relative"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                <Plus size={18} />
                <span>Upload New Video</span>
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <GlassCard className="p-6 space-y-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <Video className="text-blue-400" size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-slate-400 uppercase tracking-widest">Library Size</h3>
                  <p className="text-3xl font-bold mt-1">{videos.length} Videos</p>
                </div>
              </GlassCard>

              <GlassCard className="p-6 space-y-4">
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                  <Sparkles className="text-purple-400" size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-slate-400 uppercase tracking-widest">Active Jobs</h3>
                  <p className="text-3xl font-bold mt-1">{activeJobsCount} Processing</p>
                </div>
              </GlassCard>

              <GlassCard className="p-6 space-y-4">
                <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                  <Clock className="text-green-400" size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-slate-400 uppercase tracking-widest">Usage</h3>
                  <p className="text-3xl font-bold mt-1 text-glow">{totalExports} Exports</p>
                </div>
              </GlassCard>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              <div className="xl:col-span-2 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <LayoutGrid size={20} className="text-blue-500" />
                    My Footage
                  </h3>
                </div>
                <VideoGrid 
                  videos={videos} 
                  onSelect={handleVideoSelect} 
                  onDelete={deleteVideo} 
                />
              </div>

              <div className="space-y-6">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <History size={20} className="text-purple-500" />
                  Recent Activity
                </h3>
                <JobActivity onViewResult={handleViewResult} />
              </div>
            </div>
          </motion.div>
        )}

        {viewState === "upload" && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="max-w-2xl mx-auto py-12"
          >
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setViewState("overview")} 
                  className="p-2 rounded-full bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-all"
                >
                  <ArrowLeft size={18} />
                </button>
                <h2 className="text-2xl font-bold">New Project</h2>
              </div>
              <VideoUpload 
                onUploadComplete={(v) => {
                  setSelectedVideo(v);
                  setViewState("process");
                }} 
                onClose={() => setViewState("overview")} 
              />
            </div>
          </motion.div>
        )}

        {viewState === "process" && selectedVideo && (
          <motion.div
            key="process"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="max-w-4xl mx-auto py-6"
          >
            <div className="flex items-center gap-4 mb-8">
              <button 
                onClick={() => setViewState("overview")} 
                className="p-2 rounded-full bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-all"
              >
                <ArrowLeft size={18} />
              </button>
              <div>
                <h2 className="text-2xl font-bold">Configure Processing</h2>
                <p className="text-slate-400 text-sm">Target: {selectedVideo.original_filename}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2">
                    <ProcessWizard 
                        video={selectedVideo} 
                        onCancel={() => setViewState("overview")}
                        onComplete={() => setViewState("overview")}
                    />
                </div>
                <div className="space-y-6">
                     <GlassCard className="p-0 overflow-hidden border-slate-800">
                        <div className="aspect-[9/16] relative bg-black">
                             {selectedVideo.thumbnail_url ? (
                                <img 
                                    src={`http://localhost:8000${selectedVideo.thumbnail_url}`} 
                                    className="w-full h-full object-cover opacity-60"
                                    alt="Preview"
                                />
                             ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-700">
                                    <Video size={48} />
                                </div>
                             )}
                             <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black flex items-center justify-center">
                                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Source Preview</span>
                             </div>
                        </div>
                     </GlassCard>
                </div>
            </div>
          </motion.div>
        )}

        {viewState === "result" && selectedJob && (
          <motion.div
            key="result"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full"
          >
            <VideoResultView 
              job={selectedJob} 
              onBack={() => {
                setSelectedJob(null);
                setViewState("overview");
              }} 
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
