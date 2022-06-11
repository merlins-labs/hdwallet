import * as core from "@shapeshiftoss/hdwallet-core";
import * as ethers from "ethers";
import _ from "lodash";

import { TallyHoEthereumProvider, Window } from "./adapter";
import * as eth from "./ethereum";

export function isTallyHo(wallet: core.HDWallet): wallet is TallyHoHDWallet {
  return _.isObject(wallet) && (wallet as any)._isTallyHo;
}

export class TallyHoHDWalletInfo implements core.HDWalletInfo, core.ETHWalletInfo {
  readonly _supportsETHInfo = true;
  private _ethAddress: string | null = null;

  public getVendor(): string {
    return "Tally Ho";
  }

  public hasOnDevicePinEntry(): boolean {
    return false;
  }

  public hasOnDevicePassphrase(): boolean {
    return true;
  }

  public hasOnDeviceDisplay(): boolean {
    return true;
  }

  public hasOnDeviceRecovery(): boolean {
    return true;
  }

  public hasNativeShapeShift(): boolean {
    // It doesn't... yet?
    return false;
  }

  public supportsOfflineSigning(): boolean {
    return false;
  }

  public supportsBroadcast(): boolean {
    return true;
  }

  public describePath(msg: core.DescribePath): core.PathDescription {
    switch (msg.coin) {
      case "Ethereum":
        return eth.describeETHPath(msg.path);
      default:
        throw new Error("Unsupported path");
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public ethNextAccountPath(_msg: core.ETHAccountPath): core.ETHAccountPath | undefined {
    return undefined;
  }

  public async ethSupportsNetwork(chainId = 1): Promise<boolean> {
    return chainId === 1;
  }

  private async detectTallyProvider(): Promise<TallyHoEthereumProvider | null> {
    let handled = false;

    return new Promise((resolve) => {
      if ((window as Window).ethereum) {
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        handleEthereum();
      } else {
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        window.addEventListener("ethereum#initialized", handleEthereum, { once: true });

        setTimeout(() => {
          // eslint-disable-next-line @typescript-eslint/no-use-before-define
          handleEthereum();
        }, 3000);
      }

      function handleEthereum() {
        if (handled) {
          return;
        }
        handled = true;

        window.removeEventListener("ethereum#initialized", handleEthereum);

        const { ethereum } = window as Window;

        if (ethereum && ethereum.isTally) {
          resolve(ethereum as unknown as TallyHoEthereumProvider);
        } else {
          const message = ethereum ? "Non-TallyHo window.ethereum detected." : "Unable to detect window.ethereum.";

          console.error("hdwallet-tallyho: ", message);
          resolve(null);
        }
      }
    });
  }

  public async ethSwitchChain(chainId = 1): Promise<void> {
    // NOTE: TallyHo currently supports mainnet only and doesn't allow for chain
    // However, multi-chain/custom RPC support is in the roadmap, see https://tally-ho.upvoty.com/
    const hexChainId = ethers.utils.hexValue(chainId);
    try {
      // at this point, we know that we're in the context of a valid MetaMask provider
      const provider: any = await this.detectTallyProvider();
      await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: hexChainId }] });
    } catch (e: any) {
      const error: core.SerializedEthereumRpcError = e;
      if (error.code === 4902) {
        // TODO: EVM Chains Milestone
        // We will need to pass chainName and rpcUrls, which we don't have yet, to add a chain to MetaMask.
      }
    }
  }

  public async ethSupportsSecureTransfer(): Promise<boolean> {
    return false;
  }

  public ethSupportsNativeShapeShift(): boolean {
    return false;
  }

  public async ethSupportsEIP1559(): Promise<boolean> {
    return true;
  }

  public ethGetAccountPaths(msg: core.ETHGetAccountPath): Array<core.ETHAccountPath> {
    return eth.ethGetAccountPaths(msg);
  }
}

export class TallyHoHDWallet implements core.HDWallet, core.ETHWallet {
  readonly _supportsETH = true;
  readonly _supportsETHInfo = true;
  readonly _isTallyHo = true;

  info: TallyHoHDWalletInfo & core.HDWalletInfo;
  ethAddress?: string | null;
  provider: any;

  constructor(provider: unknown) {
    this.info = new TallyHoHDWalletInfo();
    this.provider = provider;
  }

  async getFeatures(): Promise<Record<string, any>> {
    return {};
  }

  public async isLocked(): Promise<boolean> {
    return !this.provider.tallyHo.isUnlocked();
  }

  public getVendor(): string {
    return "Tally Ho";
  }

  public async getModel(): Promise<string> {
    return "Tally Ho";
  }

  public async getLabel(): Promise<string> {
    return "Tally Ho";
  }

  public async initialize(): Promise<void> {
    // nothing to initialize
  }

  public hasOnDevicePinEntry(): boolean {
    return this.info.hasOnDevicePinEntry();
  }

  public hasOnDevicePassphrase(): boolean {
    return this.info.hasOnDevicePassphrase();
  }

  public hasOnDeviceDisplay(): boolean {
    return this.info.hasOnDeviceDisplay();
  }

  public hasOnDeviceRecovery(): boolean {
    return this.info.hasOnDeviceRecovery();
  }

  public hasNativeShapeShift(srcCoin: core.Coin, dstCoin: core.Coin): boolean {
    return this.info.hasNativeShapeShift(srcCoin, dstCoin);
  }

