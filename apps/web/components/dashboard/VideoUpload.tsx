"use client";

import React, { useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, X, FileVideo, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { useVideos } from "@/lib/hooks/use-videos";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface VideoUploadProps {
  onUploadComplete?: (video: any) => void;
  onClose?: () => void;
}

export function VideoUpload({ onUploadComplete, onClose }: VideoUploadProps) {
  const { uploadVideo, uploadProgress } = useVideos();
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("video/")) {
      setError("Please upload a valid video file.");
      toast.error("Invalid file type");
      return;
    }

    setError(null);
    try {
      const video = await uploadVideo(file);
      toast.success("Upload complete!");
      if (onUploadComplete) onUploadComplete(video);
    } catch (err: any) {
      setError(err.message || "Failed to upload video");
      toast.error(err.message || "Upload failed");
    }
  }, [uploadVideo, onUploadComplete]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="relative">
      <AnimatePresence>
        {uploadProgress !== null ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-col items-center justify-center py-12 px-6 text-center space-y-6"
          >
            <div className="relative w-24 h-24">
              <svg className="w-full h-full" viewBox="0 0 100 100">
                <circle
                  className="text-slate-800 stroke-current"
                  strokeWidth="8"
                  fill="transparent"
                  r="40"
                  cx="50"
                  cy="50"
                />
                <motion.circle
                  className="text-blue-500 stroke-current"
                  strokeWidth="8"
                  strokeLinecap="round"
                  fill="transparent"
                  r="40"
                  cx="50"
                  cy="50"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: uploadProgress / 100 }}
                  transition={{ duration: 0.5, ease: "easeInOut" }}
                  style={{
                    rotate: -90,
                    transformOrigin: "50% 50%",
                  }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-bold">{uploadProgress}%</span>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold">Processing Upload</h3>
              <p className="text-sm text-slate-400 mt-1">Please keep this window open...</p>
            </div>
            <Loader2 className="animate-spin text-blue-500/50" size={20} />
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "relative border-2 border-dashed rounded-2xl transition-all duration-300 group",
              isDragging ? "border-blue-500 bg-blue-500/10" : "border-slate-800 hover:border-slate-700",
              error ? "border-red-500/50 bg-red-500/5" : ""
            )}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
          >
            <label className="flex flex-col items-center justify-center py-16 px-6 cursor-pointer text-center">
              <input type="file" className="hidden" accept="video/*" onChange={onFileChange} />
              
              <div className={cn(
                "w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110 duration-300",
                isDragging ? "bg-blue-500 text-white" : "bg-slate-900 text-slate-400"
              )}>
                <Upload size={32} />
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-bold">
                  {isDragging ? "Drop your video here" : "Upload Video Footage"}
                </h3>
                <p className="text-sm text-slate-400 max-w-xs mx-auto">
                  Drag and drop your file here, or click to browse. MP4, MOV, and WebM supported.
                </p>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-400 text-xs mt-6 bg-red-500/10 px-3 py-1.5 rounded-full">
                  <AlertCircle size={14} />
                  <span>{error}</span>
                </div>
              )}
            </label>

            {onClose && (
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-full text-slate-500 hover:bg-slate-800 hover:text-slate-300 transition-colors"
              >
                <X size={18} />
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
