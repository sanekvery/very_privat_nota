/**
 * VPN Module
 * Exports for VPN configuration management
 */

// Services
export { vpnService } from './vpn.service';
export { wireguardService } from './wireguard.service';
export { ipPoolService } from './ip-pool.service';
export { createAgentClient } from './agent-client';

// Types
export type {
  WireGuardKeyPair,
  VpnConfig,
  ConfigOptions,
  ServerAvailability,
  IpAllocation,
  ConfigRotation,
  AgentAddPeerRequest,
  AgentRemovePeerRequest,
  AgentResponse,
} from './vpn.types';

// Validation
export {
  generateConfigSchema,
  rotateConfigSchema,
  deleteConfigSchema,
  ipAllocationSchema,
  wireGuardKeyPairSchema,
} from './vpn.validation';

export type {
  GenerateConfigInput,
  RotateConfigInput,
  DeleteConfigInput,
} from './vpn.validation';
