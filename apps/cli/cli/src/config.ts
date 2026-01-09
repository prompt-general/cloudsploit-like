export const config = {
  apiUrl: process.env.CSPM_API_URL || 'http://localhost:3001/api/v1',
  configDir: process.env.CSPM_CONFIG_DIR || '~/.cspm',
  defaultProvider: process.env.CSPM_DEFAULT_PROVIDER || 'aws',
};
