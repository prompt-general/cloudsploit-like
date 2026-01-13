import { Finding } from '../schemas/finding';
import { Asset } from '../schemas/asset';

export interface RemediationAction {
  id: string;
  findingId: string;
  assetId: string;
  type: 'terraform' | 'cloudformation' | 'azure-arm' | 'gcp-deployment-manager' | 'aws-cli' | 'azure-cli' | 'gcp-cli';
  name: string;
  description: string;
  code: string;
  rollbackCode: string;
  estimatedTime: number; // minutes
  riskLevel: 'low' | 'medium' | 'high';
  requiresApproval: boolean;
  dependencies: string[];
  tags: string[];
}

export interface RemediationPlan {
  id: string;
  name: string;
  description: string;
  actions: RemediationAction[];
  totalEstimatedTime: number;
  overallRiskLevel: 'low' | 'medium' | 'high';
  requiresApproval: boolean;
  createdAt: Date;
  status: 'pending' | 'approved' | 'executing' | 'completed' | 'failed' | 'rolled_back';
}

export interface ExecutionResult {
  actionId: string;
  status: 'success' | 'failed' | 'partial';
  output: string;
  error?: string;
  executionTime: number;
  rollbackAvailable: boolean;
  changes: Array<{
    resource: string;
    property: string;
    oldValue: any;
    newValue: any;
  }>;
}

export interface RollbackPlan {
  id: string;
  remediationPlanId: string;
  actions: Array<{
    actionId: string;
    rollbackCode: string;
    order: number;
  }>;
  createdAt: Date;
  status: 'ready' | 'executing' | 'completed' | 'failed';
}

export interface RemediationConfig {
  autoApproveLowRisk: boolean;
  requireApprovalForHighRisk: boolean;
  maxConcurrentActions: number;
  timeoutMinutes: number;
  enableDryRun: boolean;
  backupBeforeRemediation: boolean;
}

export class AutoRemediationEngine {
  private config: RemediationConfig;
  private remediationHistory: Map<string, ExecutionResult[]> = new Map();
  private rollbackPlans: Map<string, RollbackPlan> = new Map();

  constructor(config?: Partial<RemediationConfig>) {
    this.config = {
      autoApproveLowRisk: true,
      requireApprovalForHighRisk: true,
      maxConcurrentActions: 3,
      timeoutMinutes: 30,
      enableDryRun: true,
      backupBeforeRemediation: true,
      ...config,
    };
  }

  /**
   * Generate remediation plan for findings
   */
  async generateRemediationPlan(
    findings: Finding[],
    assets: Asset[],
    options?: {
      includeLowRisk?: boolean;
      maxActions?: number;
      provider?: 'aws' | 'azure' | 'gcp';
    }
  ): Promise<RemediationPlan> {
    const actions: RemediationAction[] = [];
    let totalEstimatedTime = 0;
    let requiresApproval = false;

    for (const finding of findings) {
      const asset = assets.find(a => a.id === finding.assetId);
      if (!asset) continue;

      // Skip low risk findings unless explicitly included
      if (finding.severity === 'low' && !options?.includeLowRisk) continue;

      // Filter by provider if specified
      if (options?.provider && asset.provider !== options.provider) continue;

      const action = await this.generateRemediationAction(finding, asset);
      if (action) {
        actions.push(action);
        totalEstimatedTime += action.estimatedTime;

        if (action.requiresApproval) {
          requiresApproval = true;
        }
      }
    }

    // Sort actions by risk and dependencies
    const sortedActions = this.sortActionsByDependencies(actions);

    // Limit number of actions if specified
    const limitedActions = options?.maxActions 
      ? sortedActions.slice(0, options.maxActions)
      : sortedActions;

    const overallRiskLevel = this.calculateOverallRisk(limitedActions);

    return {
      id: `plan-${Date.now()}`,
      name: `Remediation Plan for ${findings.length} findings`,
      description: `Automated remediation for security findings across ${assets.length} assets`,
      actions: limitedActions,
      totalEstimatedTime,
      overallRiskLevel,
      requiresApproval: requiresApproval || this.config.requireApprovalForHighRisk,
      createdAt: new Date(),
      status: 'pending',
    };
  }

