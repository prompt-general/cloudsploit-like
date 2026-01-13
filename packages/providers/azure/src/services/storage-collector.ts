import { CollectedAsset, AzureCredentials, AzureResource } from '../types';
import { DefaultAzureCredential, ClientSecretCredential } from '@azure/identity';
import { StorageManagementClient } from '@azure/arm-storage';
import { BlobServiceClient } from '@azure/storage-blob';

export class StorageCollector {
  private credential: ClientSecretCredential;
  private subscriptionId: string;

  constructor(credentials: AzureCredentials) {
    this.credential = new ClientSecretCredential(
      credentials.tenantId,
      credentials.clientId,
      credentials.clientSecret
    );
    this.subscriptionId = credentials.subscriptionId;
  }

  async collectAssets(credentials: AzureCredentials, region?: string): Promise<CollectedAsset[]> {
    const client = new StorageManagementClient(this.credential, this.subscriptionId);
    const assets: CollectedAsset[] = [];

    try {
      const storageAccounts = await client.storageAccounts.list();
      
      for (const account of storageAccounts) {
        if (account.id && account.name) {
          const asset: CollectedAsset = {
            id: account.id,
            subscriptionId: this.subscriptionId,
            resourceGroup: this.extractResourceGroup(account.id),
            location: account.location || 'unknown',
            service: 'storage',
            type: 'storage-account',
            name: account.name,
            arn: account.id,
            properties: {
              sku: account.sku?.name,
              accessTier: account.accessTier,
              httpsTrafficEnabled: account.enableHttpsTrafficOnly,
              minimumTlsVersion: account.minimumTlsVersion,
              publicNetworkAccess: account.publicNetworkAccess,
              allowBlobPublicAccess: account.allowBlobPublicAccess,
              networkRuleBypass: account.networkRuleBypassOptions,
              defaultToAzureAdAuthentication: account.defaultToAzureADAuthentication,
            },
            tags: account.tags || {},
          };
          assets.push(asset);
        }
      }
    } catch (error) {
      console.error('Error collecting Azure storage accounts:', error);
    }

    return assets;
  }

  async collectConfig(asset: CollectedAsset, credentials: AzureCredentials): Promise<any> {
    const client = new StorageManagementClient(this.credential, this.subscriptionId);
    
    try {
      const storageAccount = await client.storageAccounts.get(
        this.extractResourceGroup(asset.id),
        asset.name
      );

      // Get blob service client for detailed configuration
      const blobServiceClient = BlobServiceClient.fromConnectionString(
        `DefaultEndpointsProtocol=https;AccountName=${asset.name};AccountKey=${await this.getStorageAccountKey(asset)};EndpointSuffix=core.windows.net`
      );

      // Get container configurations
      const containers = [];
      for await (const container of blobServiceClient.listContainers()) {
        const containerClient = blobServiceClient.getContainerClient(container.name);
        const containerProperties = await containerClient.getProperties();
        
        containers.push({
          name: container.name,
          publicAccess: containerProperties.publicAccess,
          hasImmutabilityPolicy: containerProperties.hasImmutabilityPolicy,
          hasLegalHold: containerProperties.hasLegalHold,
          metadata: containerProperties.metadata,
        });
      }

      return {
        storageAccount: storageAccount,
        containers,
        networkRules: storageAccount.networkRuleSet?.virtualNetworkRules || [],
        privateEndpoints: storageAccount.privateEndpointConnections || [],
        encryption: {
          keySource: storageAccount.encryption?.keySource?.type,
          keyVaultProperties: storageAccount.encryption?.keyVaultProperties,
          services: storageAccount.encryption?.services,
        },
      };
    } catch (error) {
      console.error(`Error collecting config for storage account ${asset.name}:`, error);
      return null;
    }
  }

  private extractResourceGroup(resourceId: string): string {
    const match = resourceId.match(/resourceGroups\/([^\/]+)/);
    return match ? match[1] : 'unknown';
  }

  private async getStorageAccountKey(asset: CollectedAsset): Promise<string> {
    const client = new StorageManagementClient(this.credential, this.subscriptionId);
    
    try {
      const keys = await client.storageAccounts.listKeys(
        this.extractResourceGroup(asset.id),
        asset.name
      );
      
      return keys.keys?.[0]?.value || '';
    } catch (error) {
      console.error('Error getting storage account key:', error);
      return '';
    }
  }
}
