import fs from 'fs';
import { compileFunc } from "@ton-community/func-js";
import { SmartContract, TvmRunnerAsynchronous } from "ton-contract-executor";
import { Address, Cell, beginCell, CellMessage, CommonMessageInfo, InternalMessage } from "ton";
import BN from "bn.js";

const stdlib = fs.readFileSync("./contracts/src/stdlib.fc", {encoding:'utf8', flag:'r'});

const smcFromSource = async (source, data, config) => {
  const cr = await compileFunc({
    sources: {
      'main.fc': '#include "stdlib.fc";\n' + source,
      'stdlib.fc': stdlib,
    },
    entryPoints: ['main.fc'],
  });

  if (cr.status === 'error') {
    throw new Error('compilation failed: ' + cr.message);
  }

  return await SmartContract.fromCell(Cell.fromBoc(Buffer.from(cr.codeBoc, 'base64'))[0], data, config);
};

describe('SmartContract', () => {
  jest.setTimeout(15000);

  it('should run basic contract', async () => {
    const source = fs.readFileSync("./contracts/src/main.fc", {encoding:'utf8', flag:'r'});
    let contract = await smcFromSource(source, new Cell(), {
      getMethodsMutate: true,
      debug: true // enable debug
    });

    contract.setBalance(new BN(500));

    let msgBody = beginCell()
    //increment
      .storeUint(1, 32)
      .endCell();
        
    const counter = [1,2,3,4,5];
    for (let i in counter)  {
      const res = await contract.sendInternalMessage(new InternalMessage({
        to: Address.parse('EQD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_0t'),
        value: 100, // 10 nanoton
        bounce: false,
        body: new CommonMessageInfo({
          body: new CellMessage(msgBody)
        })
      }));

      expect(res.type).toEqual('success');

      let resGetTotal = await contract.invokeGetMethod('get_total', []);
            
      expect(resGetTotal.result[0].toNumber()).toEqual(counter[i]);
    }
  });

  afterAll(async () => {
    // close all opened threads
    await TvmRunnerAsynchronous.getShared().cleanup();
  });
});