import { Address, CellMessage, InternalMessage, CommonMessageInfo, SendMode } from "ton";

export const zeroAddress = new Address(0, Buffer.alloc(32, 0));

// used with ton-contract-executor (unit tests) to sendInternalMessage easily
export function internalMessage(params) {
  const message = params.body ? new CellMessage(params.body) : undefined;
  return new InternalMessage({
    from: params.from ? params.from: "EQB6c0w88hW1Apfr4h0QZ9aQ4zpQmdlfsYrarq6AP6TQCfX8",
    to: params.to ? params.to: zeroAddress,
    value: params.value ? params.value: 0,
    bounce: params.bounce ? params.bounce: true,
    body: new CommonMessageInfo({ body: message }),
  });
}

// temp fix until ton-contract-executor (unit tests) remembers c7 value between calls
export function setBalance(contract, balance) {
  contract.setC7Config({
    balance: balance.toNumber(),
  });
}

// helper for end-to-end on-chain tests (normally post deploy) to allow sending InternalMessages to contracts using a wallet
export async function sendInternalMessageWithWallet(params) {
  const message = params.body ? new CellMessage(params.body) : undefined;
  const seqno = await params.walletContract.getSeqNo();
  const transfer = params.walletContract.createTransfer({
    secretKey: params.secretKey,
    seqno: seqno,
    sendMode: SendMode.PAY_GAS_SEPARATLY + SendMode.IGNORE_ERRORS,
    order: new InternalMessage({
      to: params.to,
      value: params.value,
      bounce: params.bounce ?? false,
      body: new CommonMessageInfo({
        body: message,
      }),
    }),
  });
  await params.walletContract.client.sendExternalMessage(params.walletContract, transfer);
  for (let attempt = 0; attempt < 10; attempt++) {
    await sleep(2000);
    const seqnoAfter = await params.walletContract.getSeqNo();
    if (seqnoAfter > seqno) return;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}