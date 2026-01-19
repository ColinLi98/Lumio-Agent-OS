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
        labelZh: '婉拒邀请',
        icon: '🙅',
        prompt: '帮我婉拒这个邀请',
        category: 'social'
    },
    {
        id: 'reschedule',
        label: 'Reschedule',
        labelZh: '改约时间',
        icon: '📅',
        prompt: '帮我礼貌地改约到下周',
        category: 'social'
    },
    {
        id: 'thank-you',
        label: 'Say Thanks',
        labelZh: '表达感谢',
        icon: '🙏',
        prompt: '帮我写一段真诚的感谢',
        category: 'social'
    },
    {
        id: 'follow-up',
        label: 'Follow Up',
        labelZh: '催促回复',
        icon: '⏰',
        prompt: '帮我礼貌地催一下对方回复',
        category: 'social'
    },
    // Work
    {
        id: 'leave-request',
        label: 'Leave Request',
        labelZh: '请假申请',
        icon: '🏖️',
        prompt: '帮我写一份请假申请',
        category: 'work'
    },
    {
        id: 'decline-overtime',
        label: 'Decline OT',
        labelZh: '婉拒加班',
        icon: '💼',
        prompt: '帮我委婉拒绝加班',
        category: 'work'
    },
    {
        id: 'meeting-summary',
        label: 'Summarize',
        labelZh: '总结会议',
        icon: '📝',
        prompt: '帮我总结刚才的对话要点',
        category: 'work'
    },
    // Privacy
    {
        id: 'mask-phone',
        label: 'Mask Phone',
        labelZh: '隐藏手机号',
        icon: '📞',
        prompt: '请帮我把手机号隐私处理',
        category: 'privacy'
    }
];

export type TemplateCategory = QuickTemplate['category'];

export const CATEGORY_LABELS: Record<TemplateCategory, { en: string; zh: string }> = {
    social: { en: 'Social', zh: '社交' },
    work: { en: 'Work', zh: '工作' },
    privacy: { en: 'Privacy', zh: '隐私' }
};
