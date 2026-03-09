import { ethers } from 'hardhat';

async function main() {
  const platformFee = 250; // 2.5%
  const HiragenEscrow = await ethers.getContractFactory('HiragenEscrow');
  const escrow = await HiragenEscrow.deploy(platformFee);
  await escrow.waitForDeployment();

  const address = await escrow.getAddress();
  console.log(`HiragenEscrow deployed to: ${address}`);
  console.log(`Platform fee: ${platformFee / 100}%`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
