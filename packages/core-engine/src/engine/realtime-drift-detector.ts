import { Asset } from '../schemas/asset';
import { Finding } from '../schemas/finding';

export interface DriftEvent {
  id: string;
  assetId: string;
  assetType: string;
  provider: string;
  timestamp: Date;
  eventType: 'configuration_change' | 'compliance_drift' | 'security_violation' | 'access_change';
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  changes: DriftChange[];
  affectedCompliance: string[];
  riskScore: number;
  autoRemediationAvailable: boolean;
}

export interface DriftChange {
  property: string;
  oldValue: any;
  newValue: any;
  changeType: 'added' | 'removed' | 'modified';
  impact: 'high' | 'medium' | 'low';
  category: 'security' | 'compliance' | 'operational' | 'cost';
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  conditions: AlertCondition[];
  actions: AlertAction[];
  cooldownMinutes: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

export interface AlertCondition {
  type: 'property_change' | 'compliance_drift' | 'risk_score' | 'asset_type' | 'provider';
  property?: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'changed';
  value?: any;
  complianceFrameworks?: string[];
}

export interface AlertAction {
  type: 'webhook' | 'email' | 'slack' | 'teams' | 'pagerduty' | 'jira' | 'auto_remediate';
  config: Record<string, any>;
  enabled: boolean;
}

export interface AlertNotification {
  id: string;
  ruleId: string;
  driftEvent: DriftEvent;
  timestamp: Date;
  status: 'sent' | 'failed' | 'pending';
  recipients: string[];
  message: string;
  actions: AlertAction[];
}

export interface DriftDetectorConfig {
  enableRealTimeMonitoring: boolean;
  pollingIntervalSeconds: number;
  enableWebSocketAlerts: boolean;
  enableCloudTrailIntegration: boolean;
  enableCloudWatchIntegration: boolean;
  enableAzureMonitorIntegration: boolean;
  enableGCPLoggingIntegration: boolean;
  batchSize: number;
  maxEventsPerMinute: number;
}

export class RealtimeDriftDetector {
  private config: DriftDetectorConfig;
  private alertRules: Map<string, AlertRule> = new Map();
  private driftHistory: Map<string, DriftEvent[]> = new Map();
  private alertHistory: Map<string, AlertNotification[]> = new Map();
  private monitoringActive: boolean = false;
  private eventListeners: Array<(event: DriftEvent) => void> = [];
  private cloudWatchSubscriptions: Map<string, any> = new Map();
  private cloudTrailSubscriptions: Map<string, any> = new Map();

  constructor(config?: Partial<DriftDetectorConfig>) {
    this.config = {
      enableRealTimeMonitoring: true,
      pollingIntervalSeconds: 30,
      enableWebSocketAlerts: true,
      enableCloudTrailIntegration: true,
      enableCloudWatchIntegration: true,
      enableAzureMonitorIntegration: true,
      enableGCPLoggingIntegration: true,
      batchSize: 100,
      maxEventsPerMinute: 1000,
      ...config,
    };

    this.initializeDefaultAlertRules();
  }

  /**
   * Start real-time monitoring
   */
  async startMonitoring(assets: Asset[]): Promise<void> {
    if (this.monitoringActive) {
      throw new Error('Monitoring is already active');
    }

    this.monitoringActive = true;

    // Initialize cloud provider integrations
    if (this.config.enableCloudTrailIntegration) {
      await this.initializeCloudTrailMonitoring(assets);
    }

    if (this.config.enableCloudWatchIntegration) {
      await this.initializeCloudWatchMonitoring(assets);
    }

    if (this.config.enableAzureMonitorIntegration) {
      await this.initializeAzureMonitorMonitoring(assets);
    }

    if (this.config.enableGCPLoggingIntegration) {
      await this.initializeGCPLoggingMonitoring(assets);
    }

    // Start polling for assets that don't support real-time events
    if (this.config.pollingIntervalSeconds > 0) {
      this.startPolling(assets);
    }

    // eslint-disable-next-line no-console
    console.log('Real-time drift detection started');
  }