  /**
   * Execute remediation plan
   */
  async executeRemediationPlan(
    plan: RemediationPlan,
    options?: {
      dryRun?: boolean;
      enableRollback?: boolean;
      concurrency?: number;
    }
  ): Promise<ExecutionResult[]> {
    const results: ExecutionResult[] = [];
    const concurrency = options?.concurrency || this.config.maxConcurrentActions;
    const dryRun = options?.dryRun ?? this.config.enableDryRun;

    // Create rollback plan if enabled
    if (options?.enableRollback) {
      await this.createRollbackPlan(plan);
    }

    // Group actions by dependencies
    const actionGroups = this.groupActionsByDependencies(plan.actions);

    for (const group of actionGroups) {
      // Execute actions in parallel within each group
      const groupPromises = group.map(async (action) => {
        try {
          const result = await this.executeAction(action, dryRun);
          results.push(result);
          return result;
        } catch (error) {
          const errorResult: ExecutionResult = {
            actionId: action.id,
            status: 'failed',
            output: '',
            error: error instanceof Error ? error.message : String(error),
            executionTime: 0,
            rollbackAvailable: true,
            changes: [],
          };
          results.push(errorResult);
          return errorResult;
        }
      });

      await Promise.all(groupPromises);

      // Check if any action failed and stop execution if so
      const failedActions = groupPromises.some(p => 
        p.then(result => result.status === 'failed').catch(() => true)
      );
      
      if (failedActions) {
        break;
      }
    }

    // Store execution results
    this.remediationHistory.set(plan.id, results);

    return results;
  }

  /**
   * Rollback a remediation plan
   */
  async rollbackRemediationPlan(planId: string): Promise<ExecutionResult[]> {
    const rollbackPlan = this.rollbackPlans.get(planId);
    if (!rollbackPlan) {
      throw new Error(`No rollback plan found for remediation plan ${planId}`);
    }

    const results: ExecutionResult[] = [];
    rollbackPlan.status = 'executing';

    try {
      // Execute rollback actions in reverse order
      const sortedActions = rollbackPlan.actions.sort((a, b) => b.order - a.order);

      for (const rollbackAction of sortedActions) {
        const result = await this.executeRollbackAction(rollbackAction);
        results.push(result);
      }

      rollbackPlan.status = 'completed';
    } catch (error) {
      rollbackPlan.status = 'failed';
      throw error;
    }

    return results;
  }

  /**
   * Generate remediation action for a specific finding
   */
  private async generateRemediationAction(
    finding: Finding,
    asset: Asset
  ): Promise<RemediationAction | null> {
    const actionGenerators = {
      aws: this.generateAWSRemediation.bind(this),
      azure: this.generateAzureRemediation.bind(this),
      gcp: this.generateGCPRemediation.bind(this),
    };

    const generator = actionGenerators[asset.provider as keyof typeof actionGenerators];
    if (!generator) {
      return null;
    }

    return generator(finding, asset);
  }

