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
        nameZh: '微信',
        icon: '💬',
        primaryColor: '#07C160',
        secondaryColor: '#F5F5F5',
        bubbleMyColor: '#95EC69',
        bubbleTheirColor: '#FFFFFF',
        headerBg: '#EDEDED',
        avatarBg: '#07C160',
        contactName: '小明',
        contactStatus: '',
        defaultMessages: [
            { text: '在吗？今晚有空一起吃个饭吗？', from: 'user' }
        ],
        agentPromptHint: '微信聊天风格：口语化、亲切、可用表情符号，适合朋友间的日常交流'
    },
    {
        id: 'email',
        name: 'Email',
        nameZh: '邮件',
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
        agentPromptHint: '商务邮件风格：正式、礼貌、结构清晰，使用恰当的称呼和结束语'
    },
    {
        id: 'weibo',
        name: 'Weibo',
        nameZh: '微博',
        icon: '🔥',
        primaryColor: '#E6162D',
        secondaryColor: '#F7F7F7',
        bubbleMyColor: '#FFEBE8',
        bubbleTheirColor: '#FFFFFF',
        headerBg: '#E6162D',
        avatarBg: '#FF8C00',
        contactName: '@网友热评',
        contactStatus: '粉丝 12.5万',
        defaultMessages: [
            { text: '今天加班到11点，累死了😭 有人和我一样吗？', from: 'user' }
        ],
        agentPromptHint: '微博评论风格：网络语言、可以幽默或共情、简短有力、可用流行梗'
    },
    {
        id: 'sms',
        name: 'SMS',
        nameZh: '短信',
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
            { text: '尊敬的客户，您本月流量已使用90%，建议升级套餐或购买流量包。回复1查看套餐。', from: 'user' }
        ],
        agentPromptHint: '短信回复风格：简洁直接、不需要太多礼貌用语'
    },
    {
        id: 'dingtalk',
        name: 'DingTalk',
        nameZh: '钉钉',
        icon: '📌',
        primaryColor: '#1677FF',
        secondaryColor: '#F5F7FA',
        bubbleMyColor: '#1677FF',
        bubbleTheirColor: '#FFFFFF',
        headerBg: '#FFFFFF',
        avatarBg: '#1677FF',
        contactName: '张经理',
        contactStatus: '产品部',
        defaultMessages: [
            { text: '@你 明天下午3点开产品评审会，准备一下上周需求的进展汇报', from: 'user' }
        ],
        agentPromptHint: '工作沟通风格：专业、高效、汇报结构清晰，适当使用职场用语'
    }
];

export type AppScenarioId = typeof APP_SCENARIOS[number]['id'];

export const getScenarioById = (id: string): AppScenario => {
    return APP_SCENARIOS.find(s => s.id === id) || APP_SCENARIOS[0];
};
