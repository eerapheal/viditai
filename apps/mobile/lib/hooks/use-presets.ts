import { useState, useCallback } from 'react';
import { apiRequest } from '../api';

export interface Preset {
  id: string;
  name: string;
  description: string;
  job_type: string;
  icon?: string;
  parameters: Record<string, any>;
}

export function usePresets() {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchPresets = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiRequest('/presets/');
      setPresets(data);
    } catch (error) {
      console.error('Failed to fetch presets:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    presets,
    isLoading,
    fetchPresets,
  };
}
