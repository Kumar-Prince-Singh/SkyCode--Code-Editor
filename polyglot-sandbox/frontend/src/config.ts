// For TanStack Start (SSR), we need to handle both client-side and server-side requests.
// Server-side: Use the Docker service name 'backend'
// Client-side: Use 'localhost' as seen from the browser

const isServer = typeof window === 'undefined';

export const API_BASE_URL = isServer 
  ? "http://backend:5000/api" 
  : (import.meta.env.VITE_API_URL || "http://localhost:5000/api");

export const SOCKET_URL = isServer 
  ? "http://backend:5000" 
  : (import.meta.env.VITE_SOCKET_URL || "http://localhost:5000");
