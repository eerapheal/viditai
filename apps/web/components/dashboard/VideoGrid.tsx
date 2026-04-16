"use client";

import React from "react";
import { motion } from "framer-motion";
import { Play, Clock, Trash2, Video as VideoIcon } from "lucide-react";
import { VideoMetadata } from "@/lib/hooks/use-videos";
import { GlassCard } from "@/components/ui/GlassCard";
import { cn } from "@/lib/utils";

interface VideoGridProps {
  videos: VideoMetadata[];
  onSelect?: (video: VideoMetadata) => void;
  onDelete?: (id: string) => void;
  selectedId?: string;
}

export function VideoGrid({ videos, onSelect, onDelete, selectedId }: VideoGridProps) {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (videos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500 border-2 border-dashed border-slate-800 rounded-3xl">
        <VideoIcon size={48} className="mb-4 opacity-20" />
        <p className="text-lg font-medium">No footage uploaded yet</p>
        <p className="text-sm opacity-60">Upload a video to get started with AutoCut</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {videos.map((video, index) => (
        <motion.div
          key={video.id}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.05 }}
          whileHover={{ y: -4 }}
          className="relative group"
        >
          <GlassCard
            className={cn(
              "overflow-hidden p-0 border-2 transition-all duration-300",
              selectedId === video.id ? "border-blue-500 bg-blue-500/5 ring-4 ring-blue-500/10" : "border-slate-800/50 hover:border-slate-700"
            )}
            onClick={() => onSelect?.(video)}
          >
            {/* Thumbnail */}
            <div className="aspect-video relative overflow-hidden bg-slate-900 group/thumb">
              {video.thumbnail_url ? (
                <img
                  src={`http://localhost:8000${video.thumbnail_url}`}
                  alt={video.original_filename}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover/thumb:scale-110"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <VideoIcon className="text-slate-700" size={32} />
                </div>
              )}
              
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white transform scale-90 group-hover/thumb:scale-100 transition-transform">
                  <Play size={20} fill="currentColor" />
                </div>
              </div>

              <div className="absolute bottom-2 right-2 px-2 py-1 rounded bg-black/60 backdrop-blur-md text-[10px] font-bold text-white flex items-center gap-1">
                <Clock size={10} />
                {formatDuration(video.duration_seconds)}
              </div>
            </div>

            {/* Info */}
            <div className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <h4 className="font-semibold text-sm line-clamp-1 flex-1 group-hover:text-blue-400 transition-colors">
                  {video.title || video.original_filename}
                </h4>
                {onDelete && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(video.id);
                    }}
                    className="p-1.5 rounded-lg text-slate-500 hover:bg-red-500/10 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              
              <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                <span>{formatDate(video.created_at)}</span>
                <span className="uppercase tracking-wider">{(video.height >= 1080) ? 'HD' : 'SD'}</span>
              </div>
            </div>
          </GlassCard>
          
          {selectedId === video.id && (
             <motion.div 
               layoutId="selection-ring"
               className="absolute -inset-1 border-2 border-blue-500 rounded-[28px] pointer-events-none z-10"
             />
          )}
        </motion.div>
      ))}
    </div>
  );
}
