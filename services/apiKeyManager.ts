import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'lumi_gemini_api_key';
const PERSIST_KEY = 'lumi_api_key_persist';

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

  try {
    // Use the models.list endpoint for lightweight validation
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      { method: 'GET' }
    );

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
      return {
        key: storedKey,
        status: storedKey ? 'valid' : 'empty', // Assume valid if restored (will re-validate on use)
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