  public supportsOfflineSigning(): boolean {
    // Keep an eye on the status of the refactor PR here: https://github.com/tallycash/extension/pull/1165/files. This will add offline signing support to Tally Ho, at which point this should return true.
    return false;
  }

  public supportsBroadcast(): boolean {
    return true;
  }

  public async clearSession(): Promise<void> {
    // TODO: Can we lock Tally Ho from here?
  }

  public async ping(msg: core.Ping): Promise<core.Pong> {
    // no ping function for Tally Ho, so just returning Core.Pong
    return { msg: msg.msg };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async sendPin(pin: string): Promise<void> {
    // no concept of pin in Tally Ho
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async sendPassphrase(passphrase: string): Promise<void> {
    // cannot send passphrase to Tally Ho. Could show the widget?
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async sendCharacter(charater: string): Promise<void> {
    // no concept of sendCharacter in Tally Ho
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async sendWord(word: string): Promise<void> {
    // no concept of sendWord in Tally Ho
  }

  public async cancel(): Promise<void> {
    // no concept of cancel in Tally Ho
  }
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public async wipe(): Promise<void> {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars
  public async reset(msg: core.ResetDevice): Promise<void> {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async recover(msg: core.RecoverDevice): Promise<void> {
    // no concept of recover in Tally Ho
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async loadDevice(msg: core.LoadDevice): Promise<void> {
    // TODO: Does Tally Ho allow this to be done programatically?
  }

  public describePath(msg: core.DescribePath): core.PathDescription {
    return this.info.describePath(msg);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async getPublicKeys(msg: Array<core.GetPublicKey>): Promise<Array<core.PublicKey | null>> {
    // Ethereum public keys are not exposed by the RPC API
    return [];
  }

  public async isInitialized(): Promise<boolean> {
    return true;
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public async disconnect(): Promise<void> {}

  public async ethSupportsNetwork(chainId = 1): Promise<boolean> {
    return chainId === 1;
  }

  public async ethSupportsSecureTransfer(): Promise<boolean> {
    return false;
  }

  public ethSupportsNativeShapeShift(): boolean {
    return false;
  }

  private async detectTallyProvider(): Promise<TallyHoEthereumProvider | null> {
    let handled = false;

    return new Promise((resolve) => {
      if ((window as Window).ethereum) {
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        handleEthereum();
      } else {
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        window.addEventListener("ethereum#initialized", handleEthereum, { once: true });

        setTimeout(() => {
          // eslint-disable-next-line @typescript-eslint/no-use-before-define
          handleEthereum();
        }, 3000);
      }

      function handleEthereum() {
        if (handled) {
          return;
        }
        handled = true;

        window.removeEventListener("ethereum#initialized", handleEthereum);

        const { ethereum } = window as Window;

        if (ethereum && ethereum.isTally) {
          resolve(ethereum as unknown as TallyHoEthereumProvider);
        } else {
          const message = ethereum ? "Non-TallyHo window.ethereum detected." : "Unable to detect window.ethereum.";

          console.error("hdwallet-tallyho: ", message);
          resolve(null);
        }
      }
    });
  }
  public async ethSwitchChain(chainId = 1): Promise<void> {
    const hexChainId = ethers.utils.hexValue(chainId);
    try {
      // at this point, we know that we're in the context of a valid MetaMask provider
      const provider: any = await this.detectTallyProvider();
      await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: hexChainId }] });
    } catch (e: any) {
      const error: core.SerializedEthereumRpcError = e;
      if (error.code === 4902) {
        // TODO: EVM Chains Milestone
        // We will need to pass chainName and rpcUrls, which we don't have yet, to add a chain to MetaMask.
      }
    }
  }

  public async ethSupportsEIP1559(): Promise<boolean> {
    return true;
  }

  public ethGetAccountPaths(msg: core.ETHGetAccountPath): Array<core.ETHAccountPath> {
    return eth.ethGetAccountPaths(msg);
  }

  public ethNextAccountPath(msg: core.ETHAccountPath): core.ETHAccountPath | undefined {
    return this.info.ethNextAccountPath(msg);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async ethGetAddress(msg: core.ETHGetAddress): Promise<string | null> {
    this.ethAddress ??= await eth.ethGetAddress(this.provider);
    return this.ethAddress;
  }

  public async ethSignTx(msg: core.ETHSignTx): Promise<core.ETHSignedTx | null> {
    const address = await this.ethGetAddress(this.provider);
    return address ? eth.ethSignTx(msg, this.provider, address) : null;
  }

  public async ethSendTx(msg: core.ETHSignTx): Promise<core.ETHTxHash | null> {
    const address = await this.ethGetAddress(this.provider);
    return address ? eth.ethSendTx(msg, this.provider, address) : null;
  }

  public async ethSignMessage(msg: core.ETHSignMessage): Promise<core.ETHSignedMessage | null> {
    const address = await this.ethGetAddress(this.provider);
    return address ? eth.ethSignMessage(msg, this.provider, address) : null;
  }

  public async ethVerifyMessage(msg: core.ETHVerifyMessage): Promise<boolean | null> {
    return eth.ethVerifyMessage(msg, this.provider);
  }

  public async getDeviceID(): Promise<string> {
    return "tallyho:" + (await this.ethGetAddress(this.provider));
  }

  public async getFirmwareVersion(): Promise<string> {
    return "tallyho";
  }
}
