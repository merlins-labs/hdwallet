import { StdTx } from "@cosmjs/amino";
import { SignerData } from "@cosmjs/stargate";
import * as core from "@shapeshiftoss/hdwallet-core";
import * as bech32 from "bech32";
import CryptoJS from "crypto-js";
import PLazy from "p-lazy";

import * as Isolation from "./crypto/isolation";
import { NativeHDWalletBase } from "./native";
import * as util from "./util";

const MERLINS_CHAIN = "merlins-1";

const protoTxBuilder = PLazy.from(() => import("@shapeshiftoss/proto-tx-builder"));

export function MixinNativeMerlinsWalletInfo<TBase extends core.Constructor<core.HDWalletInfo>>(Base: TBase) {
  // eslint-disable-next-line @typescript-eslint/no-shadow
  return class MixinNativeMerlinsWalletInfo extends Base implements core.MerlinsWalletInfo {
    readonly _supportsMerlinsInfo = true;
    async merlinsSupportsNetwork(): Promise<boolean> {
      return true;
    }

    async merlinsSupportsSecureTransfer(): Promise<boolean> {
      return false;
    }

    merlinsSupportsNativeShapeShift(): boolean {
      return false;
    }

    merlinsGetAccountPaths(msg: core.MerlinsGetAccountPaths): Array<core.MerlinsAccountPath> {
      const slip44 = core.slip44ByCoin("Osmo");
      return [
        {
          addressNList: [0x80000000 + 44, 0x80000000 + slip44, 0x80000000 + msg.accountIdx, 0, 0],
        },
      ];
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    merlinsNextAccountPath(msg: core.MerlinsAccountPath): core.MerlinsAccountPath | undefined {
      // Only support one account for now (like portis).
      return undefined;
    }
  };
}

export function MixinNativeMerlinsWallet<TBase extends core.Constructor<NativeHDWalletBase>>(Base: TBase) {
  // eslint-disable-next-line @typescript-eslint/no-shadow
  return class MixinNativeMerlinsWallet extends Base {
    readonly _supportsMerlins = true;

    #masterKey: Isolation.Core.BIP32.Node | undefined;

    async merlinsInitializeWallet(masterKey: Isolation.Core.BIP32.Node): Promise<void> {
      this.#masterKey = masterKey;
    }

    merlinsWipe(): void {
      this.#masterKey = undefined;
    }

    merlinsBech32ify(address: ArrayLike<number>, prefix: string): string {
      const words = bech32.toWords(address);
      return bech32.encode(prefix, words);
    }

    createMerlinsAddress(publicKey: string) {
      const message = CryptoJS.SHA256(CryptoJS.enc.Hex.parse(publicKey));
      const hash = CryptoJS.RIPEMD160(message as any).toString();
      const address = Buffer.from(hash, `hex`);
      return this.merlinsBech32ify(address, `osmo`);
    }

    async merlinsGetAddress(msg: core.MerlinsGetAddress): Promise<string | null> {
      return this.needsMnemonic(!!this.#masterKey, async () => {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const keyPair = await util.getKeyPair(this.#masterKey!, msg.addressNList, "merlins");
        return this.createMerlinsAddress(keyPair.publicKey.toString("hex"));
      });
    }

    async merlinsSignTx(msg: core.MerlinsSignTx): Promise<core.CosmosSignedTx | null> {
      return this.needsMnemonic(!!this.#masterKey, async () => {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const keyPair = await util.getKeyPair(this.#masterKey!, msg.addressNList, "merlins");
        const adapter = await Isolation.Adapters.CosmosDirect.create(keyPair.node, "osmo");

        const signerData: SignerData = {
          sequence: Number(msg.sequence),
          accountNumber: Number(msg.account_number),
          chainId: MERLINS_CHAIN,
        };
        return (await protoTxBuilder).sign(adapter.address, msg.tx as StdTx, adapter, signerData, "osmos");
      });
    }
  };
}
