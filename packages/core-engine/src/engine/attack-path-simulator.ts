import { Finding } from '../schemas/finding';
import { Asset } from '../schemas/asset';

export interface AttackNode {
  id: string;
  assetId: string;
  assetType: string;
  service: string;
  compromised: boolean;
  riskScore: number;
  properties: Record<string, any>;
}

export interface AttackEdge {
  id: string;
  sourceId: string;
  targetId: string;
  relationship: string;
  accessibility: number; // 0-1 how easily attacker can move
  permissions: string[];
  conditions: string[];
}

export interface AttackPath {
  id: string;
  nodes: AttackNode[];
  edges: AttackEdge[];
  totalRisk: number;
  pathLength: number;
  criticalAssets: string[];
  attackSteps: string[];
  mitigationPoints: string[];
}

export interface AttackGraph {
  nodes: Map<string, AttackNode>;
  edges: Map<string, AttackEdge>;
  paths: AttackPath[];
  entryPoints: string[];
  criticalAssets: string[];
}

export interface SimulationConfig {
  maxPathLength: number;
  includeLateralMovement: boolean;
  includePrivilegeEscalation: boolean;
  includeDataExfiltration: boolean;
  riskThreshold: number;
}

export class AttackPathSimulator {
  private config: SimulationConfig;
  private attackGraph: AttackGraph;
  private neo4jDriver?: any; // Neo4j driver instance

  constructor(config?: Partial<SimulationConfig>) {
    this.config = {
      maxPathLength: 10,
      includeLateralMovement: true,
      includePrivilegeEscalation: true,
      includeDataExfiltration: true,
      riskThreshold: 0.3,
      ...config,
    };

    this.attackGraph = {
      nodes: new Map(),
      edges: new Map(),
      paths: [],
      entryPoints: [],
      criticalAssets: [],
    };
  }

  /**
   * Initialize Neo4j connection (optional)
   */
  async initializeNeo4j(uri: string, username: string, password: string): Promise<void> {
    try {
      // In real implementation, this would use neo4j-driver
      // const neo4j = require('neo4j-driver');
      // this.neo4jDriver = neo4j.driver(uri, neo4j.auth.basic(username, password));
      // eslint-disable-next-line no-console
      console.log('Neo4j connection initialized');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('Failed to initialize Neo4j, using in-memory graph:', error);
    }
  }

  /**
   * Build attack graph from assets and findings
   */
  async buildAttackGraph(assets: Asset[], findings: Finding[]): Promise<AttackGraph> {
    // Clear existing graph
    this.attackGraph.nodes.clear();
    this.attackGraph.edges.clear();
    this.attackGraph.paths = [];

    // Create nodes from assets
    for (const asset of assets) {
      const node: AttackNode = {
        id: asset.id,
        assetId: asset.id,
        assetType: asset.type,
        service: asset.service || 'unknown',
        compromised: this.isAssetCompromised(asset, findings),
        riskScore: this.calculateAssetRiskScore(asset, findings),
        properties: {
          environment: asset.environment,
          region: asset.region,
          tags: asset.tags,
          public: asset.tags?.includes('public') || false,
        },
      };

      this.attackGraph.nodes.set(asset.id, node);

      // Identify entry points
      if (this.isEntryPoint(node)) {
        this.attackGraph.entryPoints.push(asset.id);
      }

      // Identify critical assets
      if (this.isCriticalAsset(node)) {
        this.attackGraph.criticalAssets.push(asset.id);
      }
    }

    // Create edges based on relationships
    await this.buildRelationships(assets);

    // Find attack paths
    this.attackGraph.paths = await this.findAttackPaths();

    return this.attackGraph;
  }

  /**
   * Simulate attack scenarios
   */
  async simulateAttack(entryPointId: string, targetAssetId?: string): Promise<AttackPath[]> {
    const paths: AttackPath[] = [];
    const entryPoint = this.attackGraph.nodes.get(entryPointId);
    
    if (!entryPoint) {
      throw new Error(`Entry point ${entryPointId} not found`);
    }

    if (targetAssetId) {
      // Find specific path to target
      const path = await this.findPathToTarget(entryPointId, targetAssetId);
      if (path) paths.push(path);
    } else {
      // Find all paths from entry point
      for (const criticalAsset of this.attackGraph.criticalAssets) {
        const path = await this.findPathToTarget(entryPointId, criticalAsset);
        if (path) paths.push(path);
      }
    }

    // Sort by risk and path length
    return paths.sort((a, b) => {
      if (a.totalRisk !== b.totalRisk) {
        return b.totalRisk - a.totalRisk;
      }
      return a.pathLength - b.pathLength;
    });
  }

  /**
   * Get top N most critical attack paths
   */
  getTopCriticalPaths(limit: number = 5): AttackPath[] {
    return this.attackGraph.paths
      .sort((a, b) => b.totalRisk - a.totalRisk)
      .slice(0, limit);
  }

