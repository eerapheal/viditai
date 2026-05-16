import { useState, useCallback, useEffect } from "react";
import Cookies from "js-cookie";
import { API_V1 } from "@/lib/config";

export type JobStatus = "pending" | "processing" | "completed" | "failed" | "cancelled";

export interface Job {
  id: string;
  job_id: string; // for compatibility with Schema
  job_type: string;
  status: JobStatus;
  progress: number;
  progress_pct: number;
  risk_level: "low" | "medium" | "high";
  risk_details: any;
  output_filename: string | null;
  download_url: string | null;
  error_message: string | null;
  output_duration_seconds: number | null;
  output_size_bytes: number | null;
  created_at: string;
}

export type RecreationAction =
  | "remove_own_branding"
  | "replace_audio_with_licensed_track"
  | "generate_new_voiceover"
  | "recreate_from_storyboard"
  | "transcript_to_new_video"
  | "youtube_policy_check";

export type RightsBasis =
  | "original_creator"
  | "licensed"
  | "public_domain"
  | "client_supplied"
  | "other_authorized";

export type SourceTreatment =
  | "reference_only"
  | "transcript_to_new_video"
  | "storyboard_to_new_video"
  | "rights_safe_remix";

export type AudioStrategy = "mute" | "licensed_replacement" | "original_if_owned";

export interface VideoCropPayload {
  enabled: boolean;
  mode: "edge_to_edge" | "spot_to_spot";
  rect: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface RecreationPayload {
  video_id: string;
  title?: string;
  target_platform: string;
  source_treatment: SourceTreatment;
  prompt?: string;
  desired_changes: string[];
  requested_actions: RecreationAction[];
  audio_strategy: AudioStrategy;
  include_source_audio: boolean;
  crop?: VideoCropPayload;
  own_branding?: {
    enabled: boolean;
    brand_owner_confirmed: boolean;
    brand_name?: string;
    notes?: string;
  };
  rights_attestation: {
    ownership_confirmed: boolean;
    rights_basis: RightsBasis;
    allow_ai_transformation: boolean;
    allow_youtube_upload: boolean;
    notes?: string;
  };
}

export interface RecreationJob {
  job_id: string;
  status: JobStatus;
  video_id: string;
  job_type: "ai_recreate";
  safety_policy: string;
  next_step: string;
  parameters: Record<string, any>;
}

export async function downloadJobOutput(job: Job) {
  const token = Cookies.get("auth_token");
  const response = await fetch(`${API_V1}/jobs/${job.job_id || job.id}/download`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    const detail = error?.detail || "Output is not ready for download";
    throw new Error(detail);
  }

  const blob = await response.blob();
  const disposition = response.headers.get("content-disposition") || "";
  const match = disposition.match(/filename="?([^"]+)"?/i);
  const filename = match?.[1] || job.output_filename || `${job.job_type || "output"}.mp4`;
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

export function useJobs(videoId?: string) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchJobs = useCallback(async () => {
    setIsLoading(true);
    const token = Cookies.get("auth_token");
    let url = `${API_V1}/jobs/`;
    if (videoId) {
      url += `?video_id=${videoId}`;
    }

    try {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.status === 401) {
        Cookies.remove("auth_token");
        window.location.href = "/login";
        return;
      }
      if (response.ok) {
        const data = await response.json();
        // The API returns { items: [...] }
        setJobs(data.items);
      }
    } catch (error) {
      console.error("Failed to fetch jobs:", error);
    } finally {
      setIsLoading(false);
    }
  }, [videoId]);

  const createJob = async (videoId: string, jobType: string = "pattern_cut", parameters: any = {}, presetId?: string) => {
    const token = Cookies.get("auth_token");
    try {
      const response = await fetch(`${API_V1}/jobs/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          video_id: videoId,
          job_type: jobType,
          preset_id: presetId,
          parameters: parameters,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        const detail = typeof error.detail === "string" 
          ? error.detail 
          : Array.isArray(error.detail) 
            ? error.detail.map((e: any) => e.msg || JSON.stringify(e)).join(", ")
            : JSON.stringify(error.detail);
        throw new Error(detail || "Failed to create job");
      }

      const newJob = await response.json();
      setJobs((prev) => [newJob, ...prev]);
      return newJob;
    } catch (error) {
      console.error("Failed to create job:", error);
      throw error;
    }
  };

  const createRecreation = async (payload: RecreationPayload): Promise<RecreationJob> => {
    const token = Cookies.get("auth_token");
    try {
      const response = await fetch(`${API_V1}/recreations/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        const detail = typeof error.detail === "string"
          ? error.detail
          : Array.isArray(error.detail)
            ? error.detail.map((e: any) => e.msg || JSON.stringify(e)).join(", ")
            : JSON.stringify(error.detail);
        throw new Error(detail || "Failed to create recreation");
      }

      const recreation = await response.json();
      const jobLike: Job = {
        id: recreation.job_id,
        job_id: recreation.job_id,
        job_type: recreation.job_type,
        status: recreation.status,
        progress: 0,
        progress_pct: 0,
        risk_level: recreation.parameters?.risk_level || "medium",
        risk_details: recreation.parameters?.risk_details || {},
        output_filename: null,
        download_url: null,
        error_message: null,
        output_duration_seconds: null,
        output_size_bytes: null,
        created_at: new Date().toISOString(),
      };
      setJobs((prev) => [jobLike, ...prev]);
      return recreation;
    } catch (error) {
      console.error("Failed to create recreation:", error);
      throw error;
    }
  };

  // Polling for active jobs
  useEffect(() => {
    const activeJobs = jobs.filter(j => j.status === "pending" || j.status === "processing");
    if (activeJobs.length === 0) return;

    const interval = setInterval(() => {
      fetchJobs();
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(interval);
  }, [jobs, fetchJobs]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  return {
    jobs,
    isLoading,
    createJob,
    createRecreation,
    refreshJobs: fetchJobs,
  };
}
