/**
 * Data Negotiation Service - 数据谈判协议服务
 *
 * 实现数字分身 V2.2 的数据交换协商机制:
 * - 请求/响应格式
 * - 协商流程
 * - 智能合约模板
 *
 * 参考 PRD 8.7 节设计规范
 */

// ============================================================================
// 数据请求/响应类型
// ============================================================================

/**
 * 数据范围类型
 */
export type DataScope =
    | 'profile_basic'      // 基础资料 (昵称、头像)
    | 'profile_full'       // 完整资料
    | 'preferences'        // 偏好设置
    | 'behavior_summary'   // 行为摘要
    | 'behavior_full'      // 完整行为数据
    | 'interests'          // 兴趣标签
    | 'personality'        // 性格画像
    | 'social_graph'       // 社交关系
    | 'location_current'   // 当前位置
    | 'location_history'   // 位置历史
    | 'calendar'           // 日程安排
    | 'contacts';          // 联系人

/**
 * 数据用途声明
 */
export type DataPurpose =
    | 'personalization'    // 个性化服务
    | 'recommendation'     // 推荐算法
    | 'analytics'          // 数据分析
    | 'marketing'          // 营销目的
    | 'research'           // 研究用途
    | 'service_delivery'   // 服务交付
    | 'legal_compliance';  // 法律合规

/**
 * 数据请求
 */
export interface DataRequest {
    id: string;
    requesterId: string;            // 请求方 ID
    requesterName: string;          // 请求方名称
    requesterType: 'app' | 'service' | 'individual' | 'organization';
    scopes: DataScope[];            // 请求的数据范围
    purposes: DataPurpose[];        // 数据用途
    expirationDays: number;         // 数据有效期 (天)
    justification: string;          // 请求理由
    timestamp: number;
    status: 'pending' | 'approved' | 'rejected' | 'expired' | 'revoked';
}

/**
 * 数据响应
 */
export interface DataResponse {
    requestId: string;
    approved: boolean;
    approvedScopes: DataScope[];    // 批准的范围 (可能是请求的子集)
    deniedScopes: DataScope[];      // 拒绝的范围
    conditions: DataCondition[];    // 附加条件
    expiresAt: number;              // 过期时间戳
    contractId?: string;            // 智能合约 ID
    respondedAt: number;
}

/**
 * 数据条件
 */
export interface DataCondition {
    type: 'anonymize' | 'aggregate' | 'no_storage' | 'no_sharing' | 'delete_after_use' | 'notify_on_access';
    description: string;
}

/**
 * 智能合约
 */
export interface DataContract {
    id: string;
    requestId: string;
    requesterId: string;
    userId: string;
    scopes: DataScope[];
    purposes: DataPurpose[];
    conditions: DataCondition[];
    createdAt: number;
    expiresAt: number;
    accessCount: number;
    lastAccessAt?: number;
    status: 'active' | 'expired' | 'revoked';
}

// ============================================================================
// 协商策略配置
// ============================================================================

/**
 * 建议策略 (基于数据敏感度)
 */
const SCOPE_SENSITIVITY: Record<DataScope, number> = {
    profile_basic: 1,
    preferences: 2,
    interests: 2,
    behavior_summary: 3,
    profile_full: 4,
    personality: 4,
    behavior_full: 5,
    calendar: 5,
    social_graph: 6,
    contacts: 7,
    location_current: 7,
    location_history: 8,
};

/**
 * 用途风险评估
 */
const PURPOSE_RISK: Record<DataPurpose, number> = {
    service_delivery: 1,
    personalization: 2,
    recommendation: 3,
    analytics: 4,
    research: 4,
    legal_compliance: 2,
    marketing: 6,
};

// ============================================================================
// Data Negotiation Service
// ============================================================================

class DataNegotiationService {
    private requests: DataRequest[] = [];
    private contracts: DataContract[] = [];
    private readonly STORAGE_KEY_REQUESTS = 'lumi_data_requests';
    private readonly STORAGE_KEY_CONTRACTS = 'lumi_data_contracts';

    constructor() {
        this.loadData();
    }

