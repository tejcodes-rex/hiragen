/**
 * Tool: smart_contract_read — Read data from any smart contract on Base
 * Enables agents to query DeFi protocols, NFT contracts, DAOs, etc.
 */
import { registerTool } from './index';

registerTool({
  name: 'smart_contract_read',
  description: 'Read data from any smart contract on Base network. Call view/pure functions to get token info, balances, pool data, governance state, etc. Provide the contract address, function signature, and arguments.',
  parameters: {
    type: 'object',
    properties: {
      contractAddress: { type: 'string', description: 'The contract address (0x...)' },
      functionSignature: { type: 'string', description: 'Function signature like "balanceOf(address)" or "name()" or "totalSupply()"' },
      args: { type: 'array', items: { type: 'string' }, description: 'Function arguments as strings' },
      rpcUrl: { type: 'string', description: 'Optional custom RPC URL (defaults to Base)' },
    },
    required: ['contractAddress', 'functionSignature'],
  },
  execute: async (args) => {
    const { contractAddress, functionSignature, args: fnArgs = [], rpcUrl } = args;

    try {
      const { ethers } = await import('ethers');
      const rpc = rpcUrl || process.env.BASE_RPC_URL || 'https://mainnet.base.org';
      const isTestnet = rpc.includes('sepolia');
      const provider = new ethers.JsonRpcProvider(rpc, {
        name: isTestnet ? 'base-sepolia' : 'base',
        chainId: isTestnet ? 84532 : 8453,
      }, { staticNetwork: true });

      // Parse function signature — try common return types
      const returnTypes = ['uint256', 'string', 'address', 'bool', 'bytes'];
      let iface: any;
      let callData: string = '';
      const funcName = functionSignature.split('(')[0];

      for (const retType of returnTypes) {
        try {
          iface = new ethers.Interface([`function ${functionSignature} view returns (${retType})`]);
          callData = iface.encodeFunctionData(funcName, fnArgs);
          break;
        } catch { /* try next return type */ }
      }
      if (!callData) {
        iface = new ethers.Interface([`function ${functionSignature} view returns (uint256)`]);
        callData = iface.encodeFunctionData(funcName, fnArgs);
      }

      const result = await provider.call({
        to: contractAddress,
        data: callData,
      });

      // Try to decode — if it fails, return raw
      try {
        const decoded = iface.decodeFunctionResult(funcName, result);
        return `Contract ${contractAddress}\nFunction: ${functionSignature}\nResult: ${decoded.toString()}`;
      } catch {
        return `Contract ${contractAddress}\nFunction: ${functionSignature}\nRaw result: ${result}`;
      }
    } catch (err: any) {
      // Fallback: try with a broader ABI approach
      try {
        const { ethers } = await import('ethers');
        const rpc2 = rpcUrl || process.env.BASE_RPC_URL || 'https://mainnet.base.org';
        const provider = new ethers.JsonRpcProvider(rpc2, {
          name: 'base',
          chainId: 8453,
        }, { staticNetwork: true });

        // Common ERC-20/721 ABI for common queries
        const commonABI = [
          'function name() view returns (string)',
          'function symbol() view returns (string)',
          'function decimals() view returns (uint8)',
          'function totalSupply() view returns (uint256)',
          'function balanceOf(address) view returns (uint256)',
          'function ownerOf(uint256) view returns (address)',
          'function tokenURI(uint256) view returns (string)',
        ];

        const contract = new ethers.Contract(contractAddress, commonABI, provider);
        const funcName = functionSignature.split('(')[0];

        if (typeof contract[funcName] === 'function') {
          const result = await contract[funcName](...fnArgs);
          return `Contract ${contractAddress}\nFunction: ${functionSignature}\nResult: ${result.toString()}`;
        }

        return `Error calling ${functionSignature}: ${err.message}`;
      } catch (e2: any) {
        return `Error: ${err.message}. Fallback also failed: ${e2.message}`;
      }
    }
  },
});
