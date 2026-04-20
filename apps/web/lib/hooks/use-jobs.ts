import { useState, useCallback, useEffect } from "react";
import Cookies from "js-cookie";

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
  created_at: string;
}

export function useJobs(videoId?: string) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchJobs = useCallback(async () => {
    setIsLoading(true);
    const token = Cookies.get("auth_token");
    let url = "http://localhost:8000/api/v1/jobs/";
    if (videoId) {
      url += `?video_id=${videoId}`;
    }

    try {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
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
      const response = await fetch("http://localhost:8000/api/v1/jobs/", {
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
        throw new Error(error.detail || "Failed to create job");
      }

      const newJob = await response.json();
      setJobs((prev) => [newJob, ...prev]);
      return newJob;
    } catch (error) {
      console.error("Failed to create job:", error);
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
    refreshJobs: fetchJobs,
  };
}