    /**
     * 创建数据请求
     */
    createRequest(
        requesterId: string,
        requesterName: string,
        requesterType: DataRequest['requesterType'],
        scopes: DataScope[],
        purposes: DataPurpose[],
        expirationDays: number,
        justification: string
    ): DataRequest {
        const request: DataRequest = {
            id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            requesterId,
            requesterName,
            requesterType,
            scopes,
            purposes,
            expirationDays,
            justification,
            timestamp: Date.now(),
            status: 'pending',
        };

        this.requests.push(request);
        this.saveData();

        console.log(`[DataNegotiation] New request from ${requesterName}:`, scopes);

        return request;
    }

    /**
     * 评估请求风险
     */
    evaluateRisk(request: DataRequest): {
        overallRisk: number;
        riskLevel: 'low' | 'medium' | 'high' | 'critical';
        scopeRisks: Record<DataScope, number>;
        recommendation: 'approve' | 'review' | 'reject';
        suggestedConditions: DataCondition[];
    } {
        // 计算每个 scope 的风险
        const scopeRisks: Record<string, number> = {};
        let totalScopeRisk = 0;
        for (const scope of request.scopes) {
            const sensitivity = SCOPE_SENSITIVITY[scope] || 5;
            scopeRisks[scope] = sensitivity;
            totalScopeRisk += sensitivity;
        }

        // 计算 purpose 风险
        let purposeRisk = 0;
        for (const purpose of request.purposes) {
            purposeRisk = Math.max(purposeRisk, PURPOSE_RISK[purpose] || 3);
        }

        // 综合风险评分 (0-100)
        const avgScopeRisk = totalScopeRisk / request.scopes.length;
        const overallRisk = Math.min(100, Math.round(avgScopeRisk * purposeRisk * 2));

        // 确定风险等级
        let riskLevel: 'low' | 'medium' | 'high' | 'critical';
        if (overallRisk <= 25) riskLevel = 'low';
        else if (overallRisk <= 50) riskLevel = 'medium';
        else if (overallRisk <= 75) riskLevel = 'high';
        else riskLevel = 'critical';

        // 生成建议
        let recommendation: 'approve' | 'review' | 'reject';
        if (riskLevel === 'low') recommendation = 'approve';
        else if (riskLevel === 'critical') recommendation = 'reject';
        else recommendation = 'review';

        // 建议的条件
        const suggestedConditions: DataCondition[] = [];
        if (overallRisk > 30) {
            suggestedConditions.push({
                type: 'no_sharing',
                description: '禁止与第三方共享',
            });
        }
        if (overallRisk > 50) {
            suggestedConditions.push({
                type: 'anonymize',
                description: '数据需匿名化处理',
            });
        }
        if (request.purposes.includes('analytics') || request.purposes.includes('research')) {
            suggestedConditions.push({
                type: 'aggregate',
                description: '仅允许聚合分析',
            });
        }
        if (request.expirationDays <= 7) {
            suggestedConditions.push({
                type: 'delete_after_use',
                description: '使用后立即删除',
            });
        }

        return {
            overallRisk,
            riskLevel,
            scopeRisks: scopeRisks as Record<DataScope, number>,
            recommendation,
            suggestedConditions,
        };
    }

    /**
     * 响应数据请求
     */
    respondToRequest(
        requestId: string,
        approved: boolean,
        approvedScopes?: DataScope[],
        conditions?: DataCondition[]
    ): DataResponse | null {
        const request = this.requests.find(r => r.id === requestId);
        if (!request || request.status !== 'pending') {
            return null;
        }

        const response: DataResponse = {
            requestId,
            approved,
            approvedScopes: approved ? (approvedScopes || request.scopes) : [],
            deniedScopes: approved
                ? request.scopes.filter(s => !approvedScopes?.includes(s))
                : request.scopes,
            conditions: conditions || [],
            expiresAt: Date.now() + request.expirationDays * 24 * 60 * 60 * 1000,
            respondedAt: Date.now(),
        };

        // 更新请求状态
        request.status = approved ? 'approved' : 'rejected';

        // 如果批准，创建智能合约
        if (approved && response.approvedScopes.length > 0) {
            const contract = this.createContract(request, response);
            response.contractId = contract.id;
        }

        this.saveData();

        console.log(`[DataNegotiation] Request ${requestId} ${approved ? 'approved' : 'rejected'}`);

        return response;
    }

