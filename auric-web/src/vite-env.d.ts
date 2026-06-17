/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_CHAIN_ID?: string;
  readonly VITE_RPC_URL?: string;
  readonly VITE_BLOCK_EXPLORER_URL?: string;
  readonly VITE_GOLD_TOKEN_ADDRESS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
