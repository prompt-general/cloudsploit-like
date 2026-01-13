import { Asset } from '../schemas/asset';

export interface CrossCloudConnection {
  id: string;
  sourceAsset: Asset;
  targetAsset: Asset;
  connectionType: 'api_call' | 'data_flow' | 'network_traffic' | 'identity_federation' | 'service_mesh';
  protocol?: string;
  port?: number;
  frequency: 'continuous' | 'scheduled' | 'on_demand';
  dataVolume?: 'low' | 'medium' | 'high';
  securityLevel: 'encrypted' | 'authenticated' | 'public' | 'unknown';
  lastSeen: Date;
  confidence: number; // 0-1
  metadata: Record<string, any>;
}

export interface ResourceDependency {
  id: string;
  dependent: Asset;
  dependency: Asset;
  dependencyType: 'runtime' | 'build_time' | 'data' | 'configuration' | 'security';
  criticality: 'critical' | 'important' | 'optional';
  impactDescription: string;
  failureRisk: 'high' | 'medium' | 'low';
}

export interface CloudTopology {
  id: string;
  name: string;
  description: string;
  assets: Asset[];
  connections: CrossCloudConnection[];
  dependencies: ResourceDependency[];
  riskScore: number;
  lastUpdated: Date;
}

export interface TopologyAnalysis {
  totalAssets: number;
  crossCloudConnections: number;
  highRiskConnections: number;
  criticalDependencies: number;
  isolatedAssets: Asset[];
  hubAssets: Asset[]; // Assets with many connections
  recommendations: string[];
}

export interface MappingConfig {
  includeNetworkTraffic: boolean;
  includeAPICalls: boolean;
  includeDataFlows: boolean;
  confidenceThreshold: number;
  maxDepth: number;
  refreshInterval: number; // minutes
}

export class MultiCloudResourceMapper {
  private config: MappingConfig;
  private topology: CloudTopology;
  private connectionCache: Map<string, CrossCloudConnection[]> = new Map();
  private dependencyCache: Map<string, ResourceDependency[]> = new Map();

  constructor(config?: Partial<MappingConfig>) {
    this.config = {
      includeNetworkTraffic: true,
      includeAPICalls: true,
      includeDataFlows: true,
      confidenceThreshold: 0.6,
      maxDepth: 5,
      refreshInterval: 60,
      ...config,
    };

    this.topology = {
      id: `topology-${Date.now()}`,
      name: 'Multi-Cloud Resource Topology',
      description: 'Complete view of cross-cloud resource relationships',
      assets: [],
      connections: [],
      dependencies: [],
      riskScore: 0,
      lastUpdated: new Date(),
    };
  }

  /**
   * Build complete multi-cloud topology
   */
  async buildTopology(assets: Asset[]): Promise<CloudTopology> {
    this.topology.assets = assets;
    this.topology.connections = await this.discoverConnections(assets);
    this.topology.dependencies = await this.discoverDependencies(assets);
    this.topology.riskScore = this.calculateTopologyRisk();
    this.topology.lastUpdated = new Date();

    return this.topology;
  }

  /**
   * Discover cross-cloud connections
   */
  async discoverConnections(assets: Asset[]): Promise<CrossCloudConnection[]> {
    const connections: CrossCloudConnection[] = [];

    for (const sourceAsset of assets) {
      for (const targetAsset of assets) {
        if (sourceAsset.id === targetAsset.id) continue;
        if (sourceAsset.provider === targetAsset.provider) continue;

        const connection = await this.analyzeConnection(sourceAsset, targetAsset);
        if (connection && connection.confidence >= this.config.confidenceThreshold) {
          connections.push(connection);
        }
      }
    }

    return connections;
  }

  /**
   * Analyze potential connection between two assets
   */
  private async analyzeConnection(
    sourceAsset: Asset,
    targetAsset: Asset
  ): Promise<CrossCloudConnection | null> {
    const connectionAnalyzers = {
      'aws-azure': this.analyzeAWSAzureConnection.bind(this),
      'aws-gcp': this.analyzeAWSGCPConnection.bind(this),
      'azure-gcp': this.analyzeAzureGCPConnection.bind(this),
      'aws-azure': this.analyzeAWSAzureConnection.bind(this),
    };

    const key = `${sourceAsset.provider}-${targetAsset.provider}`;
    const analyzer = connectionAnalyzers[key as keyof typeof connectionAnalyzers];
    
    if (!analyzer) return null;

    return analyzer(sourceAsset, targetAsset);
  }

