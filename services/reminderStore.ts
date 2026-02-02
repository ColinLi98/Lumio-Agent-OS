/**
 * Reminder Store
 * Phase 2 Week 2-2: Internal reminder storage
 * 
 * Manages in-app reminders for tasks and events.
 */

// ============================================================================
// Types
// ============================================================================

export interface Reminder {
    reminder_id: string;
    task_id?: string;
    message: string;
    remind_at: number;          // timestamp when to remind
    created_at: number;
    repeat: 'none' | 'daily' | 'weekly';
    status: 'pending' | 'triggered' | 'dismissed' | 'snoozed';
    snooze_until?: number;
    triggered_at?: number;
}

export interface ReminderInput {
    task_id?: string;
    message: string;
    remind_at: number;
    repeat?: 'none' | 'daily' | 'weekly';
}

// ============================================================================
// Reminder Store Class
// ============================================================================

const STORAGE_KEY = 'lumi_reminders';

class ReminderStore {
    private reminders: Map<string, Reminder> = new Map();
    private listeners: Set<() => void> = new Set();
    private checkInterval: ReturnType<typeof setInterval> | null = null;
    private onTriggerCallback?: (reminder: Reminder) => void;

    constructor() {
        this.loadFromStorage();
        this.startChecking();
    }

    // -------------------------------------------------------------------------
    // CRUD Operations
    // -------------------------------------------------------------------------

    createReminder(input: ReminderInput): Reminder {
        const reminder: Reminder = {
            reminder_id: `rem_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            task_id: input.task_id,
            message: input.message,
            remind_at: input.remind_at,
            created_at: Date.now(),
            repeat: input.repeat || 'none',
            status: 'pending',
        };

        this.reminders.set(reminder.reminder_id, reminder);
        this.saveToStorage();
        this.notifyListeners();

        return reminder;
    }

    getReminder(reminder_id: string): Reminder | undefined {
        return this.reminders.get(reminder_id);
    }

    getReminders(): Reminder[] {
        return Array.from(this.reminders.values());
    }

    getPendingReminders(): Reminder[] {
        return this.getReminders().filter(r => r.status === 'pending');
    }

    getRemindersForTask(task_id: string): Reminder[] {
        return this.getReminders().filter(r => r.task_id === task_id);
    }

    updateReminder(reminder_id: string, updates: Partial<Reminder>): boolean {
        const reminder = this.reminders.get(reminder_id);
        if (!reminder) return false;

        const updated = { ...reminder, ...updates };
        this.reminders.set(reminder_id, updated);
        this.saveToStorage();
        this.notifyListeners();

        return true;
    }

    deleteReminder(reminder_id: string): boolean {
        const deleted = this.reminders.delete(reminder_id);
        if (deleted) {
            this.saveToStorage();
            this.notifyListeners();
        }
        return deleted;
    }

    // -------------------------------------------------------------------------
    // Status Actions
    // -------------------------------------------------------------------------

    dismissReminder(reminder_id: string): boolean {
        return this.updateReminder(reminder_id, { status: 'dismissed' });
    }

    snoozeReminder(reminder_id: string, minutes: number): boolean {
        const snooze_until = Date.now() + minutes * 60 * 1000;
        return this.updateReminder(reminder_id, {
            status: 'snoozed',
            snooze_until,
        });
    }

    // -------------------------------------------------------------------------
    // Checking Logic
    // -------------------------------------------------------------------------

    private startChecking(): void {
        // Check every 30 seconds
        this.checkInterval = setInterval(() => {
            this.checkReminders();
        }, 30000);
    }

    private checkReminders(): void {
        const now = Date.now();
        const pending = this.getPendingReminders();

        for (const reminder of pending) {
            if (reminder.remind_at <= now) {
                this.triggerReminder(reminder);
            }
        }

        // Also check snoozed reminders
        const snoozed = this.getReminders().filter(r => r.status === 'snoozed');
        for (const reminder of snoozed) {
            if (reminder.snooze_until && reminder.snooze_until <= now) {
                this.triggerReminder(reminder);
            }
        }
    }

    private triggerReminder(reminder: Reminder): void {
        this.updateReminder(reminder.reminder_id, {
            status: 'triggered',
            triggered_at: Date.now(),
        });

        // Handle repeat
        if (reminder.repeat !== 'none') {
            const nextRemindAt = this.calculateNextRemindAt(reminder);
            this.createReminder({
                task_id: reminder.task_id,
                message: reminder.message,
                remind_at: nextRemindAt,
                repeat: reminder.repeat,
            });
        }

        // Notify callback
        if (this.onTriggerCallback) {
            this.onTriggerCallback(reminder);
        }
    }

    private calculateNextRemindAt(reminder: Reminder): number {
        const now = Date.now();
        switch (reminder.repeat) {
            case 'daily':
                return now + 24 * 60 * 60 * 1000;
            case 'weekly':
                return now + 7 * 24 * 60 * 60 * 1000;
            default:
                return now;
        }
    }

    // -------------------------------------------------------------------------
    // Callbacks
    // -------------------------------------------------------------------------

    onTrigger(callback: (reminder: Reminder) => void): void {
        this.onTriggerCallback = callback;
    }

    // -------------------------------------------------------------------------
    // Persistence
    // -------------------------------------------------------------------------

    private loadFromStorage(): void {
        if (typeof window === 'undefined') return;

        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const data = JSON.parse(stored) as Reminder[];
                this.reminders = new Map(data.map(r => [r.reminder_id, r]));
            }
        } catch (error) {
            console.warn('[ReminderStore] Failed to load from storage:', error);
        }
    }

    private saveToStorage(): void {
        if (typeof window === 'undefined') return;

        try {
            const data = Array.from(this.reminders.values());
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (error) {
            console.warn('[ReminderStore] Failed to save to storage:', error);
        }
    }

    // -------------------------------------------------------------------------
    // Subscriptions
    // -------------------------------------------------------------------------

    subscribe(listener: () => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private notifyListeners(): void {
        this.listeners.forEach(listener => listener());
    }

    // -------------------------------------------------------------------------
    // Cleanup
    // -------------------------------------------------------------------------

    cleanup(): void {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
        }
    }

    clearAll(): void {
        this.reminders.clear();
        this.saveToStorage();
        this.notifyListeners();
    }
}

// ============================================================================
// Singleton
// ============================================================================

let storeInstance: ReminderStore | null = null;

export function getReminderStore(): ReminderStore {
    if (!storeInstance) {
        storeInstance = new ReminderStore();
    }
    return storeInstance;
}

// ============================================================================
// Convenience Exports
// ============================================================================

export { ReminderStore };
