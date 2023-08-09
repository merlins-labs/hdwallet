import { addressNListToBIP32, slip44ByCoin } from "./utils";
import { BIP32Path, HDWallet, HDWalletInfo, PathDescription } from "./wallet";

export interface MerlinsGetAddress {
  addressNList: BIP32Path;
  showDisplay?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Merlins {
  export interface Msg {
    type: string;
    value: any;
  }

  export type Coins = Coin[];

  export interface Coin {
    denom: string;
    amount: string;
  }

  export interface StdFee {
    amount: Coins;
    gas: string;
  }

  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace crypto {
    export interface PubKey {
      type: string;
      value: string;
    }
  }

  export interface StdSignature {
    pub_key?: crypto.PubKey;
    signature: string;
  }

  export interface StdTx {
    msg: Msg[];
    fee: StdFee;
    signatures: StdSignature[];
    memo?: string;
  }
}

export interface MerlinsTx {
  msg: Merlins.Msg[];
  fee: Merlins.StdFee;
  signatures: Merlins.StdSignature[];
  memo?: string;
}

export interface MerlinsSignTx {
  addressNList: BIP32Path;
  tx: Merlins.StdTx;
  chain_id: string;
  account_number: string;
  sequence: string;
  fee?: number;
}

export interface MerlinsSignedTx {
  serialized: string;
  body: string;
  authInfoBytes: string;
  signatures: string[];
}

export interface MerlinsGetAccountPaths {
  accountIdx: number;
}

export interface MerlinsAccountPath {
  addressNList: BIP32Path;
}

export interface MerlinsWalletInfo extends HDWalletInfo {
  readonly _supportsMerlinsInfo: boolean;

  /**
   * Returns a list of bip32 paths for a given account index in preferred order
   * from most to least preferred.
   */
  merlinsGetAccountPaths(msg: MerlinsGetAccountPaths): Array<MerlinsAccountPath>;

  /**
   * Returns the "next" account path, if any.
   */
  merlinsNextAccountPath(msg: MerlinsAccountPath): MerlinsAccountPath | undefined;
}

export interface MerlinsWallet extends MerlinsWalletInfo, HDWallet {
  readonly _supportsMerlins: boolean;

  merlinsGetAddress(msg: MerlinsGetAddress): Promise<string | null>;
  merlinsSignTx(msg: MerlinsSignTx): Promise<MerlinsSignedTx | null>;
}

export function merlinsDescribePath(path: BIP32Path): PathDescription {
  const pathStr = addressNListToBIP32(path);
  const unknown: PathDescription = {
    verbose: pathStr,
    coin: "Atom",
    isKnown: false,
  };

  if (path.length != 5) {
    return unknown;
  }

  if (path[0] != 0x80000000 + 44) {
    return unknown;
  }

  if (path[1] != 0x80000000 + slip44ByCoin("Osmo")) {
    return unknown;
  }

  if ((path[2] & 0x80000000) >>> 0 !== 0x80000000) {
    return unknown;
  }

  if (path[3] !== 0 || path[4] !== 0) {
    return unknown;
  }

  const index = path[2] & 0x7fffffff;
  return {
    verbose: `Merlins Account #${index}`,
    accountIdx: index,
    wholeAccount: true,
    coin: "Osmo",
    isKnown: true,
    isPrefork: false,
  };
}