  /**
   * Analyze AWS to Azure connections
   */
  private async analyzeAWSAzureConnection(
    awsAsset: Asset,
    azureAsset: Asset
  ): Promise<CrossCloudConnection | null> {
    // API Gateway to Azure Functions
    if (awsAsset.service?.includes('api-gateway') && azureAsset.service?.includes('function')) {
      return {
        id: `${awsAsset.id}-${azureAsset.id}`,
        sourceAsset: awsAsset,
        targetAsset: azureAsset,
        connectionType: 'api_call',
        protocol: 'https',
        frequency: 'on_demand',
        dataVolume: 'medium',
        securityLevel: 'authenticated',
        lastSeen: new Date(),
        confidence: 0.8,
        metadata: {
          description: 'AWS API Gateway calling Azure Functions',
          integrationType: 'http-api',
        },
      };
    }

    // S3 to Azure Blob Storage (data sync)
    if (awsAsset.service?.includes('s3') && azureAsset.service?.includes('blob')) {
      return {
        id: `${awsAsset.id}-${azureAsset.id}`,
        sourceAsset: awsAsset,
        targetAsset: azureAsset,
        connectionType: 'data_flow',
        protocol: 'https',
        frequency: 'scheduled',
        dataVolume: 'high',
        securityLevel: 'encrypted',
        lastSeen: new Date(),
        confidence: 0.7,
        metadata: {
          description: 'S3 to Azure Blob data synchronization',
          syncTool: 'azcopy',
        },
      };
    }

    // VPC to VNet peering
    if (awsAsset.service?.includes('vpc') && azureAsset.service?.includes('vnet')) {
      return {
        id: `${awsAsset.id}-${azureAsset.id}`,
        sourceAsset: awsAsset,
        targetAsset: azureAsset,
        connectionType: 'network_traffic',
        frequency: 'continuous',
        dataVolume: 'high',
        securityLevel: 'encrypted',
        lastSeen: new Date(),
        confidence: 0.9,
        metadata: {
          description: 'AWS VPC to Azure VNet peering',
          connectionType: 'vpn-gateway',
        },
      };
    }

    return null;
  }

  /**
   * Analyze AWS to GCP connections
   */
  private async analyzeAWSGCPConnection(
    awsAsset: Asset,
    gcpAsset: Asset
  ): Promise<CrossCloudConnection | null> {
    // Lambda to Cloud Functions
    if (awsAsset.service?.includes('lambda') && gcpAsset.service?.includes('cloud-function')) {
      return {
        id: `${awsAsset.id}-${gcpAsset.id}`,
        sourceAsset: awsAsset,
        targetAsset: gcpAsset,
        connectionType: 'api_call',
        protocol: 'https',
        frequency: 'on_demand',
        dataVolume: 'low',
        securityLevel: 'authenticated',
        lastSeen: new Date(),
        confidence: 0.8,
        metadata: {
          description: 'AWS Lambda calling GCP Cloud Functions',
          triggerType: 'http',
        },
      };
    }

    // RDS to Cloud SQL (replication)
    if (awsAsset.service?.includes('rds') && gcpAsset.service?.includes('sql')) {
      return {
        id: `${awsAsset.id}-${gcpAsset.id}`,
        sourceAsset: awsAsset,
        targetAsset: gcpAsset,
        connectionType: 'data_flow',
        protocol: 'mysql/postgres',
        frequency: 'continuous',
        dataVolume: 'high',
        securityLevel: 'encrypted',
        lastSeen: new Date(),
        confidence: 0.9,
        metadata: {
          description: 'RDS to Cloud SQL replication',
          replicationType: 'streaming',
        },
      };
    }

    // S3 to Cloud Storage
    if (awsAsset.service?.includes('s3') && gcpAsset.service?.includes('storage')) {
      return {
        id: `${awsAsset.id}-${gcpAsset.id}`,
        sourceAsset: awsAsset,
        targetAsset: gcpAsset,
        connectionType: 'data_flow',
        protocol: 'https',
        frequency: 'scheduled',
        dataVolume: 'high',
        securityLevel: 'encrypted',
        lastSeen: new Date(),
        confidence: 0.8,
        metadata: {
          description: 'S3 to Cloud Storage data transfer',
          transferTool: 'gsutil',
        },
      };
    }

    return null;
  }