  /**
   * Get attack paths that include a specific asset
   */
  getPathsThroughAsset(assetId: string): AttackPath[] {
    return this.attackGraph.paths.filter(path =>
      path.nodes.some(node => node.assetId === assetId)
    );
  }

  /**
   * Export attack graph to Neo4j format
   */
  async exportToNeo4j(): Promise<void> {
    if (!this.neo4jDriver) {
      throw new Error('Neo4j driver not initialized');
    }

    const session = this.neo4jDriver.session();
    try {
      // Clear existing graph
      await session.run('MATCH (n) DETACH DELETE n');

      // Create nodes
      for (const node of this.attackGraph.nodes.values()) {
        const query = `
          CREATE (a:Asset {
            id: $id,
            assetId: $assetId,
            assetType: $assetType,
            service: $service,
            compromised: $compromised,
            riskScore: $riskScore,
            properties: $properties
          })
        `;
        await session.run(query, node);
      }

      // Create edges
      for (const edge of this.attackGraph.edges.values()) {
        const query = `
          MATCH (source:Asset {id: $sourceId})
          MATCH (target:Asset {id: $targetId})
          CREATE (source)-[r:CAN_ACCESS {
            id: $id,
            relationship: $relationship,
            accessibility: $accessibility,
            permissions: $permissions,
            conditions: $conditions
          }]->(target)
        `;
        await session.run(query, edge);
      }
    } finally {
      await session.close();
    }
  }

  /**
   * Build relationships between assets
   */
  private async buildRelationships(assets: Asset[]): Promise<void> {
    for (const asset of assets) {
      const relationships = this.inferRelationships(asset, assets);
      
      for (const rel of relationships) {
        const edge: AttackEdge = {
          id: `${asset.id}-${rel.targetId}`,
          sourceId: asset.id,
          targetId: rel.targetId,
          relationship: rel.type,
          accessibility: rel.accessibility,
          permissions: rel.permissions,
          conditions: rel.conditions,
        };

        this.attackGraph.edges.set(edge.id, edge);
      }
    }
  }

  /**
   * Infer relationships between assets
   */
  private inferRelationships(asset: Asset, allAssets: Asset[]): Array<{
    targetId: string;
    type: string;
    accessibility: number;
    permissions: string[];
    conditions: string[];
  }> {
    const relationships = [];

    for (const otherAsset of allAssets) {
      if (otherAsset.id === asset.id) continue;

      // Network connectivity
      if (this.areNetworkConnected(asset, otherAsset)) {
        relationships.push({
          targetId: otherAsset.id,
          type: 'NETWORK_ACCESS',
          accessibility: 0.7,
          permissions: ['connect'],
          conditions: ['same_vpc', 'open_ports'],
        });
      }

      // IAM permissions
      if (this.hasIAMPermission(asset, otherAsset)) {
        relationships.push({
          targetId: otherAsset.id,
          type: 'IAM_ACCESS',
          accessibility: 0.8,
          permissions: ['read', 'write', 'execute'],
          conditions: ['iam_policy'],
        });
      }

      // Data access
      if (this.canAccessData(asset, otherAsset)) {
        relationships.push({
          targetId: otherAsset.id,
          type: 'DATA_ACCESS',
          accessibility: 0.6,
          permissions: ['read', 'write'],
          conditions: ['data_permissions'],
        });
      }

      // Service dependencies
      if (this.hasServiceDependency(asset, otherAsset)) {
        relationships.push({
          targetId: otherAsset.id,
          type: 'SERVICE_DEPENDENCY',
          accessibility: 0.5,
          permissions: ['invoke', 'query'],
          conditions: ['service_config'],
        });
      }
    }

    return relationships;
  }

  /**
   * Find attack paths using BFS
   */
  private async findAttackPaths(): Promise<AttackPath[]> {
    const paths: AttackPath[] = [];

    for (const entryPoint of this.attackGraph.entryPoints) {
      for (const criticalAsset of this.attackGraph.criticalAssets) {
        const path = await this.findPathToTarget(entryPoint, criticalAsset);
        if (path) {
          paths.push(path);
        }
      }
    }

    return paths;
  }

