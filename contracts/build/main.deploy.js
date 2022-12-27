import { beginCell, Cell, toNano, TupleSlice } from "ton";
import { sendInternalMessageWithWallet } from "../../utils/helpers";

// return the init Cell of the contract storage (according to load_data() contract method)
export function initData() {
  return new Cell();
}

// return the op that should be sent to the contract on deployment, can be "null" to send an empty message
export function initMessage() {
  return null;
}

// optional end-to-end sanity test for the actual on-chain contract to see it is actually working on-chain
export async function postDeployTest(walletContract, secretKey, contractAddress) {
  const call = await walletContract.client.callGetMethod(contractAddress, "get_total");
  const counter = new TupleSlice(call.stack).readBigNumber();
  console.log(`   # Getter 'get_total' = ${counter.toString()}`);

  const message = beginCell().storeUint(1, 32).endCell();
  await sendInternalMessageWithWallet({ walletContract, secretKey, to: contractAddress, value: toNano(0.02), body: message });
  console.log(`   # Sent message to add 1 to total`);

  const call2 = await walletContract.client.callGetMethod(contractAddress, "get_total");
  const counter2 = new TupleSlice(call2.stack).readBigNumber();
  console.log(`   # Getter 'get_total' = ${counter2.toString()}`);
}