    /**
     * 创建智能合约
     */
    private createContract(request: DataRequest, response: DataResponse): DataContract {
        const contract: DataContract = {
            id: `con_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            requestId: request.id,
            requesterId: request.requesterId,
            userId: 'current_user', // 实际应用中需要真实用户 ID
            scopes: response.approvedScopes,
            purposes: request.purposes,
            conditions: response.conditions,
            createdAt: Date.now(),
            expiresAt: response.expiresAt,
            accessCount: 0,
            status: 'active',
        };

        this.contracts.push(contract);
        this.saveData();

        console.log(`[DataNegotiation] Contract created:`, contract.id);

        return contract;
    }

    /**
     * 记录数据访问
     */
    recordAccess(contractId: string): boolean {
        const contract = this.contracts.find(c => c.id === contractId);
        if (!contract || contract.status !== 'active') {
            return false;
        }

        // 检查是否过期
        if (Date.now() > contract.expiresAt) {
            contract.status = 'expired';
            this.saveData();
            return false;
        }

        contract.accessCount++;
        contract.lastAccessAt = Date.now();
        this.saveData();

        return true;
    }

    /**
     * 撤销合约
     */
    revokeContract(contractId: string): boolean {
        const contract = this.contracts.find(c => c.id === contractId);
        if (!contract || contract.status !== 'active') {
            return false;
        }

        contract.status = 'revoked';
        this.saveData();

        // 同时撤销相关请求
        const request = this.requests.find(r => r.id === contract.requestId);
        if (request) {
            request.status = 'revoked';
        }

        console.log(`[DataNegotiation] Contract revoked:`, contractId);

        return true;
    }

    /**
     * 获取待处理请求
     */
    getPendingRequests(): DataRequest[] {
        return this.requests.filter(r => r.status === 'pending');
    }

    /**
     * 获取活跃合约
     */
    getActiveContracts(): DataContract[] {
        // 自动过期检查
        const now = Date.now();
        this.contracts.forEach(c => {
            if (c.status === 'active' && now > c.expiresAt) {
                c.status = 'expired';
            }
        });
        this.saveData();

        return this.contracts.filter(c => c.status === 'active');
    }

    /**
     * 获取请求历史
     */
    getRequestHistory(limit: number = 20): DataRequest[] {
        return this.requests.slice(-limit);
    }

    /**
     * 获取合约历史
     */
    getContractHistory(limit: number = 20): DataContract[] {
        return this.contracts.slice(-limit);
    }

    /**
     * 清空所有数据
     */
    clearAll(): void {
        this.requests = [];
        this.contracts = [];
        this.saveData();
    }

    private loadData(): void {
        try {
            const storedRequests = localStorage.getItem(this.STORAGE_KEY_REQUESTS);
            const storedContracts = localStorage.getItem(this.STORAGE_KEY_CONTRACTS);
            if (storedRequests) this.requests = JSON.parse(storedRequests);
            if (storedContracts) this.contracts = JSON.parse(storedContracts);
        } catch (e) {
            console.warn('[DataNegotiation] Failed to load data');
        }
    }

    private saveData(): void {
        try {
            localStorage.setItem(this.STORAGE_KEY_REQUESTS, JSON.stringify(this.requests));
            localStorage.setItem(this.STORAGE_KEY_CONTRACTS, JSON.stringify(this.contracts));
        } catch (e) {
            console.warn('[DataNegotiation] Failed to save data');
        }
    }
}

// ============================================================================
// 导出单例
// ============================================================================

export const dataNegotiation = new DataNegotiationService();

// 便捷函数
export const createDataRequest = (
    requesterId: string,
    requesterName: string,
    requesterType: DataRequest['requesterType'],
    scopes: DataScope[],
    purposes: DataPurpose[],
    expirationDays: number,
    justification: string
) => dataNegotiation.createRequest(
    requesterId, requesterName, requesterType, scopes, purposes, expirationDays, justification
);

export const evaluateDataRequest = (request: DataRequest) =>
    dataNegotiation.evaluateRisk(request);

export const respondToDataRequest = (
    requestId: string,
    approved: boolean,
    approvedScopes?: DataScope[],
    conditions?: DataCondition[]
) => dataNegotiation.respondToRequest(requestId, approved, approvedScopes, conditions);

export const getPendingDataRequests = () => dataNegotiation.getPendingRequests();
export const getActiveDataContracts = () => dataNegotiation.getActiveContracts();
export const revokeDataContract = (contractId: string) => dataNegotiation.revokeContract(contractId);
