import { useState, useCallback } from 'react';
import { apiRequest } from '../api';

export interface Job {
  job_id: string;
  job_type: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  created_at: string;
  error_message?: string;
  download_url?: string;
  risk_level?: 'low' | 'medium' | 'high';
  risk_details?: {
    audio_detected: boolean;
    audio_mode: string;
    note?: string;
  };
}

export function useJobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchJobs = useCallback(async (videoId?: string) => {
    setIsLoading(true);
    try {
      const endpoint = videoId ? `/jobs/?video_id=${videoId}` : '/jobs/';
      const data = await apiRequest(endpoint);
      setJobs(data.items || []);
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createJob = async (videoId: string, jobType: string, parameters: any) => {
    setIsLoading(true);
    try {
      const data = await apiRequest('/jobs/', {
        method: 'POST',
        body: JSON.stringify({
          video_id: videoId,
          job_type: jobType,
          parameters,
        }),
      });
      await fetchJobs();
      return data;
    } catch (error) {
      console.error('Failed to create job:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    jobs,
    isLoading,
    fetchJobs,
    createJob,
  };
}