  /**
   * Stop monitoring
   */
  async stopMonitoring(): Promise<void> {
    this.monitoringActive = false;

    // Cleanup cloud provider subscriptions
    for (const subscription of this.cloudTrailSubscriptions.values()) {
      // In real implementation, this would unsubscribe from CloudTrail
    }
    this.cloudTrailSubscriptions.clear();

    for (const subscription of this.cloudWatchSubscriptions.values()) {
      // In real implementation, this would unsubscribe from CloudWatch
    }
    this.cloudWatchSubscriptions.clear();

    // eslint-disable-next-line no-console
    console.log('Real-time drift detection stopped');
  }

  /**
   * Process drift event and trigger alerts
   */
  async processDriftEvent(event: DriftEvent): Promise<AlertNotification[]> {
    // Store event in history
    const assetHistory = this.driftHistory.get(event.assetId) || [];
    assetHistory.push(event);
    this.driftHistory.set(event.assetId, assetHistory);

    // Notify event listeners
    this.eventListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error in event listener:', error);
      }
    });

    // Check alert rules
    const matchingRules = this.findMatchingAlertRules(event);
    const notifications: AlertNotification[] = [];

    for (const rule of matchingRules) {
      const notification = await this.createAlertNotification(rule, event);
      notifications.push(notification);

      // Send alert
      await this.sendAlert(notification);
    }

    return notifications;
  }

  /**
   * Add event listener for real-time updates
   */
  addEventListener(listener: (event: DriftEvent) => void): void {
    this.eventListeners.push(listener);
  }

  /**
   * Remove event listener
   */
  removeEventListener(listener: (event: DriftEvent) => void): void {
    const index = this.eventListeners.indexOf(listener);
    if (index > -1) {
      this.eventListeners.splice(index, 1);
    }
  }

  /**
   * Create alert rule
   */
  createAlertRule(rule: Omit<AlertRule, 'id'>): AlertRule {
    const alertRule: AlertRule = {
      id: `rule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...rule,
    };

    this.alertRules.set(alertRule.id, alertRule);
    return alertRule;
  }

  /**
   * Update alert rule
   */
  updateAlertRule(ruleId: string, updates: Partial<AlertRule>): AlertRule | null {
    const rule = this.alertRules.get(ruleId);
    if (!rule) return null;

    const updatedRule = { ...rule, ...updates };
    this.alertRules.set(ruleId, updatedRule);
    return updatedRule;
  }

  /**
   * Delete alert rule
   */
  deleteAlertRule(ruleId: string): boolean {
    return this.alertRules.delete(ruleId);
  }

  /**
   * Get all alert rules
   */
  getAlertRules(): AlertRule[] {
    return Array.from(this.alertRules.values());
  }

  /**
   * Get drift history for an asset
   */
  getDriftHistory(assetId: string, limit?: number): DriftEvent[] {
    const history = this.driftHistory.get(assetId) || [];
    return limit ? history.slice(-limit) : history;
  }

  /**
   * Get alert history
   */
  getAlertHistory(ruleId?: string, limit?: number): AlertNotification[] {
    let notifications: AlertNotification[] = [];

    if (ruleId) {
      notifications = this.alertHistory.get(ruleId) || [];
    } else {
      for (const history of this.alertHistory.values()) {
        notifications.push(...history);
      }
    }

    notifications.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    return limit ? notifications.slice(0, limit) : notifications;
  }

  /**
   * Initialize CloudTrail monitoring
   */
  private async initializeCloudTrailMonitoring(assets: Asset[]): Promise<void> {
    const awsAssets = assets.filter(a => a.provider === 'aws');

    for (const asset of awsAssets) {
      // In real implementation, this would create CloudTrail subscriptions
      const subscription = {
        assetId: asset.id,
        events: ['Modify*', 'Delete*', 'Create*'],
        enabled: true,
      };

      this.cloudTrailSubscriptions.set(asset.id, subscription);
    }
  }

  /**
   * Initialize CloudWatch monitoring
   */
  private async initializeCloudWatchMonitoring(assets: Asset[]): Promise<void> {
    const awsAssets = assets.filter(a => a.provider === 'aws');

    for (const asset of awsAssets) {
      // In real implementation, this would create CloudWatch event subscriptions
      const subscription = {
        assetId: asset.id,
        metrics: ['ConfigurationChange', 'SecurityGroupChange', 'IAMPolicyChange'],
        enabled: true,
      };

      this.cloudWatchSubscriptions.set(asset.id, subscription);
    }
  }

  /**
   * Initialize Azure Monitor monitoring
   */
  private async initializeAzureMonitorMonitoring(assets: Asset[]): Promise<void> {
    const azureAssets = assets.filter(a => a.provider === 'azure');

    for (const asset of azureAssets) {
      // In real implementation, this would create Azure Monitor subscriptions
      // This is a placeholder for the actual implementation
    }
  }

  /**
   * Initialize GCP Logging monitoring
   */
  private async initializeGCPLoggingMonitoring(assets: Asset[]): Promise<void> {
    const gcpAssets = assets.filter(a => a.provider === 'gcp');

    for (const asset of gcpAssets) {
      // In real implementation, this would create GCP Cloud Logging subscriptions
      // This is a placeholder for the actual implementation
    }
  }

  /**
   * Start polling for changes
   */
  private startPolling(assets: Asset[]): void {
    const poll = async () => {
      if (!this.monitoringActive) return;

      try {
        await this.pollForChanges(assets);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error during polling:', error);
      }

      setTimeout(poll, this.config.pollingIntervalSeconds * 1000);
    };

    poll();
  }

  /**
   * Poll for changes in assets
   */
  private async pollForChanges(assets: Asset[]): Promise<void> {
    // In real implementation, this would compare current state with baseline
    // and generate drift events for any changes detected
  }

  /**
   * Find matching alert rules for a drift event
   */
  private findMatchingAlertRules(event: DriftEvent): AlertRule[] {
    const matchingRules: AlertRule[] = [];

    for (const rule of this.alertRules.values()) {
      if (!rule.enabled) continue;

      if (this.evaluateAlertRule(rule, event)) {
        matchingRules.push(rule);
      }
    }

    return matchingRules;
  }

  /**
   * Evaluate if an alert rule matches a drift event
   */
  private evaluateAlertRule(rule: AlertRule, event: DriftEvent): boolean {
    return rule.conditions.every(condition => 
      this.evaluateAlertCondition(condition, event)
    );
  }

  /**
   * Evaluate individual alert condition
   */
  private evaluateAlertCondition(condition: AlertCondition, event: DriftEvent): boolean {
    switch (condition.type) {
      case 'property_change':
        return this.evaluatePropertyChange(condition, event);
      
      case 'compliance_drift':
        return this.evaluateComplianceDrift(condition, event);
      
      case 'risk_score':
        return this.evaluateRiskScore(condition, event);
      
      case 'asset_type':
        return this.evaluateAssetType(condition, event);
      
      case 'provider':
        return this.evaluateProvider(condition, event);
      
      default:
        return false;
    }
  }

  /**
   * Evaluate property change condition
   */
  private evaluatePropertyChange(condition: AlertCondition, event: DriftEvent): boolean {
    if (!condition.property) return false;

    const change = event.changes.find(c => c.property === condition.property);
    if (!change) return false;

    switch (condition.operator) {
      case 'changed':
        return true;
      
      case 'equals':
        return change.newValue === condition.value;
      
      case 'not_equals':
        return change.newValue !== condition.value;
      
      case 'contains':
        return String(change.newValue).includes(String(condition.value));
      
      default:
        return false;
    }
  }

  /**
   * Evaluate compliance drift condition
   */
  private evaluateComplianceDrift(condition: AlertCondition, event: DriftEvent): boolean {
    if (!condition.complianceFrameworks) return false;

    return condition.complianceFrameworks.some(framework =>
      event.affectedCompliance.includes(framework)
    );
  }

  /**
   * Evaluate risk score condition
   */
  private evaluateRiskScore(condition: AlertCondition, event: DriftEvent): boolean {
    if (!condition.value) return false;

    switch (condition.operator) {
      case 'greater_than':
        return event.riskScore > Number(condition.value);
      
      case 'less_than':
        return event.riskScore < Number(condition.value);
      
      case 'equals':
        return event.riskScore === Number(condition.value);
      
      default:
        return false;
    }
  }

  /**
   * Evaluate asset type condition
   */
  private evaluateAssetType(condition: AlertCondition, event: DriftEvent): boolean {
    if (!condition.value) return false;

    switch (condition.operator) {
      case 'equals':
        return event.assetType === condition.value;
      
      case 'not_equals':
        return event.assetType !== condition.value;
      
      case 'contains':
        return event.assetType.includes(String(condition.value));
      
      default:
        return false;
    }
  }

  /**
   * Evaluate provider condition
   */
  private evaluateProvider(condition: AlertCondition, event: DriftEvent): boolean {
    if (!condition.value) return false;

    switch (condition.operator) {
      case 'equals':
        return event.provider === condition.value;
      
      case 'not_equals':
        return event.provider !== condition.value;
      
      default:
        return false;
    }
  }

  /**
   * Create alert notification
   */
  private async createAlertNotification(
    rule: AlertRule,
    event: DriftEvent
  ): Promise<AlertNotification> {
    const notification: AlertNotification = {
      id: `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ruleId: rule.id,
      driftEvent: event,
      timestamp: new Date(),
      status: 'pending',
      recipients: this.extractRecipients(rule.actions),
      message: this.generateAlertMessage(rule, event),
      actions: rule.actions.filter(a => a.enabled),
    };

    // Store in alert history
    const ruleHistory = this.alertHistory.get(rule.id) || [];
    ruleHistory.push(notification);
    this.alertHistory.set(rule.id, ruleHistory);

    return notification;
  }

  /**
   * Send alert notification
   */
  private async sendAlert(notification: AlertNotification): Promise<void> {
    try {
      for (const action of notification.actions) {
        await this.executeAlertAction(action, notification);
      }

      notification.status = 'sent';
    } catch (error) {
      notification.status = 'failed';
      // eslint-disable-next-line no-console
      console.error('Failed to send alert:', error);
    }
  }

  /**
   * Execute alert action
   */
  private async executeAlertAction(
    action: AlertAction,
    notification: AlertNotification
  ): Promise<void> {
    switch (action.type) {
      case 'webhook':
        await this.sendWebhook(action.config, notification);
        break;
      
      case 'email':
        await this.sendEmail(action.config, notification);
        break;
      
      case 'slack':
        await this.sendSlack(action.config, notification);
        break;
      
      case 'teams':
        await this.sendTeams(action.config, notification);
        break;
      
      case 'pagerduty':
        await this.sendPagerDuty(action.config, notification);
        break;
      
      case 'jira':
        await this.createJiraTicket(action.config, notification);
        break;
      
      case 'auto_remediate':
        await this.triggerAutoRemediation(action.config, notification);
        break;
      
      default:
        // eslint-disable-next-line no-console
        console.warn(`Unknown alert action type: ${action.type}`);
    }
  }

  /**
   * Extract recipients from alert actions
   */
  private extractRecipients(actions: AlertAction[]): string[] {
    const recipients: string[] = [];

    for (const action of actions) {
      switch (action.type) {
        case 'email':
          if (action.config.to) {
            recipients.push(...(Array.isArray(action.config.to) ? action.config.to : [action.config.to]));
          }
          break;
        
        case 'slack':
          if (action.config.channel) {
            recipients.push(`slack:${action.config.channel}`);
          }
          break;
        
        case 'teams':
          if (action.config.webhook) {
            recipients.push(`teams:${action.config.webhook}`);
          }
          break;
      }
    }

    return recipients;
  }

  /**
   * Generate alert message
   */
  private generateAlertMessage(rule: AlertRule, event: DriftEvent): string {
    return `
🚨 **${rule.name}** - ${event.severity.toUpperCase()}

**Asset:** ${event.assetId} (${event.assetType})
**Provider:** ${event.provider}
**Time:** ${event.timestamp.toISOString()}

**Description:** ${event.description}

**Changes:**
${event.changes.map(change => 
  `- ${change.property}: ${change.oldValue} → ${change.newValue} (${change.changeType})`
).join('\n')}

**Affected Compliance:** ${event.affectedCompliance.join(', ') || 'None'}
**Risk Score:** ${event.riskScore}/100

**Rule:** ${rule.description}
    `.trim();
  }

  // Alert action implementations (simplified)
  private async sendWebhook(config: Record<string, any>, notification: AlertNotification): Promise<void> {
    // In real implementation, this would send HTTP POST to webhook URL
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  private async sendEmail(config: Record<string, any>, notification: AlertNotification): Promise<void> {
    // In real implementation, this would send email via SES or similar
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  private async sendSlack(config: Record<string, any>, notification: AlertNotification): Promise<void> {
    // In real implementation, this would send Slack message
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  private async sendTeams(config: Record<string, any>, notification: AlertNotification): Promise<void> {
    // In real implementation, this would send Teams message
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  private async sendPagerDuty(config: Record<string, any>, notification: AlertNotification): Promise<void> {
    // In real implementation, this would create PagerDuty incident
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  private async createJiraTicket(config: Record<string, any>, notification: AlertNotification): Promise<void> {
    // In real implementation, this would create Jira ticket
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  private async triggerAutoRemediation(config: Record<string, any>, notification: AlertNotification): Promise<void> {
    // In real implementation, this would trigger auto-remediation
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Initialize default alert rules
   */
  private initializeDefaultAlertRules(): void {
    // Critical security changes
    this.createAlertRule({
      name: 'Critical Security Changes',
      description: 'Alert on critical security configuration changes',
      enabled: true,
      conditions: [
        {
          type: 'property_change',
          property: 'security',
          operator: 'changed',
        },
        {
          type: 'risk_score',
          operator: 'greater_than',
          value: 80,
        },
      ],
      actions: [
        {
          type: 'email',
          config: { to: 'security-team@company.com' },
          enabled: true,
        },
        {
          type: 'slack',
          config: { channel: '#security-alerts' },
          enabled: true,
        },
      ],
      cooldownMinutes: 5,
      severity: 'critical',
    });

    // Compliance drift
    this.createAlertRule({
      name: 'Compliance Drift',
      description: 'Alert when compliance drifts from baseline',
      enabled: true,
      conditions: [
        {
          type: 'compliance_drift',
          complianceFrameworks: ['SOC2', 'PCI-DSS', 'HIPAA'],
          operator: 'changed',
        },
      ],
      actions: [
        {
          type: 'email',
          config: { to: 'compliance-team@company.com' },
          enabled: true,
        },
        {
          type: 'jira',
          config: { project: 'COMP', issueType: 'Bug' },
          enabled: true,
        },
      ],
      cooldownMinutes: 15,
      severity: 'high',
    });

    // High-risk asset changes
    this.createAlertRule({
      name: 'High-Risk Asset Changes',
      description: 'Alert on changes to high-risk assets',
      enabled: true,
      conditions: [
        {
          type: 'asset_type',
          operator: 'contains',
          value: 'database',
        },
        {
          type: 'risk_score',
          operator: 'greater_than',
          value: 60,
        },
      ],
      actions: [
        {
          type: 'pagerduty',
          config: { severity: 'high' },
          enabled: true,
        },
      ],
      cooldownMinutes: 10,
      severity: 'high',
    });
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<DriftDetectorConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): DriftDetectorConfig {
    return { ...this.config };
  }

  /**
   * Get monitoring status
   */
  isMonitoring(): boolean {
    return this.monitoringActive;
  }
}
