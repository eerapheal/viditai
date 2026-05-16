"use client";

import React, { useMemo, useState } from "react";
import {
  BadgeCheck,
  Check,
  ChevronRight,
  FileCheck2,
  Mic,
  Music,
  ShieldCheck,
  Sparkles,
  WandSparkles,
  VolumeX,
} from "lucide-react";
import { toast } from "sonner";
import { AIButton } from "@/components/ui/AIButton";
import { GlassCard } from "@/components/ui/GlassCard";
import { VideoCropControl, VideoCropSettings } from "@/components/dashboard/VideoCropControl";
import {
  AudioStrategy,
  RecreationAction,
  RightsBasis,
  SourceTreatment,
  useJobs,
} from "@/lib/hooks/use-jobs";
import { VideoMetadata } from "@/lib/hooks/use-videos";
import { cn } from "@/lib/utils";

interface RecreationWizardProps {
  video: VideoMetadata;
  onComplete?: (job: any) => void;
  onCancel?: () => void;
}

const actionOptions: Array<{
  id: RecreationAction;
  title: string;
  icon: React.ReactNode;
}> = [
  { id: "recreate_from_storyboard", title: "Storyboard", icon: <WandSparkles size={16} /> },
  { id: "transcript_to_new_video", title: "Transcript", icon: <FileCheck2 size={16} /> },
  { id: "generate_new_voiceover", title: "Voiceover", icon: <Mic size={16} /> },
  { id: "replace_audio_with_licensed_track", title: "Licensed Audio", icon: <Music size={16} /> },
  { id: "remove_own_branding", title: "Own Branding", icon: <BadgeCheck size={16} /> },
  { id: "youtube_policy_check", title: "Policy Check", icon: <ShieldCheck size={16} /> },
];

const treatmentOptions: Array<{ id: SourceTreatment; title: string }> = [
  { id: "storyboard_to_new_video", title: "Storyboard" },
  { id: "transcript_to_new_video", title: "Transcript" },
  { id: "reference_only", title: "Reference" },
  { id: "rights_safe_remix", title: "Remix" },
];

const audioOptions: Array<{ id: AudioStrategy; title: string; icon: React.ReactNode }> = [
  { id: "mute", title: "Mute", icon: <VolumeX size={16} /> },
  { id: "licensed_replacement", title: "Licensed", icon: <Music size={16} /> },
  { id: "original_if_owned", title: "Owned Original", icon: <BadgeCheck size={16} /> },
];

type AttestationRow = {
  label: string;
  checked: boolean;
  setChecked: React.Dispatch<React.SetStateAction<boolean>>;
};

