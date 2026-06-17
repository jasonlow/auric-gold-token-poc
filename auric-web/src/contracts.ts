// GoldToken (XAU.g) — address from env, defaulting to the local Hardhat
// deterministic deployment. Minimal read-only ABI for the portal.
export const goldTokenAddress = (import.meta.env.VITE_GOLD_TOKEN_ADDRESS ||
  "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9") as `0x${string}`;

export const goldTokenAbi = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  { type: "function", name: "decimals", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
  { type: "function", name: "totalSupply", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "symbol", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
] as const;

// IdentityRegistry — whitelist/KYC status for ERC-3643 permissioning.
// Address from env, defaulting to the local Hardhat deterministic deployment.
export const identityRegistryAddress = (import.meta.env.VITE_IDENTITY_REGISTRY_ADDRESS ||
  "0x5FbDB2315678afecb367f032d93F642f64180aa3") as `0x${string}`;

export const identityRegistryAbi = [
  {
    type: "function",
    name: "isVerified",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ type: "bool" }],
  },
] as const;