  /**
   * Generate AWS remediation actions
   */
  private async generateAWSRemediation(
    finding: Finding,
    asset: Asset
  ): Promise<RemediationAction | null> {
    const rule = finding.rule?.toLowerCase() || '';

    if (rule.includes('s3') && rule.includes('public')) {
      return {
        id: `remediation-${finding.id}`,
        findingId: finding.id,
        assetId: asset.id,
        type: 'terraform',
        name: 'Restrict S3 Bucket Public Access',
        description: 'Remove public access blocks and configure proper ACLs',
        code: this.generateS3PublicAccessRemediation(asset),
        rollbackCode: this.generateS3PublicAccessRollback(asset),
        estimatedTime: 5,
        riskLevel: 'low',
        requiresApproval: false,
        dependencies: [],
        tags: ['s3', 'security', 'public-access'],
      };
    }

    if (rule.includes('iam') && rule.includes('overprivileged')) {
      return {
        id: `remediation-${finding.id}`,
        findingId: finding.id,
        assetId: asset.id,
        type: 'terraform',
        name: 'Restrict IAM Role Permissions',
        description: 'Remove excessive IAM permissions and apply principle of least privilege',
        code: this.generateIAMRemediation(asset),
        rollbackCode: this.generateIAMRollback(asset),
        estimatedTime: 10,
        riskLevel: 'medium',
        requiresApproval: true,
        dependencies: [],
        tags: ['iam', 'security', 'permissions'],
      };
    }

    if (rule.includes('encryption') && rule.includes('disabled')) {
      return {
        id: `remediation-${finding.id}`,
        findingId: finding.id,
        assetId: asset.id,
        type: 'terraform',
        name: 'Enable Encryption',
        description: 'Enable encryption at rest and in transit',
        code: this.generateEncryptionRemediation(asset),
        rollbackCode: this.generateEncryptionRollback(asset),
        estimatedTime: 15,
        riskLevel: 'medium',
        requiresApproval: false,
        dependencies: [],
        tags: ['encryption', 'security'],
      };
    }

    return null;
  }

  /**
   * Generate Azure remediation actions
   */
  private async generateAzureRemediation(
    finding: Finding,
    asset: Asset
  ): Promise<RemediationAction | null> {
    const rule = finding.rule?.toLowerCase() || '';

    if (rule.includes('storage') && rule.includes('public')) {
      return {
        id: `remediation-${finding.id}`,
        findingId: finding.id,
        assetId: asset.id,
        type: 'azure-arm',
        name: 'Restrict Storage Account Public Access',
        description: 'Disable public access and configure network rules',
        code: this.generateAzureStorageRemediation(asset),
        rollbackCode: this.generateAzureStorageRollback(asset),
        estimatedTime: 5,
        riskLevel: 'low',
        requiresApproval: false,
        dependencies: [],
        tags: ['azure', 'storage', 'security'],
      };
    }

    return null;
  }

  /**
   * Generate GCP remediation actions
   */
  private async generateGCPRemediation(
    finding: Finding,
    asset: Asset
  ): Promise<RemediationAction | null> {
    const rule = finding.rule?.toLowerCase() || '';

    if (rule.includes('storage') && rule.includes('public')) {
      return {
        id: `remediation-${finding.id}`,
        findingId: finding.id,
        assetId: asset.id,
        type: 'gcp-deployment-manager',
        name: 'Restrict Cloud Storage Public Access',
        description: 'Remove public access and configure IAM permissions',
        code: this.generateGCPStorageRemediation(asset),
        rollbackCode: this.generateGCPStorageRollback(asset),
        estimatedTime: 5,
        riskLevel: 'low',
        requiresApproval: false,
        dependencies: [],
        tags: ['gcp', 'storage', 'security'],
      };
    }

    return null;
  }

  /**
   * Execute a single remediation action
   */
  private async executeAction(
    action: RemediationAction,
    dryRun: boolean
  ): Promise<ExecutionResult> {
    const startTime = Date.now();

    try {
      if (dryRun) {
        return {
          actionId: action.id,
          status: 'success',
          output: `DRY RUN: Would execute ${action.name}`,
          executionTime: 0,
          rollbackAvailable: true,
          changes: [],
        };
      }

      // In real implementation, this would execute the actual code
      // For now, simulate execution
      const output = await this.simulateExecution(action);
      const changes = await this.captureChanges(action);

      return {
        actionId: action.id,
        status: 'success',
        output,
        executionTime: Date.now() - startTime,
        rollbackAvailable: true,
        changes,
      };
    } catch (error) {
      return {
        actionId: action.id,
        status: 'failed',
        output: '',
        error: error instanceof Error ? error.message : String(error),
        executionTime: Date.now() - startTime,
        rollbackAvailable: true,
        changes: [],
      };
    }
  }

