import { Wallet } from "ethers";

function main() {
  const wallet = Wallet.createRandom();
  const { address, privateKey } = wallet;
  console.log({ address, privateKey });
}

if (require.main === module) {
  main();
}
