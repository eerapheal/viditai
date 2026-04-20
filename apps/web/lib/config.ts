/**
 * Central API configuration for the web app.
 * All hooks and components must import API_BASE from here — never hardcode URLs.
 */

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
export const API_V1 = `${API_BASE}/api/v1`;
