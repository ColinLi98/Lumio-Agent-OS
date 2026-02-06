import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'lumi_gemini_api_key';
const PERSIST_KEY = 'lumi_api_key_persist';

/**
 * Get API key from environment variable.
 * SECURITY: API keys MUST NOT be hardcoded. They must be provided via:
 * - Environment variable: NEXT_PUBLIC_GEMINI_API_KEY or VITE_GEMINI_API_KEY
 * - User input (stored in localStorage if user opts in)
 */
export function getApiKeyFromEnv(): string | undefined {
  // Check Next.js environment variable
  if (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_GEMINI_API_KEY) {
    return process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  }
  // Check Vite environment variable
  if (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GEMINI_API_KEY) {
    return (import.meta as any).env.VITE_GEMINI_API_KEY;
  }
  return undefined;
}

export type ApiKeyStatus = 'empty' | 'validating' | 'valid' | 'invalid';

export interface ApiKeyState {
  key: string;
  status: ApiKeyStatus;
  persist: boolean;
  error?: string;
}

/**
 * Validates the API key by making a lightweight API call to Gemini.
 */
export async function validateApiKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
  if (!apiKey || apiKey.trim().length === 0) {
    return { valid: false, error: 'API Key cannot be empty' };
  }

  // Gemini API keys start with 'AIza'
  if (!apiKey.startsWith('AIza')) {
    return { valid: false, error: 'Invalid API Key format. Gemini keys start with "AIza"' };
  }

  try {
    // Use a simple models list to validate the key
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, {
      method: 'GET'
    });

    if (response.ok) {
      return { valid: true };
    } else {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData?.error?.message || `API Error: ${response.status}`;
      return { valid: false, error: errorMessage };
    }
  } catch (error) {
    return { valid: false, error: 'Network error. Please check your connection.' };
  }
}

/**
 * React Hook for managing API Key state with optional persistence.
 */
export function useApiKey(): {
  apiKeyState: ApiKeyState;
  setApiKey: (key: string) => void;
  setPersist: (persist: boolean) => void;
  saveAndValidate: () => Promise<boolean>;
  clearApiKey: () => void;
} {
  const [apiKeyState, setApiKeyState] = useState<ApiKeyState>(() => {
    // Priority: 1. Environment variable, 2. LocalStorage (if persisted)
    const envKey = getApiKeyFromEnv();
    if (envKey) {
      return { key: envKey, status: 'valid', persist: false };
    }

    // Initialize from LocalStorage if persistence was enabled
    if (typeof window !== 'undefined') {
      const persistEnabled = localStorage.getItem(PERSIST_KEY) === 'true';
      const storedKey = persistEnabled ? localStorage.getItem(STORAGE_KEY) || '' : '';
      return {
        key: storedKey,
        status: storedKey ? 'valid' : 'empty',
        persist: persistEnabled,
      };
    }
    return { key: '', status: 'empty', persist: false };
  });

  // Update LocalStorage when persist setting changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(PERSIST_KEY, String(apiKeyState.persist));
      if (apiKeyState.persist && apiKeyState.key) {
        localStorage.setItem(STORAGE_KEY, apiKeyState.key);
      } else if (!apiKeyState.persist) {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, [apiKeyState.persist, apiKeyState.key]);

  const setApiKey = useCallback((key: string) => {
    setApiKeyState(prev => ({
      ...prev,
      key,
      status: key ? prev.status : 'empty',
      error: undefined,
    }));
  }, []);

  const setPersist = useCallback((persist: boolean) => {
    setApiKeyState(prev => ({ ...prev, persist }));
  }, []);

  const saveAndValidate = useCallback(async (): Promise<boolean> => {
    const { key, persist } = apiKeyState;

    if (!key.trim()) {
      setApiKeyState(prev => ({ ...prev, status: 'empty', error: 'API Key is required' }));
      return false;
    }

    setApiKeyState(prev => ({ ...prev, status: 'validating', error: undefined }));

    const result = await validateApiKey(key);

    if (result.valid) {
      setApiKeyState(prev => ({ ...prev, status: 'valid', error: undefined }));

      // Persist if enabled
      if (persist && typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, key);
      }
      return true;
    } else {
      setApiKeyState(prev => ({
        ...prev,
        status: 'invalid',
        error: result.error
      }));
      return false;
    }
  }, [apiKeyState]);

  const clearApiKey = useCallback(() => {
    setApiKeyState({ key: '', status: 'empty', persist: false });
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(PERSIST_KEY);
    }
  }, []);

  return { apiKeyState, setApiKey, setPersist, saveAndValidate, clearApiKey };
}

// =============================================================================
// SerpApi Key Management (for Flight Search)
// =============================================================================

const SERPAPI_STORAGE_KEY = 'lumi_serpapi_key';

export interface SerpApiKeyState {
  key: string;
  isConfigured: boolean;
}

/**
 * React Hook for managing SerpApi Key for flight search
 */
export function useSerpApiKey(): {
  serpApiKey: string;
  isConfigured: boolean;
  setSerpApiKey: (key: string) => void;
  clearSerpApiKey: () => void;
} {
  const [state, setState] = useState<SerpApiKeyState>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(SERPAPI_STORAGE_KEY) || '';
      return { key: stored, isConfigured: stored.length > 0 };
    }
    return { key: '', isConfigured: false };
  });

  const setSerpApiKey = useCallback((key: string) => {
    if (typeof window !== 'undefined') {
      if (key) {
        localStorage.setItem(SERPAPI_STORAGE_KEY, key);
      } else {
        localStorage.removeItem(SERPAPI_STORAGE_KEY);
      }
    }
    setState({ key, isConfigured: key.length > 0 });
  }, []);

  const clearSerpApiKey = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(SERPAPI_STORAGE_KEY);
    }
    setState({ key: '', isConfigured: false });
  }, []);

  return {
    serpApiKey: state.key,
    isConfigured: state.isConfigured,
    setSerpApiKey,
    clearSerpApiKey
  };
}

/**
 * Get SerpApi key directly from localStorage (for non-hook contexts)
 */
export function getSerpApiKey(): string {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(SERPAPI_STORAGE_KEY) || '';
    if (stored) return stored;
  }

  // Env fallback for local dev / CI / server-side execution
  if (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SERPAPI_KEY) {
    return (import.meta as any).env.VITE_SERPAPI_KEY;
  }
  if (typeof process !== 'undefined' && process.env?.SERPAPI_KEY) {
    return process.env.SERPAPI_KEY;
  }
  if (typeof process !== 'undefined' && process.env?.VITE_SERPAPI_KEY) {
    return process.env.VITE_SERPAPI_KEY;
  }

  return '';
}
