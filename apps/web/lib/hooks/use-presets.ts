import { useState, useCallback, useEffect } from "react";
import Cookies from "js-cookie";
import { API_V1 } from "@/lib/config";

export interface Preset {
  id: string;
  name: string;
  description: string;
  job_type: string;
  parameters: any;
  is_builtin: boolean;
  pro_only: boolean;
}

export function usePresets() {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchPresets = useCallback(async () => {
    setIsLoading(true);
    const token = Cookies.get("auth_token");
    try {
      const response = await fetch(`${API_V1}/presets/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setPresets(data);
      }
    } catch (error) {
      console.error("Failed to fetch presets:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPresets();
  }, [fetchPresets]);

  return {
    presets,
    isLoading,
    refreshPresets: fetchPresets,
  };
}
