import { useState, useCallback } from 'react';
import { apiRequest } from '../api';

export interface Video {
  video_id: string;
  original_filename: string;
  status: string;
  duration?: number;
  thumbnail_url?: string;
  created_at: string;
}

export function useVideos() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const fetchVideos = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiRequest('/videos/');
      setVideos(data.items || []);
    } catch (error) {
      console.error('Failed to fetch videos:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const uploadVideo = async (uri: string, filename: string, mimeType: string, file?: any) => {
    setIsLoading(true);
    setUploadProgress(0.1); 

    try {
      const formData = new FormData();
      
      if (file) {
        // Web: use the File/Blob object directly
        formData.append('file', file, filename);
      } else {
        // Native: use the React Native file object
        // @ts-ignore
        formData.append('file', {
          uri,
          name: filename,
          type: mimeType,
        });
      }

      const response = await fetch(`${require('../api').API_URL}/videos/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${await require('../api').getToken()}`,
          'Accept': 'application/json',
        },
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        const errorDetail = typeof data.detail === 'object' ? JSON.stringify(data.detail) : (data.detail || 'Upload failed');
        throw new Error(errorDetail);
      }
      
      setUploadProgress(1);
      await fetchVideos();
      return data;
    } catch (error: any) {
      console.error('Upload error:', error);
      throw error;
    } finally {
      setIsLoading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  return {
    videos,
    isLoading,
    uploadProgress,
    fetchVideos,
    uploadVideo,
  };
}
