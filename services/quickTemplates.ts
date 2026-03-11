/**
 * Quick Reply Templates for Agent Mode
 * These are pre-defined prompts that users can quickly select
 */

export interface QuickTemplate {
    id: string;
    label: string;
    labelZh: string;
    icon: string;
    prompt: string;
    category: 'social' | 'work' | 'privacy';
}

export const QUICK_TEMPLATES: QuickTemplate[] = [
    // Social
    {
        id: 'decline-politely',
        label: 'Decline Politely',
        labelZh: 'Decline Politely',
        icon: '🙅',
        prompt: 'Help me decline this invitation politely',
        category: 'social'
    },
    {
        id: 'reschedule',
        label: 'Reschedule',
        labelZh: 'Reschedule',
        icon: '📅',
        prompt: 'Help me politely reschedule this to next week',
        category: 'social'
    },
    {
        id: 'thank-you',
        label: 'Say Thanks',
        labelZh: 'Say Thanks',
        icon: '🙏',
        prompt: 'Help me write a sincere thank-you message',
        category: 'social'
    },
    {
        id: 'follow-up',
        label: 'Follow Up',
        labelZh: 'Follow Up',
        icon: '⏰',
        prompt: 'Help me politely follow up for a reply',
        category: 'social'
    },
    // Work
    {
        id: 'leave-request',
        label: 'Leave Request',
        labelZh: 'Leave Request',
        icon: '🏖️',
        prompt: 'Help me draft a leave request',
        category: 'work'
    },
    {
        id: 'decline-overtime',
        label: 'Decline OT',
        labelZh: 'Decline OT',
        icon: '💼',
        prompt: 'Help me politely decline overtime',
        category: 'work'
    },
    {
        id: 'meeting-summary',
        label: 'Summarize',
        labelZh: 'Summarize',
        icon: '📝',
        prompt: 'Help me summarize key points from the conversation',
        category: 'work'
    },
    // Privacy
    {
        id: 'mask-phone',
        label: 'Mask Phone',
        labelZh: 'Mask Phone',
        icon: '📞',
        prompt: 'Help me mask this phone number for privacy',
        category: 'privacy'
    }
];

export type TemplateCategory = QuickTemplate['category'];

export const CATEGORY_LABELS: Record<TemplateCategory, { en: string; zh: string }> = {
    social: { en: 'Social', zh: 'Social' },
    work: { en: 'Work', zh: 'Work' },
    privacy: { en: 'Privacy', zh: 'Privacy' }
};