  /**
   * Analyze Azure to GCP connections
   */
  private async analyzeAzureGCPConnection(
    azureAsset: Asset,
    gcpAsset: Asset
  ): Promise<CrossCloudConnection | null> {
    // Azure Functions to Cloud Functions
    if (azureAsset.service?.includes('function') && gcpAsset.service?.includes('cloud-function')) {
      return {
        id: `${azureAsset.id}-${gcpAsset.id}`,
        sourceAsset: azureAsset,
        targetAsset: gcpAsset,
        connectionType: 'api_call',
        protocol: 'https',
        frequency: 'on_demand',
        dataVolume: 'low',
        securityLevel: 'authenticated',
        lastSeen: new Date(),
        confidence: 0.8,
        metadata: {
          description: 'Azure Functions calling GCP Cloud Functions',
          integrationPattern: 'serverless-to-serverless',
        },
      };
    }

    // Azure SQL to Cloud SQL
    if (azureAsset.service?.includes('sql') && gcpAsset.service?.includes('sql')) {
      return {
        id: `${azureAsset.id}-${gcpAsset.id}`,
        sourceAsset: azureAsset,
        targetAsset: gcpAsset,
        connectionType: 'data_flow',
        protocol: 'sql',
        frequency: 'scheduled',
        dataVolume: 'medium',
        securityLevel: 'encrypted',
        lastSeen: new Date(),
        confidence: 0.7,
        metadata: {
          description: 'Azure SQL to Cloud SQL data sync',
          syncMethod: 'etl-pipeline',
        },
      };
    }

    return null;
  }

  /**
   * Discover resource dependencies
   */
  async discoverDependencies(assets: Asset[]): Promise<ResourceDependency[]> {
    const dependencies: ResourceDependency[] = [];

    for (const asset of assets) {
      const assetDeps = await this.analyzeDependencies(asset, assets);
      dependencies.push(...assetDeps);
    }

    return dependencies;
  }

  /**
   * Analyze dependencies for a specific asset
   */
  private async analyzeDependencies(
    asset: Asset,
    allAssets: Asset[]
  ): Promise<ResourceDependency[]> {
    const dependencies: ResourceDependency[] = [];

    for (const otherAsset of allAssets) {
      if (asset.id === otherAsset.id) continue;

      const dependency = await this.analyzeDependency(asset, otherAsset);
      if (dependency) {
        dependencies.push(dependency);
      }
    }

    return dependencies;
  }

  /**
   * Analyze dependency between two assets
   */
  private async analyzeDependency(
    dependent: Asset,
    dependency: Asset
  ): Promise<ResourceDependency | null> {
    // Configuration dependencies
    if (this.hasConfigurationDependency(dependent, dependency)) {
      return {
        id: `${dependent.id}-depends-on-${dependency.id}`,
        dependent,
        dependency,
        dependencyType: 'configuration',
        criticality: 'important',
        impactDescription: `${dependent.name} configuration references ${dependency.name}`,
        failureRisk: 'medium',
      };
    }

    // Data dependencies
    if (this.hasDataDependency(dependent, dependency)) {
      return {
        id: `${dependent.id}-depends-on-${dependency.id}`,
        dependent,
        dependency,
        dependencyType: 'data',
        criticality: 'critical',
        impactDescription: `${dependent.name} reads data from ${dependency.name}`,
        failureRisk: 'high',
      };
    }

    // Runtime dependencies
    if (this.hasRuntimeDependency(dependent, dependency)) {
      return {
        id: `${dependent.id}-depends-on-${dependency.id}`,
        dependent,
        dependency,
        dependencyType: 'runtime',
        criticality: 'critical',
        impactDescription: `${dependent.name} requires ${dependency.name} to operate`,
        failureRisk: 'high',
      };
    }

    return null;
  }