export function RecreationWizard({ video, onComplete, onCancel }: RecreationWizardProps) {
  const { createRecreation } = useJobs();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState(video.original_filename?.replace(/\.[^/.]+$/, "") || "");
  const [prompt, setPrompt] = useState("");
  const [sourceTreatment, setSourceTreatment] = useState<SourceTreatment>("storyboard_to_new_video");
  const [audioStrategy, setAudioStrategy] = useState<AudioStrategy>("mute");
  const [rightsBasis, setRightsBasis] = useState<RightsBasis>("original_creator");
  const [licenseNotes, setLicenseNotes] = useState("");
  const [brandName, setBrandName] = useState("");
  const [requestedActions, setRequestedActions] = useState<RecreationAction[]>([
    "recreate_from_storyboard",
    "youtube_policy_check",
    "generate_new_voiceover",
  ]);
  const [desiredChanges, setDesiredChanges] = useState("new visuals, new pacing, new voiceover");
  const [ownershipConfirmed, setOwnershipConfirmed] = useState(false);
  const [transformationAllowed, setTransformationAllowed] = useState(false);
  const [youtubeAllowed, setYoutubeAllowed] = useState(false);
  const [brandOwnerConfirmed, setBrandOwnerConfirmed] = useState(false);
  const [cropSettings, setCropSettings] = useState<VideoCropSettings>({
    enabled: false,
    mode: "edge_to_edge",
    rect: { x: 0, y: 0, width: 1, height: 1 },
  });

  const wantsOwnBranding = requestedActions.includes("remove_own_branding");
  const canSubmit = useMemo(() => {
    if (!ownershipConfirmed || !transformationAllowed || !youtubeAllowed) return false;
    if (wantsOwnBranding && !brandOwnerConfirmed) return false;
    return requestedActions.length > 0;
  }, [brandOwnerConfirmed, ownershipConfirmed, requestedActions, transformationAllowed, wantsOwnBranding, youtubeAllowed]);

  const attestationRows: AttestationRow[] = [
    {
      label: "I own or control the required rights.",
      checked: ownershipConfirmed,
      setChecked: setOwnershipConfirmed,
    },
    {
      label: "AI transformation is allowed.",
      checked: transformationAllowed,
      setChecked: setTransformationAllowed,
    },
    {
      label: "YouTube upload is allowed.",
      checked: youtubeAllowed,
      setChecked: setYoutubeAllowed,
    },
  ];

  const toggleAction = (id: RecreationAction) => {
    setRequestedActions((current) =>
      current.includes(id) ? current.filter((action) => action !== id) : [...current, id]
    );
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const job = await createRecreation({
        video_id: video.id,
        title,
        target_platform: "youtube",
        source_treatment: sourceTreatment,
        prompt,
        desired_changes: desiredChanges
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        requested_actions: requestedActions,
        audio_strategy: audioStrategy,
        include_source_audio: audioStrategy === "original_if_owned",
        crop: cropSettings,
        own_branding: wantsOwnBranding
          ? {
              enabled: true,
              brand_owner_confirmed: brandOwnerConfirmed,
              brand_name: brandName || undefined,
              notes: licenseNotes || undefined,
            }
          : undefined,
        rights_attestation: {
          ownership_confirmed: ownershipConfirmed,
          rights_basis: rightsBasis,
          allow_ai_transformation: transformationAllowed,
          allow_youtube_upload: youtubeAllowed,
          notes: licenseNotes || undefined,
        },
      });
      toast.success("AI recreation queued");
      onComplete?.(job);
    } catch (error: any) {
      toast.error(error.message || "Failed to queue recreation");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 py-4">
      <div className="flex flex-col gap-1">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <Sparkles className="text-emerald-400" size={20} />
          AI Recreation
        </h3>
        <p className="text-sm text-slate-400">Create a new rights-safe plan for YouTube-ready output.</p>
      </div>

      <GlassCard className="p-5 border-slate-800">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Title</label>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Rights Basis</label>
            <select
              value={rightsBasis}
              onChange={(event) => setRightsBasis(event.target.value as RightsBasis)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="original_creator">Original creator</option>
              <option value="licensed">Licensed</option>
              <option value="public_domain">Public domain</option>
              <option value="client_supplied">Client supplied</option>
              <option value="other_authorized">Other authorized</option>
            </select>
          </div>
        </div>

        <div className="space-y-2 mt-4">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Prompt</label>
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Describe the new version: style, pacing, voiceover, visuals, and what should change."
            className="w-full min-h-[110px] bg-slate-950 border border-slate-800 rounded-lg px-3 py-3 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>
      </GlassCard>

      <VideoCropControl video={video} value={cropSettings} onChange={setCropSettings} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <GlassCard className="p-5 border-slate-800">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Source Treatment</label>
          <div className="grid grid-cols-2 gap-2 mt-3">
            {treatmentOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => setSourceTreatment(option.id)}
                className={cn(
                  "h-10 rounded-lg border text-xs font-bold transition-colors",
                  sourceTreatment === option.id
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-300"
                    : "border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700"
                )}
              >
                {option.title}
              </button>
            ))}
          </div>
        </GlassCard>

        <GlassCard className="p-5 border-slate-800">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Audio Strategy</label>
          <div className="grid grid-cols-3 gap-2 mt-3">
            {audioOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => setAudioStrategy(option.id)}
                className={cn(
                  "min-h-12 rounded-lg border text-xs font-bold transition-colors flex flex-col items-center justify-center gap-1",
                  audioStrategy === option.id
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-300"
                    : "border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700"
                )}
              >
                {option.icon}
                <span>{option.title}</span>
              </button>
            ))}
          </div>
        </GlassCard>
      </div>

      <GlassCard className="p-5 border-slate-800">
        <div className="flex items-center justify-between gap-4">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Allowed Actions</label>
          <span className="text-[11px] text-slate-500">{requestedActions.length} selected</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-3">
          {actionOptions.map((action) => {
            const selected = requestedActions.includes(action.id);
            return (
              <button
                key={action.id}
                onClick={() => toggleAction(action.id)}
                className={cn(
                  "min-h-12 rounded-lg border px-3 text-left text-xs font-bold transition-colors flex items-center gap-2",
                  selected
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-300"
                    : "border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700"
                )}
              >
                <span className={cn("flex h-7 w-7 items-center justify-center rounded bg-slate-900", selected && "text-emerald-300")}>
                  {action.icon}
                </span>
                <span>{action.title}</span>
              </button>
            );
          })}
        </div>
      </GlassCard>

      {wantsOwnBranding && (
        <GlassCard className="p-5 border-emerald-500/30">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-end">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Brand Name</label>
              <input
                value={brandName}
                onChange={(event) => setBrandName(event.target.value)}
                placeholder="Your brand or channel name"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            <label className="flex min-h-10 items-center gap-2 rounded-lg border border-slate-800 bg-slate-950 px-3 text-xs font-bold text-slate-300">
              <input
                type="checkbox"
                checked={brandOwnerConfirmed}
                onChange={(event) => setBrandOwnerConfirmed(event.target.checked)}
                className="accent-emerald-500"
              />
              I own this branding
            </label>
          </div>
        </GlassCard>
      )}

      <GlassCard className="p-5 border-slate-800">
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Desired Changes</label>
          <input
            value={desiredChanges}
            onChange={(event) => setDesiredChanges(event.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>
        <div className="space-y-2 mt-4">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">License Notes</label>
          <textarea
            value={licenseNotes}
            onChange={(event) => setLicenseNotes(event.target.value)}
            placeholder="License, client approval, or project reference."
            className="w-full min-h-[70px] bg-slate-950 border border-slate-800 rounded-lg px-3 py-3 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>
      </GlassCard>

      <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
        {attestationRows.map((row) => (
          <label key={row.label} className="flex items-center gap-3 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={row.checked}
              onChange={(event) => row.setChecked(event.target.checked)}
              className="accent-emerald-500"
            />
            <span>{row.label}</span>
          </label>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-slate-800">
        <button onClick={onCancel} className="text-sm font-medium text-slate-400 hover:text-slate-300 transition-colors">
          Back to projects
        </button>
        <AIButton onClick={handleSubmit} isLoading={isSubmitting} disabled={!canSubmit} className="sm:w-auto">
          <div className="flex items-center justify-center gap-2">
            <Check size={16} />
            <span>Queue Recreation</span>
            <ChevronRight size={16} />
          </div>
        </AIButton>
      </div>
    </div>
  );
}
