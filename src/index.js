const smartContractAddress = "EQBVonIf1eYcqc3gCd8iXjvCPkbuBWjsyVwSY0-fHEHM6HmC";
let mainnetEndpoint = 'https://toncenter.com/api/v2/jsonRPC';
let testnetEndpoint = 'https://testnet.toncenter.com/api/v2/jsonRPC';

let currentAccount = "";
let currentEndpoint = "";

document.addEventListener("DOMContentLoaded", () => {
  const currentYear = document.getElementById("currentYear");
  currentYear.innerHTML = Number(new Date().getFullYear()).toString();

  if (walletIsTEPs105()) {
    getUserInformation(true);
  } else {
    update_get_total(mainnetEndpoint); // no wallet, but we will show from mainnet
  }

  const increment = document.getElementById("increment");
  increment.onclick = async () => {
    if (currentAccount == "") {
      show_modal("Please, connect your wallet");
      return;
    }
    const result = await checkPermission(['ton_sendRawTransaction', 'ton_subscribe', 'ton_unsubscribe']);
    if (result) {
      let ton_sendRawTransaction;
      try {
        ton_sendRawTransaction = await window.ton
          .request({
            method: "ton_sendRawTransaction",
            params: {
              "to": smartContractAddress,
              "amount": 0.01,
              //beginCell().storeUint(1, 32).endCell()
              "data": "te6ccsEBAQEABgAGAAgAAAABOYxhGg==",
              "dataType": "boc",
              "stateInit": ""
            }
          });
        if (ton_sendRawTransaction) {
          show_modal("Wait for the transaction to be confirmed on the TON blockchain.");
          await subscribeOnTxConfirmation(currentAccount.address);
          show_modal("Your transaction is confirmed on TON blockchain!");
                    
          update_get_total(currentEndpoint);
        }
      } catch(e) {
        show_modal(e.message);
        update_get_total(currentEndpoint);
      }
    } else {
      show_modal("We need some action from your side to provide our service. Please confirm required permissions.");
    }
  };

  const connectWallet = document.getElementById("connect_wallet");
  connectWallet.onclick = async () => {
    if (!walletIsTEPs105()) {
      show_modal("Please use wallet with TEPs105 compatibilty, for example <a target='_blank' href='https://chrome.google.com/webstore/detail/xton-wallet/cjookpbkjnpkmknedggeecikaponcalb'>XTON wallet</a>.");
      return;
    }
    getUserInformation();
  };

  const modalClose = document.getElementById("modal-close");
  modalClose.onclick = close_modal;
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      close_modal();
    }
  });
});

const shortAddress = (address) => {
  return `${address.substr(0,4)}...${address.substr(-4,4)}`;
};

const checkPermission = async (permissions) => {
  const wallet_getPermissions_result = await window.ton
    .request({
      method: "wallet_getPermissions",
      params: {},
    });
  let existedPermissions = permissions.filter((item) => {
    return wallet_getPermissions_result.includes(item);
  });
  if (existedPermissions.length != permissions.length) {
    try {
      const newPermissions = permissions.filter((n) => !wallet_getPermissions_result.includes(n));
      const wallet_requestPermissions_result = await window.ton
        .request({
          method: "wallet_requestPermissions",
          params: {"permissions": newPermissions},
        });
      existedPermissions = newPermissions.filter((item) => {
        return wallet_requestPermissions_result.includes(item);
      });
      if (existedPermissions.length != newPermissions.length) {
        return false;
      }
    } catch(e) {
      return false;
    }
  }
  return true;
};

const subscribeOnTxConfirmation = async (wallet_address) => {
  return new Promise((resolve, reject) => {
    //prevent deadlock
    const timeoutDeadlock = setTimeout(() => {
      reject(new Error("Timeout for the confirmation, please check in the blockchain explorer"));
    }, 60*1000); // in 20 seconds if no message, then reject

    window.ton
      .request({
        method: "ton_subscribe",
        params: {
          address: wallet_address
        }
      })
      .then((subscriptionId) => {
        window.ton.on("message", (message) => {
          if (message.type === "ton_subscription") {
            if (message.subscriptionId === subscriptionId) {
              clearTimeout(timeoutDeadlock);

              // we must unsubscribe
              window.ton.request({
                method: "ton_unsubscribe",
                params: {
                  address: wallet_address
                }
              });
              resolve(message.data);
            }
          }
        });
      })
      .catch((error) => {
        clearTimeout(timeoutDeadlock);
        console.error(
          `Error making events subscription: ${error.message}.
                    Code: ${error.code}. Data: ${error.data}`
        );
        reject(error);
      });
  });
};

