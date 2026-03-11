/**
 * App Scenarios for Multi-App Simulation
 * Different apps have different UI styles and Agent response styles
 */

export interface AppScenario {
    id: string;
    name: string;
    nameZh: string;
    icon: string;
    primaryColor: string;
    secondaryColor: string;
    bubbleMyColor: string;
    bubbleTheirColor: string;
    headerBg: string;
    avatarBg: string;
    defaultMessages: { text: string; from: 'user' | 'me' }[];
    contactName: string;
    contactStatus: string;
    agentPromptHint: string; // Hint for Agent to adjust response style
}

export const APP_SCENARIOS: AppScenario[] = [
    {
        id: 'wechat',
        name: 'WeChat',
        nameZh: 'WeChat',
        icon: '💬',
        primaryColor: '#07C160',
        secondaryColor: '#F5F5F5',
        bubbleMyColor: '#95EC69',
        bubbleTheirColor: '#FFFFFF',
        headerBg: '#EDEDED',
        avatarBg: '#07C160',
        contactName: 'Alex',
        contactStatus: '',
        defaultMessages: [
            { text: 'Are you around? Want to grab dinner tonight?', from: 'user' }
        ],
        agentPromptHint: 'WeChat chat style: conversational, warm, emoji-friendly, and natural for friend-to-friend messaging.'
    },
    {
        id: 'email',
        name: 'Email',
        nameZh: 'Email',
        icon: '📧',
        primaryColor: '#1A73E8',
        secondaryColor: '#F8F9FA',
        bubbleMyColor: '#E8F0FE',
        bubbleTheirColor: '#FFFFFF',
        headerBg: '#FFFFFF',
        avatarBg: '#1A73E8',
        contactName: 'HR Manager',
        contactStatus: 'hr@company.com',
        defaultMessages: [
            { text: 'Dear Candidate, We would like to schedule an interview for the position you applied. Please let us know your availability.', from: 'user' }
        ],
        agentPromptHint: 'Business email style: formal, polite, clearly structured, with appropriate salutation and closing.'
    },
    {
        id: 'weibo',
        name: 'Weibo',
        nameZh: 'Weibo',
        icon: '🔥',
        primaryColor: '#E6162D',
        secondaryColor: '#F7F7F7',
        bubbleMyColor: '#FFEBE8',
        bubbleTheirColor: '#FFFFFF',
        headerBg: '#E6162D',
        avatarBg: '#FF8C00',
        contactName: '@HotCommenter',
        contactStatus: '125K followers',
        defaultMessages: [
            { text: 'Worked overtime until 11pm today. Exhausted 😭 Anyone else in the same boat?', from: 'user' }
        ],
        agentPromptHint: 'Weibo comment style: internet-native, concise, can be humorous or empathetic, with light trend references.'
    },
    {
        id: 'sms',
        name: 'SMS',
        nameZh: 'SMS',
        icon: '💬',
        primaryColor: '#34C759',
        secondaryColor: '#F2F2F7',
        bubbleMyColor: '#007AFF',
        bubbleTheirColor: '#E5E5EA',
        headerBg: '#F2F2F7',
        avatarBg: '#8E8E93',
        contactName: '10086',
        contactStatus: '',
        defaultMessages: [
            { text: 'Dear customer, you have used 90% of your monthly data. Consider upgrading your plan or buying an add-on. Reply 1 for options.', from: 'user' }
        ],
        agentPromptHint: 'SMS reply style: concise, direct, and practical without excessive formalities.'
    },
    {
        id: 'dingtalk',
        name: 'DingTalk',
        nameZh: 'DingTalk',
        icon: '📌',
        primaryColor: '#1677FF',
        secondaryColor: '#F5F7FA',
        bubbleMyColor: '#1677FF',
        bubbleTheirColor: '#FFFFFF',
        headerBg: '#FFFFFF',
        avatarBg: '#1677FF',
        contactName: 'Manager Zhang',
        contactStatus: 'Product Team',
        defaultMessages: [
            { text: '@you Product review meeting tomorrow at 3:00 PM. Please prepare a progress update on last week\'s requirements.', from: 'user' }
        ],
        agentPromptHint: 'Work communication style: professional, efficient, and structured for updates and team coordination.'
    }
];

export type AppScenarioId = typeof APP_SCENARIOS[number]['id'];

export const getScenarioById = (id: string): AppScenario => {
    return APP_SCENARIOS.find(s => s.id === id) || APP_SCENARIOS[0];
};
