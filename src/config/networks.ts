export interface NetworkConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  blockExplorer: string;
  nativeCurrency: { name: string; symbol: string; decimals: number };
}

export const NETWORKS: Record<string, NetworkConfig> = {
  'base-sepolia': {
    chainId: 84532,
    name: 'Base Sepolia',
    rpcUrl: 'https://sepolia.base.org',
    blockExplorer: 'https://sepolia.basescan.org',
    nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
  },
  'monad-testnet': {
    chainId: 10143,
    name: 'Monad Testnet',
    rpcUrl: 'https://testnet-rpc.monad.xyz',
    blockExplorer: 'https://testnet.monadexplorer.com',
    nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
  },
};

export function getNetworkConfig(network: string | { chainId: number; rpcUrl: string }): NetworkConfig {
  if (typeof network === 'string') {
    const config = NETWORKS[network];
    if (!config) throw new Error(`Unknown network: ${network}. Use 'base-sepolia' or 'monad-testnet'.`);
    return config;
  }
  return {
    chainId: network.chainId,
    name: `Custom (${network.chainId})`,
    rpcUrl: network.rpcUrl,
    blockExplorer: '',
    nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
  };
}
