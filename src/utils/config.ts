import Constants from 'expo-constants';

interface Config {
  apiUrl: string;
}

const getConfig = (): Config => {
  // Priority order for API URL:
  // 1. Process environment variable (Docker/production)
  // 2. Expo constants from build time
  // 3. Default to localhost for development
  const apiUrl = process.env.API_URL || 
                 Constants.expoConfig?.extra?.apiUrl || 
                 Constants.manifest?.extra?.apiUrl ||
                 'http://localhost:3001';

  return {
    apiUrl,
  };
};

export const config = getConfig();
export default config;