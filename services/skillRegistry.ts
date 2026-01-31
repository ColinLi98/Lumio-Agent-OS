/**
 * Skill Registry - 能力注册中心
 * 通用的、可扩展的能力管理系统
 */

// ============================================================================
// 类型定义
// ============================================================================

export interface SkillParameter {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'object' | 'array';
    description: string;
    required: boolean;
    default?: any;
    enum?: string[];
}

export interface SkillResult {
    success: boolean;
    data: any;
    confidence: number;           // 0-1，结果可信度
    sources?: string[];           // 数据来源
    error?: string;
    executionTimeMs?: number;
}

export interface ExecutionContext {
    userId?: string;
    conversationId?: string;
    userPreferences?: Record<string, any>;
    memory?: any[];               // 相关记忆
    previousResults?: SkillResult[]; // 之前执行的结果（用于链式调用）
}

export interface Skill {
    // 元信息
    id: string;
    name: string;
    description: string;          // 描述这个能力做什么（用于 LLM 匹配）

    // 能力标签（语义化，供匹配使用）
    capabilities: string[];       // e.g., ["价格查询", "商品搜索", "比价"]

    // 输入输出定义
    parameters: SkillParameter[];

    // 优先级（0-100，越高越优先）
    priority?: number;

    // 执行函数
    execute: (input: Record<string, any>, context: ExecutionContext) => Promise<SkillResult>;
}

// ============================================================================
// Skill Registry 实现
// ============================================================================

export class SkillRegistry {
    private skills: Map<string, Skill> = new Map();
    private capabilityIndex: Map<string, Set<string>> = new Map(); // capability -> skill ids

    /**
     * 注册一个新的 Skill
     */
    register(skill: Skill): void {
        if (this.skills.has(skill.id)) {
            console.warn(`[SkillRegistry] Skill '${skill.id}' already registered, overwriting...`);
        }

        this.skills.set(skill.id, skill);

        // 建立能力索引
        for (const capability of skill.capabilities) {
            if (!this.capabilityIndex.has(capability)) {
                this.capabilityIndex.set(capability, new Set());
            }
            this.capabilityIndex.get(capability)!.add(skill.id);
        }

        console.log(`[SkillRegistry] Registered skill: ${skill.id} with capabilities: [${skill.capabilities.join(', ')}]`);
    }

    /**
     * 注销一个 Skill
     */
    unregister(skillId: string): boolean {
        const skill = this.skills.get(skillId);
        if (!skill) return false;

        // 从能力索引中移除
        for (const capability of skill.capabilities) {
            this.capabilityIndex.get(capability)?.delete(skillId);
        }

        this.skills.delete(skillId);
        return true;
    }

    /**
     * 根据 ID 获取 Skill
     */
    getSkill(skillId: string): Skill | undefined {
        return this.skills.get(skillId);
    }

    /**
     * 获取所有已注册的 Skills
     */
    getAllSkills(): Skill[] {
        return Array.from(this.skills.values());
    }

    /**
     * 根据能力标签查找 Skills
     */
    findByCapability(capability: string): Skill[] {
        const skillIds = this.capabilityIndex.get(capability);
        if (!skillIds) return [];

        return Array.from(skillIds)
            .map(id => this.skills.get(id)!)
            .filter(Boolean)
            .sort((a, b) => (b.priority || 0) - (a.priority || 0));
    }

    /**
     * 根据多个能力标签查找（OR 匹配）
     */
    findByCapabilities(capabilities: string[]): Skill[] {
        const matchedSkillIds = new Set<string>();

        for (const capability of capabilities) {
            const skillIds = this.capabilityIndex.get(capability);
            if (skillIds) {
                skillIds.forEach(id => matchedSkillIds.add(id));
            }
        }

        return Array.from(matchedSkillIds)
            .map(id => this.skills.get(id)!)
            .filter(Boolean)
            .sort((a, b) => (b.priority || 0) - (a.priority || 0));
    }

    /**
     * 语义搜索 - 根据描述查找匹配的 Skills
     * 使用简单的关键词匹配，可以升级为向量搜索
     */
    findByDescription(query: string): Skill[] {
        const queryLower = query.toLowerCase();
        const queryTerms = queryLower.split(/\s+/);

        const scoredSkills = Array.from(this.skills.values()).map(skill => {
            let score = 0;
            const searchText = `${skill.name} ${skill.description} ${skill.capabilities.join(' ')}`.toLowerCase();

            for (const term of queryTerms) {
                if (searchText.includes(term)) {
                    score += 1;
                }
            }

            // 完全匹配能力标签加分
            for (const capability of skill.capabilities) {
                if (queryLower.includes(capability.toLowerCase())) {
                    score += 2;
                }
            }

            return { skill, score };
        });

        return scoredSkills
            .filter(s => s.score > 0)
            .sort((a, b) => b.score - a.score)
            .map(s => s.skill);
    }

    /**
     * 获取所有能力标签
     */
    getAllCapabilities(): string[] {
        return Array.from(this.capabilityIndex.keys());
    }

    /**
     * 获取统计信息
     */
    getStats(): { skillCount: number; capabilityCount: number; skills: string[] } {
        return {
            skillCount: this.skills.size,
            capabilityCount: this.capabilityIndex.size,
            skills: Array.from(this.skills.keys())
        };
    }
}

// ============================================================================
// 全局单例
// ============================================================================

let registryInstance: SkillRegistry | null = null;

export function getSkillRegistry(): SkillRegistry {
    if (!registryInstance) {
        registryInstance = new SkillRegistry();
    }
    return registryInstance;
}

// ============================================================================
// 辅助函数：创建 Skill 的工厂方法
// ============================================================================

export function createSkill(config: {
    id: string;
    name: string;
    description: string;
    capabilities: string[];
    parameters: SkillParameter[];
    priority?: number;
    execute: (input: Record<string, any>, context: ExecutionContext) => Promise<SkillResult>;
}): Skill {
    return {
        id: config.id,
        name: config.name,
        description: config.description,
        capabilities: config.capabilities,
        parameters: config.parameters,
        priority: config.priority || 50,
        execute: config.execute
    };
}
