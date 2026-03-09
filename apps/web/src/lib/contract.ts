/**
 * Hiragen Escrow Contract - Base Sepolia Integration
 * Handles on-chain escrow for task payments
 */

// Chain configs
const CHAINS = {
  'base-sepolia': {
    chainId: 84532,
    chainIdHex: '0x14a34',
    name: 'Base Sepolia',
    rpc: 'https://sepolia.base.org',
    explorer: 'https://sepolia.basescan.org',
    currency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
  },
  localhost: {
    chainId: 31337,
    chainIdHex: '0x7a69',
    name: 'Hardhat Local',
    rpc: 'http://127.0.0.1:8545',
    explorer: '',
    currency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
  },
};

// Use localhost for dev, base-sepolia for production
const ACTIVE_CHAIN = process.env.NODE_ENV === 'production' ? 'base-sepolia' : 'localhost';
export const BASE_SEPOLIA = CHAINS[ACTIVE_CHAIN];

// Contract address - set after deployment
export const ESCROW_CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS || '';

// Minimal ABI for frontend interactions
export const ESCROW_ABI = [
  {
    inputs: [{ internalType: 'string', name: '_taskId', type: 'string' }],
    name: 'createEscrow',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: '_escrowId', type: 'uint256' },
      { internalType: 'address', name: '_agent', type: 'address' },
    ],
    name: 'assignAgent',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: '_escrowId', type: 'uint256' }],
    name: 'releaseFunds',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: '_escrowId', type: 'uint256' }],
    name: 'refund',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'string', name: '_taskId', type: 'string' }],
    name: 'getEscrowByTask',
    outputs: [
      {
        components: [
          { internalType: 'address', name: 'client', type: 'address' },
          { internalType: 'address', name: 'agent', type: 'address' },
          { internalType: 'uint256', name: 'amount', type: 'uint256' },
          { internalType: 'string', name: 'taskId', type: 'string' },
          { internalType: 'uint8', name: 'status', type: 'uint8' },
          { internalType: 'uint256', name: 'createdAt', type: 'uint256' },
        ],
        internalType: 'struct HiragenEscrow.Escrow',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'string', name: '_taskId', type: 'string' }],
    name: 'taskToEscrow',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'escrowCount',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'platformFeePercent',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  // Events
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'uint256', name: 'escrowId', type: 'uint256' },
      { indexed: true, internalType: 'address', name: 'client', type: 'address' },
      { indexed: false, internalType: 'string', name: 'taskId', type: 'string' },
      { indexed: false, internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'EscrowCreated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'uint256', name: 'escrowId', type: 'uint256' },
      { indexed: true, internalType: 'address', name: 'agent', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'FundsReleased',
    type: 'event',
  },
] as const;

// Escrow status mapping
export const ESCROW_STATUS = ['Created', 'Funded', 'Released', 'Refunded', 'Disputed'] as const;

/**
 * Ensure the user's wallet is on Base Sepolia
 */
export async function ensureCorrectChain(): Promise<boolean> {
  const ethereum = (window as any).ethereum;
  if (!ethereum) throw new Error('No wallet detected');

  try {
    await ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: BASE_SEPOLIA.chainIdHex }],
    });
    return true;
  } catch (switchError: any) {
    // Chain not added — add it
    if (switchError.code === 4902) {
      await ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: BASE_SEPOLIA.chainIdHex,
          chainName: BASE_SEPOLIA.name,
          nativeCurrency: BASE_SEPOLIA.currency,
          rpcUrls: [BASE_SEPOLIA.rpc],
          blockExplorerUrls: BASE_SEPOLIA.explorer ? [BASE_SEPOLIA.explorer] : [],
        }],
      });
      return true;
    }
    throw switchError;
  }
}

/**
 * Get ethers provider and signer from MetaMask
 */
export async function getProviderAndSigner() {
  const { BrowserProvider } = await import('ethers');
  const ethereum = (window as any).ethereum;
  if (!ethereum) throw new Error('No wallet detected. Install MetaMask.');

  await ensureCorrectChain();
  const provider = new BrowserProvider(ethereum);
  const signer = await provider.getSigner();
  return { provider, signer };
}

/**
 * Get escrow contract instance
 */
export async function getEscrowContract(signerRequired = true) {
  const { Contract, BrowserProvider, JsonRpcProvider } = await import('ethers');

  if (!ESCROW_CONTRACT_ADDRESS) {
    throw new Error('Escrow contract not configured');
  }

  if (signerRequired) {
    const { signer } = await getProviderAndSigner();
    return new Contract(ESCROW_CONTRACT_ADDRESS, ESCROW_ABI, signer);
  }

  // Read-only
  const provider = new JsonRpcProvider(BASE_SEPOLIA.rpc);
  return new Contract(ESCROW_CONTRACT_ADDRESS, ESCROW_ABI, provider);
}

/**
 * Create escrow for a task (deposits ETH)
 */
export async function createEscrowOnChain(taskId: string, amountInEth: string) {
  const { parseEther } = await import('ethers');
  const contract = await getEscrowContract();
  const tx = await contract.createEscrow(taskId, { value: parseEther(amountInEth) });
  const receipt = await tx.wait();
  return { txHash: receipt.hash, receipt };
}

/**
 * Release funds to agent (called by task creator)
 */
export async function releaseFundsOnChain(taskId: string) {
  const contract = await getEscrowContract(false); // read-only to get escrow ID
  const escrowId = await contract.taskToEscrow(taskId);
  if (!escrowId || escrowId === BigInt(0)) throw new Error('No escrow found for this task');

  const writeContract = await getEscrowContract(true);
  const tx = await writeContract.releaseFunds(escrowId);
  const receipt = await tx.wait();
  return { txHash: receipt.hash, receipt };
}

/**
 * Refund escrow (called by task creator on cancel)
 */
export async function refundEscrowOnChain(taskId: string) {
  const contract = await getEscrowContract(false);
  const escrowId = await contract.taskToEscrow(taskId);
  if (!escrowId || escrowId === BigInt(0)) throw new Error('No escrow found for this task');

  const writeContract = await getEscrowContract(true);
  const tx = await writeContract.refund(escrowId);
  const receipt = await tx.wait();
  return { txHash: receipt.hash, receipt };
}

/**
 * Assign agent to escrow (required before releaseFunds works)
 */
export async function assignAgentOnChain(taskId: string, agentAddress: string) {
  const readContract = await getEscrowContract(false);
  const escrowId = await readContract.taskToEscrow(taskId);
  if (!escrowId || escrowId === BigInt(0)) throw new Error('No escrow found for this task');

  const writeContract = await getEscrowContract(true);
  const tx = await writeContract.assignAgent(escrowId, agentAddress);
  const receipt = await tx.wait();
  return { txHash: receipt.hash, receipt };
}

/**
 * Get escrow info for a task (read-only)
 */
export async function getEscrowInfo(taskId: string) {
  try {
    const contract = await getEscrowContract(false);
    const escrow = await contract.getEscrowByTask(taskId);
    const { formatEther } = await import('ethers');
    return {
      client: escrow.client,
      agent: escrow.agent,
      amount: formatEther(escrow.amount),
      status: ESCROW_STATUS[Number(escrow.status)] || 'Unknown',
      createdAt: Number(escrow.createdAt),
    };
  } catch {
    return null; // No escrow exists
  }
}
