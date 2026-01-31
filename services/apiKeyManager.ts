import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'lumi_deepseek_api_key';
const PERSIST_KEY = 'lumi_api_key_persist';

// Default API key for testing and development (DeepSeek)
export const DEFAULT_API_KEY = 'sk-a10ec169b72846d1bdcfb93fe87286ce';

export type ApiKeyStatus = 'empty' | 'validating' | 'valid' | 'invalid';

export interface ApiKeyState {
  key: string;
  status: ApiKeyStatus;
  persist: boolean;
  error?: string;
}

/**
 * Validates the API key by making a lightweight API call to DeepSeek.
 */
export async function validateApiKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
  if (!apiKey || apiKey.trim().length === 0) {
    return { valid: false, error: 'API Key cannot be empty' };
  }

  // DeepSeek API keys start with 'sk-'
  if (!apiKey.startsWith('sk-')) {
    return { valid: false, error: 'Invalid API Key format. DeepSeek keys start with "sk-"' };
  }

  try {
    // Use a simple chat completion to validate the key
    const response = await fetch('https://api.deepseek.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
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
    // Initialize from LocalStorage if persistence was enabled
    if (typeof window !== 'undefined') {
      const persistEnabled = localStorage.getItem(PERSIST_KEY) === 'true';
      const storedKey = persistEnabled ? localStorage.getItem(STORAGE_KEY) || '' : '';
      // Use stored key if available, otherwise use default key for development
      const activeKey = storedKey || DEFAULT_API_KEY;
      return {
        key: activeKey,
        status: activeKey ? 'valid' : 'empty', // Assume valid if restored (will re-validate on use)
        persist: persistEnabled,
      };
    }
    return { key: DEFAULT_API_KEY, status: 'valid', persist: false };
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
    return localStorage.getItem(SERPAPI_STORAGE_KEY) || '';
  }
  return '';
}
