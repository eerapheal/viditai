"use client";

import React, { useMemo, useRef, useState } from "react";
import { Crop, Maximize2, Move } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { VideoMetadata } from "@/lib/hooks/use-videos";
import { API_BASE } from "@/lib/config";
import { cn } from "@/lib/utils";

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface VideoCropSettings {
  enabled: boolean;
  mode: "edge_to_edge" | "spot_to_spot";
  rect: CropRect;
}

interface VideoCropControlProps {
  video: VideoMetadata;
  value: VideoCropSettings;
  onChange: (value: VideoCropSettings) => void;
}

const fullRect: CropRect = { x: 0, y: 0, width: 1, height: 1 };

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, max));
}

function roundRect(rect: CropRect): CropRect {
  return {
    x: Number(rect.x.toFixed(4)),
    y: Number(rect.y.toFixed(4)),
    width: Number(rect.width.toFixed(4)),
    height: Number(rect.height.toFixed(4)),
  };
}

function cropForAspect(video: VideoMetadata, aspect: number): CropRect {
  const sourceAspect = video.width / video.height;
  if (!Number.isFinite(sourceAspect) || sourceAspect <= 0) return fullRect;
  if (sourceAspect > aspect) {
    const width = aspect / sourceAspect;
    return roundRect({ x: (1 - width) / 2, y: 0, width, height: 1 });
  }
  const height = sourceAspect / aspect;
  return roundRect({ x: 0, y: (1 - height) / 2, width: 1, height });
}

export function VideoCropControl({ video, value, onChange }: VideoCropControlProps) {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);

  const thumbnailUrl = video.thumbnail_url ? `${API_BASE}${video.thumbnail_url}` : "";
  const rect = value.enabled ? value.rect : fullRect;
  const cropStyle = useMemo(
    () => ({
      left: `${rect.x * 100}%`,
      top: `${rect.y * 100}%`,
      width: `${rect.width * 100}%`,
      height: `${rect.height * 100}%`,
    }),
    [rect]
  );

  const setPreset = (mode: VideoCropSettings["mode"], nextRect: CropRect) => {
    onChange({ enabled: mode === "spot_to_spot", mode, rect: roundRect(nextRect) });
  };

  const pointerToPercent = (event: React.PointerEvent<HTMLDivElement>) => {
    const bounds = frameRef.current?.getBoundingClientRect();
    if (!bounds) return null;
    return {
      x: clamp((event.clientX - bounds.left) / bounds.width, 0, 1),
      y: clamp((event.clientY - bounds.top) / bounds.height, 0, 1),
    };
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const point = pointerToPercent(event);
    if (!point) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDragging(true);
    setDragStart(point);
    onChange({ enabled: true, mode: "spot_to_spot", rect: { ...point, width: 0.01, height: 0.01 } });
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !dragStart) return;
    const point = pointerToPercent(event);
    if (!point) return;
    const x = Math.min(dragStart.x, point.x);
    const y = Math.min(dragStart.y, point.y);
    const width = Math.max(0.01, Math.abs(point.x - dragStart.x));
    const height = Math.max(0.01, Math.abs(point.y - dragStart.y));
    onChange({ enabled: true, mode: "spot_to_spot", rect: roundRect({ x, y, width, height }) });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    setDragStart(null);
  };

  return (
    <GlassCard className="p-5 border-slate-800 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Crop className="text-blue-400" size={18} />
          <h4 className="text-sm font-bold">Frame Crop</h4>
        </div>
        <button
          onClick={() => setPreset("edge_to_edge", fullRect)}
          className={cn(
            "flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[11px] font-bold transition-colors",
            !value.enabled
              ? "border-blue-500 bg-blue-500/10 text-blue-300"
              : "border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700"
          )}
        >
          <Maximize2 size={13} />
          Edge to Edge
        </button>
      </div>

      <div
        ref={frameRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="relative aspect-video overflow-hidden rounded-lg border border-slate-800 bg-slate-950 touch-none cursor-crosshair"
      >
        {thumbnailUrl ? (
          <div
            aria-hidden="true"
            className="h-full w-full select-none bg-cover bg-center"
            style={{ backgroundImage: `url(${thumbnailUrl})` }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-700">
            <Crop size={28} />
          </div>
        )}
        {value.enabled && <div className="absolute inset-0 bg-black/55" />}
        <div
          className={cn(
            "absolute border-2 border-blue-400 bg-blue-400/10 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]",
            isDragging && "border-white"
          )}
          style={cropStyle}
        >
          <div className="absolute inset-0 grid grid-cols-3 grid-rows-3">
            {Array.from({ length: 9 }).map((_, index) => (
              <div key={index} className="border border-white/20" />
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "9:16", rect: cropForAspect(video, 9 / 16) },
          { label: "1:1", rect: cropForAspect(video, 1) },
          { label: "16:9", rect: cropForAspect(video, 16 / 9) },
        ].map((preset) => (
          <button
            key={preset.label}
            onClick={() => setPreset("spot_to_spot", preset.rect)}
            className="h-9 rounded-lg border border-slate-800 bg-slate-950 text-xs font-bold text-slate-300 transition-colors hover:border-blue-500/50 hover:text-blue-300"
          >
            {preset.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-[11px] text-slate-500">
        <Move size={13} className="shrink-0" />
        <span>
          Drag spot to spot on the frame, or keep edge to edge for the full video.
        </span>
      </div>
    </GlassCard>
  );
}
