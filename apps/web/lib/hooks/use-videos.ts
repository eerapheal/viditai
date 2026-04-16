import { useState, useCallback, useEffect } from "react";
import Cookies from "js-cookie";

export interface VideoMetadata {
  id: string;
  original_filename: string;
  title?: string;
  description?: string;
  duration_seconds: number;
  width: number;
  height: number;
  thumbnail_url: string | null;
  created_at: string;
}

export function useVideos() {
  const [videos, setVideos] = useState<VideoMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const fetchVideos = useCallback(async () => {
    setIsLoading(true);
    const token = Cookies.get("auth_token");
    try {
      const response = await fetch("http://localhost:8000/api/v1/videos/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setVideos(data.items);
      }
    } catch (error) {
      console.error("Failed to fetch videos:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const uploadVideo = async (file: File) => {
    setUploadProgress(0);
    const token = Cookies.get("auth_token");
    const formData = new FormData();
    formData.append("file", file);

    try {
      // Using XMLHttpRequest for progress tracking
      return new Promise<VideoMetadata>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "http://localhost:8000/api/v1/videos/upload", true);
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const pct = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(pct);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const data = JSON.parse(xhr.responseText);
            setVideos((prev) => [data, ...prev]);
            setUploadProgress(null);
            resolve(data);
          } else {
            const error = JSON.parse(xhr.responseText);
            setUploadProgress(null);
            reject(new Error(error.detail || "Upload failed"));
          }
        };

        xhr.onerror = () => {
          setUploadProgress(null);
          reject(new Error("Network error"));
        };

        xhr.send(formData);
      });
    } catch (error) {
      setUploadProgress(null);
      throw error;
    }
  };

  const deleteVideo = async (id: string) => {
    const token = Cookies.get("auth_token");
    try {
        const response = await fetch(`http://localhost:8000/api/v1/videos/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
        });
        if (response.ok) {
            setVideos(prev => prev.filter(v => v.id !== id));
        }
    } catch (error) {
        console.error("Failed to delete video:", error);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  return {
    videos,
    isLoading,
    uploadProgress,
    uploadVideo,
    deleteVideo,
    refreshVideos: fetchVideos
  };
}