  /**
   * Execute rollback action
   */
  private async executeRollbackAction(
    rollbackAction: { actionId: string; rollbackCode: string }
  ): Promise<ExecutionResult> {
    const startTime = Date.now();

    try {
      // In real implementation, this would execute the rollback code
      const output = await this.simulateRollback(rollbackAction);

      return {
        actionId: rollbackAction.actionId,
        status: 'success',
        output,
        executionTime: Date.now() - startTime,
        rollbackAvailable: false,
        changes: [],
      };
    } catch (error) {
      return {
        actionId: rollbackAction.actionId,
        status: 'failed',
        output: '',
        error: error instanceof Error ? error.message : String(error),
        executionTime: Date.now() - startTime,
        rollbackAvailable: false,
        changes: [],
      };
    }
  }

  /**
   * Sort actions by dependencies
   */
  private sortActionsByDependencies(actions: RemediationAction[]): RemediationAction[] {
    const sorted: RemediationAction[] = [];
    const remaining = [...actions];

    while (remaining.length > 0) {
      let addedInIteration = false;

      for (let i = remaining.length - 1; i >= 0; i--) {
        const action = remaining[i];
        
        // Check if all dependencies are already in sorted list
        const dependenciesMet = action.dependencies.every(dep =>
          sorted.some(s => s.id === dep)
        );

        if (dependenciesMet || action.dependencies.length === 0) {
          sorted.push(action);
          remaining.splice(i, 1);
          addedInIteration = true;
        }
      }

      if (!addedInIteration) {
        // Circular dependency detected, add remaining actions
        sorted.push(...remaining);
        break;
      }
    }

    return sorted;
  }

  /**
   * Group actions by dependencies for parallel execution
   */
  private groupActionsByDependencies(actions: RemediationAction[]): RemediationAction[][] {
    const groups: RemediationAction[][] = [];
    const processed = new Set<string>();

    while (processed.size < actions.length) {
      const currentGroup: RemediationAction[] = [];

      for (const action of actions) {
        if (processed.has(action.id)) continue;

        // Check if all dependencies are processed
        const dependenciesMet = action.dependencies.every(dep => processed.has(dep));
        
        if (dependenciesMet) {
          currentGroup.push(action);
          processed.add(action.id);
        }
      }

      if (currentGroup.length === 0) {
        // Add remaining actions to avoid infinite loop
        const remaining = actions.filter(a => !processed.has(a.id));
        groups.push(remaining);
        break;
      }

      groups.push(currentGroup);
    }

    return groups;
  }

  /**
   * Calculate overall risk level for a set of actions
   */
  private calculateOverallRisk(actions: RemediationAction[]): 'low' | 'medium' | 'high' {
    const riskScores = { low: 1, medium: 2, high: 3 };
    const totalRisk = actions.reduce((sum, action) => 
      sum + riskScores[action.riskLevel], 0
    );

    const averageRisk = totalRisk / actions.length;

    if (averageRisk >= 2.5) return 'high';
    if (averageRisk >= 1.5) return 'medium';
    return 'low';
  }

  /**
   * Create rollback plan for a remediation plan
   */
  private async createRollbackPlan(plan: RemediationPlan): Promise<void> {
    const rollbackActions = plan.actions.map((action, index) => ({
      actionId: action.id,
      rollbackCode: action.rollbackCode,
      order: index,
    }));

    const rollbackPlan: RollbackPlan = {
      id: `rollback-${plan.id}`,
      remediationPlanId: plan.id,
      actions: rollbackActions,
      createdAt: new Date(),
      status: 'ready',
    };

    this.rollbackPlans.set(plan.id, rollbackPlan);
  }

  // Remediation code generators (simplified examples)
  private generateS3PublicAccessRemediation(asset: Asset): string {
    return `
resource "aws_s3_bucket_public_access_block" "${asset.id}" {
  bucket = aws_s3_bucket.${asset.id}.id

  block_public_acls   = true
  block_public_policy = true
  ignore_public_acls  = true
  restrict_public_buckets = true
}
`;
  }

