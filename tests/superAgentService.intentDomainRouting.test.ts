import { describe, expect, it } from 'vitest';
import { SuperAgentService } from '../services/superAgentService';

describe('SuperAgentService intent domain routing', () => {
    it('does not force travel tasks to travel.flight when task objective points elsewhere', () => {
        const service = new SuperAgentService();
        const resolveTaskIntentDomain = (service as any).resolveTaskIntentDomain.bind(service);

        const resolved = resolveTaskIntentDomain(
            {
                id: 'task_1',
                objective: '帮我做招聘岗位 JD 和薪资区间建议',
                required_capabilities: ['general_reasoning'],
                dependencies: [],
                parallelizable: true,
            },
            'travel'
        );

        expect(resolved).toBe('recruitment');
    });

    it('keeps explicit capability mapping for concrete travel capabilities', () => {
        const service = new SuperAgentService();
        const resolveTaskIntentDomain = (service as any).resolveTaskIntentDomain.bind(service);

        const resolved = resolveTaskIntentDomain(
            {
                id: 'task_2',
                objective: '查询航班实时价格',
                required_capabilities: ['flight_search'],
                dependencies: [],
                parallelizable: true,
            },
            'travel'
        );

        expect(resolved).toBe('travel.flight');
    });

    it('maps shopping domain to ecommerce.product instead of generic travel defaults', () => {
        const service = new SuperAgentService();
        const resolveTaskIntentDomain = (service as any).resolveTaskIntentDomain.bind(service);

        const resolved = resolveTaskIntentDomain(
            {
                id: 'task_3',
                objective: '帮我比较这个商品价格',
                required_capabilities: ['general_reasoning'],
                dependencies: [],
                parallelizable: true,
            },
            'shopping'
        );

        expect(resolved).toBe('ecommerce.product');
    });
});
