import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const config: HardhatUserConfig = {
  solidity: '0.8.24',
  networks: {
    'base-sepolia': {
      url: process.env.BASE_RPC_URL || 'https://sepolia.base.org',
      accounts: process.env.DEPLOYER_PRIVATE_KEY
        ? [process.env.DEPLOYER_PRIVATE_KEY]
        : [],
    },
    localhost: {
      url: 'http://127.0.0.1:8545',
      chainId: 31337,
    },
  },
};

export default config;
