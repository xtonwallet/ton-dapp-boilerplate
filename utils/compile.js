import fs from 'fs';
import {compileFunc} from '@ton-community/func-js';

async function main() {
  const main = fs.readFileSync("./contracts/src/main.fc", {encoding:'utf8', flag:'r'});
  const stdlib = fs.readFileSync("./contracts/src/stdlib.fc", {encoding:'utf8', flag:'r'});
  let result = await compileFunc({
    // Entry points of your project
    entryPoints: ['main.fc'],
    // Sources
    sources: {
      "stdlib.fc": stdlib,
      "main.fc": '#include "stdlib.fc";\n' + main
    }
  });

  if (result.status === 'error') {
    console.error(result.message);
    return;
  }

  // base64 encoded BOC with code cell
  fs.writeFileSync("./contracts/build/main.boc", result.codeBoc);

  // contains assembly version of your code (for debug purposes)
  fs.writeFileSync("./contracts/build/main.fift", result.fiftCode);
}

main();