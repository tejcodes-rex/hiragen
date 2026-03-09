import { ethers } from 'ethers';
import { registerTool } from './index';

const BASE_RPC = 'https://mainnet.base.org';
const BASESCAN_API = 'https://api.basescan.org/api';

// Create provider with static network to avoid infinite retry on network detection
function getBaseProvider() {
  return new ethers.JsonRpcProvider(BASE_RPC, {
    name: 'base',
    chainId: 8453,
  }, { staticNetwork: true });
}

// Tool 1: Get ETH balance
registerTool({
  name: 'on_chain_get_balance',
  description: 'Get the ETH balance of an address on Base mainnet.',
  parameters: {
    type: 'object',
    properties: {
      address: { type: 'string', description: 'Ethereum/Base wallet address' },
    },
    required: ['address'],
  },
  async execute(args) {
    const address = args.address as string;
    if (!address) return 'Error: address is required';

    const provider = getBaseProvider();
    const balance = await provider.getBalance(address);
    const ethBalance = ethers.formatEther(balance);

    return `Address: ${address}\nBase ETH Balance: ${ethBalance} ETH`;
  },
});

// Tool 2: Get recent transactions
registerTool({
  name: 'on_chain_get_transactions',
  description: 'Get the most recent transactions for an address on Base mainnet via BaseScan.',
  parameters: {
    type: 'object',
    properties: {
      address: { type: 'string', description: 'Ethereum/Base wallet address' },
    },
    required: ['address'],
  },
  async execute(args) {
    const address = args.address as string;
    if (!address) return 'Error: address is required';

    const url = `${BASESCAN_API}?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=20&sort=desc`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.status !== '1' || !data.result?.length) {
      return `No transactions found for ${address} on Base.`;
    }

    const txns = data.result.map((tx: any, i: number) => {
      const value = ethers.formatEther(tx.value || '0');
      const date = new Date(Number(tx.timeStamp) * 1000).toISOString().split('T')[0];
      const direction = tx.from.toLowerCase() === address.toLowerCase() ? 'OUT' : 'IN';
      return `${i + 1}. [${date}] ${direction} ${value} ETH | To: ${tx.to} | Hash: ${tx.hash.slice(0, 18)}...`;
    });

    const output = `Recent transactions for ${address} on Base:\n\n${txns.join('\n')}`;
    return output.slice(0, 4000);
  },
});

// Tool 3: Get token transfers
registerTool({
  name: 'on_chain_get_token_balances',
  description: 'Get recent ERC-20 token transfers for an address on Base mainnet via BaseScan.',
  parameters: {
    type: 'object',
    properties: {
      address: { type: 'string', description: 'Ethereum/Base wallet address' },
    },
    required: ['address'],
  },
  async execute(args) {
    const address = args.address as string;
    if (!address) return 'Error: address is required';

    const url = `${BASESCAN_API}?module=account&action=tokentx&address=${address}&startblock=0&endblock=99999999&page=1&offset=20&sort=desc`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.status !== '1' || !data.result?.length) {
      return `No token transfers found for ${address} on Base.`;
    }

    const transfers = data.result.map((tx: any, i: number) => {
      const decimals = Number(tx.tokenDecimal) || 18;
      const value = (Number(tx.value) / 10 ** decimals).toFixed(4);
      const date = new Date(Number(tx.timeStamp) * 1000).toISOString().split('T')[0];
      const direction = tx.from.toLowerCase() === address.toLowerCase() ? 'OUT' : 'IN';
      return `${i + 1}. [${date}] ${direction} ${value} ${tx.tokenSymbol} (${tx.tokenName}) | Hash: ${tx.hash.slice(0, 18)}...`;
    });

    const output = `Recent token transfers for ${address} on Base:\n\n${transfers.join('\n')}`;
    return output.slice(0, 4000);
  },
});