  /**
   * Find specific path from source to target
   */
  private async findPathToTarget(sourceId: string, targetId: string): Promise<AttackPath | null> {
    const queue: Array<{ nodeId: string; path: string[]; risk: number }> = [
      { nodeId: sourceId, path: [sourceId], risk: 0 }
    ];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const { nodeId, path, risk } = queue.shift()!;

      if (nodeId === targetId) {
        return this.buildAttackPath(path, risk);
      }

      if (visited.has(nodeId) || path.length > this.config.maxPathLength) {
        continue;
      }

      visited.add(nodeId);

      // Get neighbors
      const neighbors = this.getNeighbors(nodeId);
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor.nodeId)) {
          const newRisk = risk + neighbor.accessibility * neighbor.riskScore;
          queue.push({
            nodeId: neighbor.nodeId,
            path: [...path, neighbor.nodeId],
            risk: newRisk,
          });
        }
      }
    }

    return null;
  }

  /**
   * Build AttackPath object from node path
   */
  private buildAttackPath(nodeIds: string[], totalRisk: number): AttackPath {
    const nodes = nodeIds.map(id => this.attackGraph.nodes.get(id)!);
    const edges: AttackEdge[] = [];
    const attackSteps: string[] = [];
    const mitigationPoints: string[] = [];

    // Build edges and attack steps
    for (let i = 0; i < nodeIds.length - 1; i++) {
      const edgeId = `${nodeIds[i]}-${nodeIds[i + 1]}`;
      const edge = this.attackGraph.edges.get(edgeId);
      if (edge) {
        edges.push(edge);
        attackSteps.push(`${edge.relationship} from ${nodes[i].service} to ${nodes[i + 1].service}`);
      }
    }

    // Identify mitigation points
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].riskScore > this.config.riskThreshold) {
        mitigationPoints.push(`Secure ${nodes[i].service} (${nodes[i].assetType})`);
      }
    }

    return {
      id: `path-${nodeIds.join('-')}`,
      nodes,
      edges,
      totalRisk,
      pathLength: nodeIds.length,
      criticalAssets: nodes.filter(n => this.isCriticalAsset(n)).map(n => n.assetId),
      attackSteps,
      mitigationPoints,
    };
  }

  /**
   * Get neighbors of a node
   */
  private getNeighbors(nodeId: string): Array<{ nodeId: string; accessibility: number; riskScore: number }> {
    const neighbors: Array<{ nodeId: string; accessibility: number; riskScore: number }> = [];
    const node = this.attackGraph.nodes.get(nodeId);

    if (!node) return neighbors;

    for (const edge of this.attackGraph.edges.values()) {
      if (edge.sourceId === nodeId) {
        const targetNode = this.attackGraph.nodes.get(edge.targetId);
        if (targetNode) {
          neighbors.push({
            nodeId: edge.targetId,
            accessibility: edge.accessibility,
            riskScore: targetNode.riskScore,
          });
        }
      }
    }

    return neighbors;
  }

  /**
   * Check if asset is compromised based on findings
   */
  private isAssetCompromised(asset: Asset, findings: Finding[]): boolean {
    return findings.some(finding => 
      finding.assetId === asset.id && 
      finding.severity === 'critical'
    );
  }

  /**
   * Calculate risk score for an asset
   */
  private calculateAssetRiskScore(asset: Asset, findings: Finding[]): number {
    const assetFindings = findings.filter(f => f.assetId === asset.id);
    if (assetFindings.length === 0) return 0.1;

    const severityScores = { critical: 1.0, high: 0.7, medium: 0.4, low: 0.1 };
    const totalScore = assetFindings.reduce((sum, f) => 
      sum + (severityScores[f.severity as keyof typeof severityScores] || 0.1), 0
    );

    return Math.min(totalScore / assetFindings.length, 1.0);
  }

  /**
   * Check if node is an entry point
   */
  private isEntryPoint(node: AttackNode): boolean {
    return node.properties.public || 
           node.service?.includes('internet') ||
           node.service?.includes('public') ||
           node.assetType === 'load-balancer';
  }

  /**
   * Check if node is a critical asset
   */
  private isCriticalAsset(node: AttackNode): boolean {
    return node.properties.tags?.includes('critical') ||
           node.properties.tags?.includes('pii') ||
           node.properties.tags?.includes('production') ||
           node.assetType === 'database' ||
           node.service?.includes('auth');
  }

  /**
   * Check if two assets are network connected
   */
  private areNetworkConnected(asset1: Asset, asset2: Asset): boolean {
    return asset1.region === asset2.region &&
           asset1.environment === asset2.environment &&
           (asset1.tags?.includes('public') || asset2.tags?.includes('public'));
  }

  /**
   * Check if asset has IAM permission to another
   */
  private hasIAMPermission(asset1: Asset, asset2: Asset): boolean {
    return asset1.type === 'iam-role' || asset1.type === 'iam-user';
  }

  /**
   * Check if asset can access data from another
   */
  private canAccessData(asset1: Asset, asset2: Asset): boolean {
    return asset2.type === 'storage' || asset2.type === 'database';
  }

  /**
   * Check if assets have service dependencies
   */
  private hasServiceDependency(asset1: Asset, asset2: Asset): boolean {
    return asset1.service !== asset2.service &&
           asset1.environment === asset2.environment;
  }

  /**
   * Get current attack graph
   */
  getAttackGraph(): AttackGraph {
    return this.attackGraph;
  }

  /**
   * Update simulation configuration
   */
  updateConfig(config: Partial<SimulationConfig>): void {
    this.config = { ...this.config, ...config };
  }
}