  /**
   * Check if there's a configuration dependency
   */
  private hasConfigurationDependency(dependent: Asset, dependency: Asset): boolean {
    // Check if dependent's configuration references dependency
    const configPatterns = [
      'connection_string',
      'endpoint_url',
      'resource_id',
      'service_url',
    ];

    return configPatterns.some(pattern => 
      dependent.properties?.[pattern]?.includes(dependency.id) ||
      dependent.properties?.[pattern]?.includes(dependency.name)
    );
  }

  /**
   * Check if there's a data dependency
   */
  private hasDataDependency(dependent: Asset, dependency: Asset): boolean {
    const dataConsumers = ['lambda', 'function', 'vm', 'container', 'app'];
    const dataSources = ['database', 'storage', 'bucket', 'table'];

    return dataConsumers.includes(dependent.type) && dataSources.includes(dependency.type);
  }

  /**
   * Check if there's a runtime dependency
   */
  private hasRuntimeDependency(dependent: Asset, dependency: Asset): boolean {
    const runtimePatterns = [
      dependent.service?.includes('load-balancer') && dependency.type === 'vm',
      dependent.service?.includes('cdn') && dependency.type === 'storage',
      dependent.type === 'container' && dependency.service?.includes('orchestration'),
    ];

    return runtimePatterns.some(Boolean);
  }

  /**
   * Calculate overall topology risk score
   */
  private calculateTopologyRisk(): number {
    let riskScore = 0;

    // Risk from unencrypted connections
    const unencryptedConnections = this.topology.connections.filter(
      c => c.securityLevel === 'public' || c.securityLevel === 'unknown'
    );
    riskScore += unencryptedConnections.length * 10;

    // Risk from high-volume cross-cloud data flows
    const highVolumeFlows = this.topology.connections.filter(
      c => c.dataVolume === 'high' && c.connectionType === 'data_flow'
    );
    riskScore += highVolumeFlows.length * 15;

    // Risk from critical dependencies
    const criticalDeps = this.topology.dependencies.filter(
      d => d.criticality === 'critical' && d.failureRisk === 'high'
    );
    riskScore += criticalDeps.length * 20;

    // Risk from isolated assets (potential security blind spots)
    const isolatedAssets = this.findIsolatedAssets();
    riskScore += isolatedAssets.length * 5;

    return Math.min(riskScore, 100);
  }

  /**
   * Find isolated assets (no connections)
   */
  findIsolatedAssets(): Asset[] {
    const connectedAssets = new Set<string>();

    for (const connection of this.topology.connections) {
      connectedAssets.add(connection.sourceAsset.id);
      connectedAssets.add(connection.targetAsset.id);
    }

    return this.topology.assets.filter(asset => !connectedAssets.has(asset.id));
  }

  /**
   * Find hub assets (many connections)
   */
  findHubAssets(threshold: number = 5): Asset[] {
    const connectionCounts = new Map<string, number>();

    for (const connection of this.topology.connections) {
      connectionCounts.set(
        connection.sourceAsset.id,
        (connectionCounts.get(connection.sourceAsset.id) || 0) + 1
      );
      connectionCounts.set(
        connection.targetAsset.id,
        (connectionCounts.get(connection.targetAsset.id) || 0) + 1
      );
    }

    return this.topology.assets.filter(asset =>
      (connectionCounts.get(asset.id) || 0) >= threshold
    );
  }

  /**
   * Analyze topology and provide insights
   */
  analyzeTopology(): TopologyAnalysis {
    const isolatedAssets = this.findIsolatedAssets();
    const hubAssets = this.findHubAssets();
    const highRiskConnections = this.topology.connections.filter(
      c => c.securityLevel === 'public' || c.confidence < 0.7
    );
    const criticalDependencies = this.topology.dependencies.filter(
      d => d.criticality === 'critical'
    );

    const recommendations = this.generateRecommendations(
      isolatedAssets,
      hubAssets,
      highRiskConnections,
      criticalDependencies
    );

    return {
      totalAssets: this.topology.assets.length,
      crossCloudConnections: this.topology.connections.length,
      highRiskConnections: highRiskConnections.length,
      criticalDependencies: criticalDependencies.length,
      isolatedAssets,
      hubAssets,
      recommendations,
    };
  }