  private generateS3PublicAccessRollback(asset: Asset): string {
    return `
resource "aws_s3_bucket_public_access_block" "${asset.id}" {
  bucket = aws_s3_bucket.${asset.id}.id

  block_public_acls   = false
  block_public_policy = false
  ignore_public_acls  = false
  restrict_public_buckets = false
}
`;
  }

  private generateIAMRemediation(asset: Asset): string {
    return `
resource "aws_iam_role_policy" "${asset.id}_restricted" {
  name = "${asset.id}-restricted-policy"
  role = aws_iam_role.${asset.id}.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject"
        ]
        Resource = "arn:aws:s3:::restricted-bucket/*"
      }
    ]
  })
}
`;
  }

  private generateIAMRollback(asset: Asset): string {
    return `
resource "aws_iam_role_policy" "${asset.id}_original" {
  name = "${asset.id}-original-policy"
  role = aws_iam_role.${asset.id}.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = "*"
        Resource = "*"
      }
    ]
  })
}
`;
  }

  private generateEncryptionRemediation(asset: Asset): string {
    return `
resource "aws_ebs_volume" "${asset.id}" {
  # ... other configuration ...
  
  encrypted = true
  kms_key_id = aws_kms_key.${asset.id}.key_id
}

resource "aws_kms_key" "${asset.id}" {
  description             = "KMS key for ${asset.id}"
  deletion_window_in_days = 7
}
`;
  }

  private generateEncryptionRollback(asset: Asset): string {
    return `
resource "aws_ebs_volume" "${asset.id}" {
  # ... other configuration ...
  
  encrypted = false
}
`;
  }

  private generateAzureStorageRemediation(asset: Asset): string {
    return `
resource "azurerm_storage_account" "${asset.id}" {
  # ... other configuration ...
  
  public_network_access_enabled = false
  network_rules {
    default_action             = "Deny"
    ip_rules                   = ["10.0.0.0/8"]
    virtual_network_subnet_ids = [azurerm_subnet.example.id]
  }
}
`;
  }

  private generateAzureStorageRollback(asset: Asset): string {
    return `
resource "azurerm_storage_account" "${asset.id}" {
  # ... other configuration ...
  
  public_network_access_enabled = true
  network_rules {
    default_action = "Allow"
  }
}
`;
  }

  private generateGCPStorageRemediation(asset: Asset): string {
    return `
resource "google_storage_bucket" "${asset.id}" {
  # ... other configuration ...
  
  uniform_bucket_level_access = true
  public_access_prevention = "enforced"
}
`;
  }

  private generateGCPStorageRollback(asset: Asset): string {
    return `
resource "google_storage_bucket" "${asset.id}" {
  # ... other configuration ...
  
  uniform_bucket_level_access = false
  public_access_prevention = "inherited"
}
`;
  }

  // Simulation methods (in real implementation, these would execute actual code)
  private async simulateExecution(action: RemediationAction): Promise<string> {
    await new Promise(resolve => setTimeout(resolve, 100));
    return `Successfully executed ${action.name}`;
  }

  private async simulateRollback(rollbackAction: { actionId: string; rollbackCode: string }): Promise<string> {
    await new Promise(resolve => setTimeout(resolve, 100));
    return `Successfully rolled back action ${rollbackAction.actionId}`;
  }

  private async captureChanges(action: RemediationAction): Promise<Array<{
    resource: string;
    property: string;
    oldValue: any;
    newValue: any;
  }>> {
    // In real implementation, this would capture actual changes
    return [
      {
        resource: action.assetId,
        property: 'public_access',
        oldValue: true,
        newValue: false,
      },
    ];
  }

  /**
   * Get execution history for a remediation plan
   */
  getExecutionHistory(planId: string): ExecutionResult[] {
    return this.remediationHistory.get(planId) || [];
  }

  /**
   * Get rollback plan for a remediation plan
   */
  getRollbackPlan(planId: string): RollbackPlan | undefined {
    return this.rollbackPlans.get(planId);
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<RemediationConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): RemediationConfig {
    return { ...this.config };
  }
}