const callMethodOnSmartContract = async (endpoint, smartContractAddress, method) => {
  let headers = {
    'Content-Type': 'application/json',
  };
  let body = JSON.stringify({
    id: '1',
    jsonrpc: '2.0',
    method: 'runGetMethod',
    params: { address: smartContractAddress, method, stack: [] }
  });
  try {
    let res = await fetch(endpoint, {
      method: "POST",
      headers,
      body
    });
    const jsonResult = await res.json();
    if (jsonResult.ok) {
      return jsonResult.result.stack;
    } else {
      return false;
    }
  } catch(e) {
    console.log(e);
    return false;
  }
};

const update_get_total = (currentEndpoint) => {
  let endpoint;
  switch (currentEndpoint) {
  case "mainnet":
    endpoint = mainnetEndpoint;
    break;
  case "testnet":
  default:
    endpoint = testnetEndpoint;
    break;
  }

  callMethodOnSmartContract(endpoint, smartContractAddress, "get_total")
    .then((result) => {
      if (result !== false) {
        const get_total = document.getElementById("get_total");
        get_total.innerHTML = Number(result[0][1]).toString();
      } else {
        get_total.innerHTML = "?";
        show_modal("Something has gone really wrong. Please reload this page. This issue can be related to the rate limit on TONCENTER API endpoint. To avoid this in the future, the developer can use API_KEY.");
      }
    });
};

const getUserInformation = async (silent = false) => {
  window.ton.off("accountChanged");
  window.ton.on("accountChanged", function(data) {
    if (currentAccount != data) {
      currentAccount = data;
      getUserInformation();
    }
  });

  window.ton.off("endpointChanged");
  window.ton.on("endpointChanged", function(data) {
    console.log(currentEndpoint, data, currentEndpoint != data);
    if (currentEndpoint != data) {
      currentEndpoint = data;
      getUserInformation();
    }
  });

  if (silent) {
    try {
      currentAccount = await window.ton
        .request({
          method: "ton_account",
          params: {},
        });
      currentEndpoint = await window.ton
        .request({
          method: "ton_endpoint",
          params: {},
        });
      updateConnectedWalletInfo(currentAccount, currentEndpoint);
      update_get_total(currentEndpoint);
    } catch(e) {
      console.log(e.message);
      update_get_total("mainnet");
    }
  } else {
    const result = await checkPermission(['ton_account', "ton_endpoint"]);
    if (result) {
      try {
        currentAccount = await window.ton
          .request({
            method: "ton_account",
            params: {},
          });
        currentEndpoint = await window.ton
          .request({
            method: "ton_endpoint",
            params: {},
          });
        updateConnectedWalletInfo(currentAccount, currentEndpoint);
        update_get_total(currentEndpoint);
      } catch(e) {
        show_modal(e.message);
      }
    } else {
      show_modal("We need some action from your side to provide our service. Please confirm required permissions.");
    }
  }
};

const updateConnectedWalletInfo = (ton_account, endpoint) => {
  const connect_wallet = document.getElementById("connect_wallet");
  connect_wallet.classList.remove("primary");
  connect_wallet.innerText = "Connected";
  const wallet_address = document.getElementById("wallet_address");
  switch (endpoint) {
  case "mainnet":
    wallet_address.innerHTML = `<a target="_blank" rel="noopener noreferrer" href="https://tonscan.org/address/${ton_account.address}">${shortAddress(ton_account.address)}</a> your balance is ~${Number(ton_account.balance/10**9).toFixed(2)}`;
    break;
  case "testnet":
    wallet_address.innerHTML = `<a target="_blank" rel="noopener noreferrer" href="https://testnet.tonscan.org/address/${ton_account.address}">${shortAddress(ton_account.address)}</a> your balance is ~${Number(ton_account.balance/10**9).toFixed(2)}`;
    break;
  default:
    show_modal("We don't support this endpoint");
    break;
  }
};

const show_modal = (message) => {
  const modal = document.getElementById("modal");
  const modalContent = document.getElementById("modal-content");
  modalContent.innerHTML = message;
  modal.classList.add("visible");
  modalContent.classList.add("visible");
};

const close_modal = () => {
  const modal = document.getElementById("modal");
  const modalContent = document.getElementById("modal-content");
  modal.classList.remove("visible");
  modalContent.classList.remove("visible");
};

const walletIsTEPs105 = () => {
  return typeof(window.ton) != "undefined" && window.ton.isTEPs105;
};