  /**
   * Generate recommendations based on topology analysis
   */
  private generateRecommendations(
    isolatedAssets: Asset[],
    hubAssets: Asset[],
    highRiskConnections: CrossCloudConnection[],
    criticalDependencies: ResourceDependency[]
  ): string[] {
    const recommendations: string[] = [];

    if (isolatedAssets.length > 0) {
      recommendations.push(
        `Review ${isolatedAssets.length} isolated assets for potential security blind spots`
      );
    }

    if (highRiskConnections.length > 0) {
      recommendations.push(
        `Secure ${highRiskConnections.length} high-risk cross-cloud connections with encryption`
      );
    }

    if (criticalDependencies.length > 0) {
      recommendations.push(
        `Implement monitoring for ${criticalDependencies.length} critical dependencies`
      );
    }

    if (hubAssets.length > 0) {
      recommendations.push(
        `Apply enhanced security controls to ${hubAssets.length} hub assets`
      );
    }

    // Cloud-specific recommendations
    const awsAssets = this.topology.assets.filter(a => a.provider === 'aws');
    const azureAssets = this.topology.assets.filter(a => a.provider === 'azure');
    const gcpAssets = this.topology.assets.filter(a => a.provider === 'gcp');

    if (awsAssets.length > 0 && azureAssets.length > 0) {
      recommendations.push('Implement unified identity management across AWS and Azure');
    }

    if (awsAssets.length > 0 && gcpAssets.length > 0) {
      recommendations.push('Standardize network security between AWS and GCP');
    }

    return recommendations;
  }

  /**
   * Get connections for a specific asset
   */
  getAssetConnections(assetId: string): CrossCloudConnection[] {
    return this.topology.connections.filter(
      c => c.sourceAsset.id === assetId || c.targetAsset.id === assetId
    );
  }

  /**
   * Get dependencies for a specific asset
   */
  getAssetDependencies(assetId: string): ResourceDependency[] {
    return this.topology.dependencies.filter(
      d => d.dependent.id === assetId || d.dependency.id === assetId
    );
  }

  /**
   * Get topology
   */
  getTopology(): CloudTopology {
    return this.topology;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<MappingConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): MappingConfig {
    return { ...this.config };
  }

  /**
   * Export topology to various formats
   */
  exportTopology(format: 'json' | 'graphml' | 'dot' = 'json'): string {
    switch (format) {
      case 'json':
        return JSON.stringify(this.topology, null, 2);
      
      case 'graphml':
        return this.exportToGraphML();
      
      case 'dot':
        return this.exportToDOT();
      
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  private exportToGraphML(): string {
    // Simplified GraphML export
    let graphml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    graphml += '<graphml xmlns="http://graphml.graphdrawing.org/xmlns">\n';
    graphml += '<graph id="G" edgedefault="directed">\n';

    // Export nodes
    for (const asset of this.topology.assets) {
      graphml += `  <node id="${asset.id}"/>\n`;
    }

    // Export edges
    for (const connection of this.topology.connections) {
      graphml += `  <edge source="${connection.sourceAsset.id}" target="${connection.targetAsset.id}"/>\n`;
    }

    graphml += '</graph>\n</graphml>';
    return graphml;
  }

  private exportToDOT(): string {
    // Simplified DOT export for Graphviz
    let dot = 'digraph MultiCloudTopology {\n';
    dot += '  rankdir=LR;\n';
    dot += '  node [shape=box];\n\n';

    // Export nodes with provider colors
    const colors = { aws: 'orange', azure: 'blue', gcp: 'green' };
    for (const asset of this.topology.assets) {
      const color = colors[asset.provider as keyof typeof colors] || 'gray';
      dot += `  "${asset.id}" [label="${asset.name}", fillcolor="${color}", style=filled];\n`;
    }

    dot += '\n';

    // Export edges
    for (const connection of this.topology.connections) {
      dot += `  "${connection.sourceAsset.id}" -> "${connection.targetAsset.id}"`;
      dot += ` [label="${connection.connectionType}"];\n`;
    }

    dot += '}\n';
    return dot;
  }
}
