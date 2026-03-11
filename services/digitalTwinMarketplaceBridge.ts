import { getEnhancedDigitalAvatar } from './localStorageService.js';

export type ProfileShareConsentState = 'granted_once' | 'granted_remembered' | 'revoked';

const PROFILE_SHARE_CONSENT_KEY = 'lix_solution_profile_share_consent_v1';

export function getCurrentUserId(): string {
    try {
        const avatar = getEnhancedDigitalAvatar();
        const id = String(avatar?.id || '').trim();
        return id || 'demo_user';
    } catch {
        return 'demo_user';
    }
}

export function getProfileShareConsent(): ProfileShareConsentState {
    if (typeof localStorage === 'undefined') return 'revoked';
    const raw = localStorage.getItem(PROFILE_SHARE_CONSENT_KEY);
    if (raw === 'granted_once' || raw === 'granted_remembered' || raw === 'revoked') {
        return raw;
    }
    return 'revoked';
}

export function setProfileShareConsent(state: ProfileShareConsentState): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(PROFILE_SHARE_CONSENT_KEY, state);
}

export function revokeProfileShareConsent(): void {
    setProfileShareConsent('revoked');
}
