/**
 * Task Types
 * Phase 2 Week 1-3: Unified Task Schema
 * 
 * Core types for the Task → Plan → Execute → Outcome workflow.
 */

// ============================================================================
// Task Types
// ============================================================================

/**
 * Task status lifecycle
 */
export type TaskStatus =
    | 'draft'       // Just created, not planned
    | 'planned'     // Has a plan attached
    | 'executing'   // User started working on it
    | 'completed'   // Successfully done
    | 'failed'      // Failed to complete
    | 'cancelled';  // User cancelled

/**
 * A task represents a user goal to be achieved
 */
export interface Task {
    task_id: string;
    goal: string;                   // What the user wants to achieve
    goal_normalized?: string;       // Cleaned/normalized goal text
    constraints: TaskConstraints;
    deadline?: number;              // Timestamp
    budget?: number;                // In CNY
    stakeholders?: string[];        // People involved
    risk_level: 'low' | 'medium' | 'high';
    success_criteria?: string[];    // How to measure success
    status: TaskStatus;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    category?: TaskCategory;
    tags?: string[];
    created_at: number;
    updated_at: number;
    completed_at?: number;
    trace_id: string;
    source: TaskSource;             // Where this task came from
    parent_task_id?: string;        // For sub-tasks
}

/**
 * Task category for organization
 */
export type TaskCategory =
    | 'shopping'
    | 'finance'
    | 'health'
    | 'learning'
    | 'career'
    | 'relationship'
    | 'lifestyle'
    | 'travel'
    | 'other';

/**
 * Where the task originated
 */
export type TaskSource =
    | 'keyboard'    // From keyboard input
    | 'agent'       // Agent suggested
    | 'manual'      // User created manually
    | 'review';     // From weekly review

/**
 * Constraints on task execution
 */
export interface TaskConstraints {
    time_limit?: string;            // e.g., "2 hours", "by Friday"
    deadline?: number;              // Timestamp for deadline
    budget_max?: number;
    budget_min?: number;
    location_code?: string;
    location_constraints?: string[];
    quality_threshold?: number;     // 0-1
    require_approval?: boolean;     // Need confirmation before acting
    custom?: Record<string, any>;   // Extensible
}

// ============================================================================
// Plan Types
// ============================================================================

/**
 * A plan for executing a task
 */
export interface Plan {
    plan_id: string;
    task_id: string;
    version: number;                // Plan can be revised
    steps: PlanStep[];
    estimated_time_minutes?: number;
    dependencies?: string[];        // Other task_ids this depends on
    fallback_options?: string[];    // Alternative approaches
    explanation?: PlanExplanation;  // Why this plan
    created_at: number;
    updated_at: number;
    status: PlanStatus;
}

export type PlanStatus =
    | 'draft'
    | 'active'
    | 'completed'
    | 'abandoned';

/**
 * A single step in a plan
 */
export interface PlanStep {
    step_id: string;
    order: number;
    description: string;
    action_type?: ActionType;       // If this step has an executable action
    action_payload?: Record<string, any>;
    estimated_minutes?: number;
    status: StepStatus;
    started_at?: number;
    completed_at?: number;
    notes?: string;
}

export type StepStatus =
    | 'pending'
    | 'in_progress'
    | 'done'
    | 'skipped'
    | 'failed';

/**
 * Explanation for why this plan was generated
 */
export interface PlanExplanation {
    trait_references: {
        trait_id: string;
        trait_key: string;
        relevance: string;
    }[];
    dimension_scores: DimensionScores;
    alternatives?: {
        description: string;
        trade_off: string;
    }[];
}

/**
 * Five-dimension scoring (supports both naming conventions)
 */
export interface DimensionScores {
    // Primary names (used in explainerService)
    time_efficiency?: number;       // 0-1
    financial_impact?: number;
    risk_level?: number;
    personal_growth?: number;
    relationship_impact?: number;
    // Legacy names (for backwards compatibility)
    time?: number;       // 0-100
    money?: number;
    risk?: number;
    energy?: number;
    growth?: number;
}

// ============================================================================
// Action Types
// ============================================================================

/**
 * Types of executable actions
 */
export type ActionType =
    | 'save_task'       // Save task for later
    | 'set_reminder'    // Set a reminder
    | 'open_market'     // Open LIX market
    | 'execute_purchase' // Execute a purchase flow
    | 'start_c2c'       // Start C2C exchange
    | 'open_url'        // Open external URL
    | 'send_message'    // Send a message
    | 'make_note'       // Create a note
    | 'none';           // Informational, no action

// ============================================================================
// Utility Functions
// ============================================================================

export function generateTaskId(): string {
    return `task_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
}

export function generatePlanId(): string {
    return `plan_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
}

export function generateStepId(): string {
    return `step_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
}

export function generateTraceId(): string {
    return `trace_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Get status display
 */
export function getTaskStatusLabel(status: TaskStatus): string {
    const labels: Record<TaskStatus, string> = {
        draft: '草稿',
        planned: '已规划',
        executing: '执行中',
        completed: '已完成',
        failed: '失败',
        cancelled: '已取消',
    };
    return labels[status];
}

export function getTaskStatusColor(status: TaskStatus): string {
    const colors: Record<TaskStatus, string> = {
        draft: 'text-gray-400',
        planned: 'text-blue-500',
        executing: 'text-yellow-500',
        completed: 'text-green-500',
        failed: 'text-red-500',
        cancelled: 'text-gray-500',
    };
    return colors[status];
}

export function getCategoryLabel(category: TaskCategory): string {
    const labels: Record<TaskCategory, string> = {
        shopping: '购物',
        finance: '财务',
        health: '健康',
        learning: '学习',
        career: '职业',
        relationship: '关系',
        lifestyle: '生活',
        travel: '旅行',
        other: '其他',
    };
    return labels[category];
}

export function getCategoryIcon(category: TaskCategory): string {
    const icons: Record<TaskCategory, string> = {
        shopping: '🛒',
        finance: '💰',
        health: '💪',
        learning: '📚',
        career: '💼',
        relationship: '❤️',
        lifestyle: '🏠',
        travel: '✈️',
        other: '📌',
    };
    return icons[category];
}
