import * as core from "@shapeshiftoss/hdwallet-core";

import { merlinsTests as tests } from "./merlins";

export function merlinsTests(get: () => { wallet: core.HDWallet; info: core.HDWalletInfo }): void {
  tests(get);
}
