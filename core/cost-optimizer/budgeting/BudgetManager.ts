import { Budget } from '../types';
import { CostRepository } from '../repository/CostRepository';
import { CostValidator } from '../validators/CostValidator';

export class BudgetManager {
  private repository: CostRepository;

  constructor(repository: CostRepository) {
    this.repository = repository;
  }

  public getBudgets(): Budget[] {
    return this.repository.getBudgets();
  }

  public getBudgetById(id: string): Budget | undefined {
    return this.repository.getBudgets().find(b => b.id === id);
  }

  /**
   * Create or update a budget, with validation and authorization checks
   */
  public saveBudget(budgetData: Partial<Budget>, operatorRole: string): { success: boolean; errors: string[] } {
    // 1. Permission checks: only administrators or FinOps managers can configure budgets
    if (operatorRole !== 'admin' && operatorRole !== 'finops') {
      return { success: false, errors: ['Unauthorized: Only admin or finops roles can configure budgets.'] };
    }

    const id = budgetData.id || `b-${Date.now()}`;
    const start = budgetData.startDate || Date.now();
    const end = budgetData.endDate || (start + 30 * 24 * 60 * 60 * 1000);

    const budget: Budget = {
      id,
      name: budgetData.name || 'Unnamed Budget',
      type: budgetData.type || 'monthly',
      limit: budgetData.limit !== undefined ? budgetData.limit : 100.0,
      currentSpent: budgetData.currentSpent !== undefined ? budgetData.currentSpent : 0.0,
      startDate: start,
      endDate: end,
      ownerId: budgetData.ownerId || 'admin',
      targetId: budgetData.targetId,
      alertThresholds: budgetData.alertThresholds || [0.8, 1.0],
      notificationsSent: budgetData.notificationsSent || {},
      createdAt: budgetData.createdAt || Date.now()
    };

    // 2. Validate format
    const validation = CostValidator.validateBudget(budget);
    if (!validation.isValid) {
      return { success: false, errors: validation.errors };
    }

    this.repository.saveBudget(budget);
    
    // Log action to audits
    this.repository.addAuditLog({
      id: `audit-${Date.now()}`,
      timestamp: Date.now(),
      userId: budget.ownerId,
      action: budgetData.id ? 'UPDATE_BUDGET' : 'CREATE_BUDGET',
      details: `Saved budget ${budget.name} with cap $${budget.limit}`,
      success: true
    });

    return { success: true, errors: [] };
  }

  /**
   * Delete a budget
   */
  public deleteBudget(id: string, operatorRole: string): { success: boolean; errors: string[] } {
    if (operatorRole !== 'admin' && operatorRole !== 'finops') {
      return { success: false, errors: ['Unauthorized: Only admin or finops roles can delete budgets.'] };
    }

    const deleted = this.repository.deleteBudget(id);
    if (deleted) {
      this.repository.addAuditLog({
        id: `audit-${Date.now()}`,
        timestamp: Date.now(),
        userId: 'operator',
        action: 'DELETE_BUDGET',
        details: `Deleted budget ID: ${id}`,
        success: true
      });
      return { success: true, errors: [] };
    }

    return { success: false, errors: ['Budget not found.'] };
  }

  /**
   * Evaluate if a budget has crossed any thresholds and returns triggered thresholds
   */
  public checkThresholdBreaches(budget: Budget): number[] {
    const ratio = budget.currentSpent / budget.limit;
    const newlyTriggered: number[] = [];

    budget.alertThresholds.forEach(threshold => {
      if (ratio >= threshold && !budget.notificationsSent[threshold]) {
        budget.notificationsSent[threshold] = true;
        newlyTriggered.push(threshold);
      }
    });

    if (newlyTriggered.length > 0) {
      this.repository.saveBudget(budget);
    }

    return newlyTriggered;
  }
}
