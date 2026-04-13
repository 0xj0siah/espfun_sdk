export const CONTRACT_NAMES = [
  'Player',
  'FDFPair',
  'BondingCurve',
  'ESPStaking',
  'PlayerPack',
  'DevelopmentPlayers',
  'FeeManager',
  'PlayerContracts',
  'ESP',
  'TUSDC',
] as const;

export type ContractName = (typeof CONTRACT_NAMES)[number];

/** Contract addresses indexed by chainId */
export const CONTRACT_ADDRESSES: Record<number, Record<ContractName, string>> = {
  // Base Sepolia
  84532: {
    Player: '0xb316ace8422975c644E723Cc391Db33e14c05460',
    FDFPair: '0xF41Ab3e0dE047E53e9D75ebCfc65D0ac727C7B59',
    BondingCurve: '0x20b8685651082943D7d8A2cceB41430664a5274F',
    ESPStaking: '0x9c288d1c0279a6b2404D483a0c0563C5981Ea845',
    PlayerPack: '0x6351A397a17718Ba614b1dffF183557aca55F24A',
    DevelopmentPlayers: '0xF57a67090fE0B6746c7285FEfE00cd188649393c',
    FeeManager: '0x5a354beb8ddA64A72D30b48980b56b989410448f',
    PlayerContracts: '0xB62dccd11348bfA2Ba29e0c50Da85b1804A6f9d2',
    ESP: '0x11AD735D35d9baD6e7489D8Bc2295F0E32d26CE7',
    TUSDC: '0xEc25C405ec25BB24Ad004198D1B3111e8de808f8',
  },
};

export function getAddresses(chainId: number, overrides?: Partial<Record<ContractName, string>>): Record<ContractName, string> {
  const base = CONTRACT_ADDRESSES[chainId];
  if (!base && !overrides) {
    throw new Error(`No contract addresses for chainId ${chainId}. Provide address overrides in config.`);
  }
  return { ...(base || ({} as Record<ContractName, string>)), ...overrides };
}
