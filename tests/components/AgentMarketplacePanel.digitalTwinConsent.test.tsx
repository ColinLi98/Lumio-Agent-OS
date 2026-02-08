import { beforeEach, describe, expect, it } from 'vitest';
import {
  getProfileShareConsent,
  revokeProfileShareConsent,
  setProfileShareConsent,
} from '../../services/digitalTwinMarketplaceBridge';

function createMemoryStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
  };
}

describe('AgentMarketplacePanel digital twin consent state', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: createMemoryStorage(),
      configurable: true,
      writable: true,
    });
  });

  it('defaults to revoked when consent is missing', () => {
    expect(getProfileShareConsent()).toBe('revoked');
  });

  it('persists remembered consent and supports revoke', () => {
    setProfileShareConsent('granted_remembered');
    expect(getProfileShareConsent()).toBe('granted_remembered');

    revokeProfileShareConsent();
    expect(getProfileShareConsent()).toBe('revoked');
  });

  it('supports one-time consent', () => {
    setProfileShareConsent('granted_once');
    expect(getProfileShareConsent()).toBe('granted_once');
  });
});

