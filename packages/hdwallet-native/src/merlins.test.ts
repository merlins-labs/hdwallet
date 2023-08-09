import * as core from "@shapeshiftoss/hdwallet-core";

import * as native from "./native";

const MNEMONIC = "all all all all all all all all all all all all";

const mswMock = require("mswMock")().startServer();
afterEach(() => expect(mswMock).not.toHaveBeenCalled());

const untouchable = require("untouchableMock");

describe("NativeMerlinsWalletInfo", () => {
  const info = native.info();

  it("should return some static metadata", async () => {
    expect(await untouchable.call(info, "merlinsSupportsNetwork")).toBe(true);
    expect(await untouchable.call(info, "merlinsSupportsSecureTransfer")).toBe(false);
    expect(untouchable.call(info, "merlinsSupportsNativeShapeShift")).toBe(false);
  });

  it("should return the correct account paths", async () => {
    const paths = info.merlinsGetAccountPaths({ accountIdx: 0 });
    expect(paths).toMatchObject([{ addressNList: core.bip32ToAddressNList("m/44'/118'/0'/0/0") }]);
  });

  it("does not support getting the next account path", async () => {
    expect(untouchable.call(info, "merlinsNextAccountPath", {})).toBe(undefined);
  });
});

describe("NativeMerlinsWallet", () => {
  let wallet: native.NativeHDWallet;

  beforeEach(async () => {
    wallet = native.create({ deviceId: "native" });
    await wallet.loadDevice({ mnemonic: MNEMONIC });
    expect(await wallet.initialize()).toBe(true);
  });

  it("should generate a correct merlins address", async () => {
    expect(await wallet.merlinsGetAddress({ addressNList: core.bip32ToAddressNList("m/44'/118'/0'/0/0") })).toBe(
      "osmo1knuunh0lmwyrkjmrj7sky49uxk3peyzh2tlskm"
    );
  });

  it("should generate another correct merlins address", async () => {
    expect(await wallet.merlinsGetAddress({ addressNList: core.bip32ToAddressNList("m/44'/118'/1337'/123/4") })).toBe(
      "osmo14k4dnrrmxdch6nkvvuugsywrgmvlwrqs2f6kye"
    );
  });

  it("should sign a transaction correctly", async () => {
    const signed = await wallet.merlinsSignTx({
      addressNList: core.bip32ToAddressNList("m/44'/118'/0'/0/0"),
      tx: {
        msg: [
          {
            type: "cosmos-sdk/MsgSend",
            value: {
              from_address: "osmo1knuunh0lmwyrkjmrj7sky49uxk3peyzh2tlskm",
              to_address: "osmo1knuunh0lmwyrkjmrj7sky49uxk3peyzh2tlskm",
              amount: [
                {
                  denom: "uosmo",
                  amount: "1000",
                },
              ],
            },
          },
        ],
        fee: {
          amount: [
            {
              amount: "100",
              denom: "uosmo",
            },
          ],
          gas: "100000",
        },
        signatures: [],
        memo: "foobar",
      },
      chain_id: "merlinshub-4",
      account_number: "95421",
      sequence: "35",
    });
    await expect(signed?.signatures?.length).toBe(1);
    await expect(signed?.signatures?.[0]).toMatchInlineSnapshot(
      `"m5wzNYyoP1UBsl4QI7cHDHCOcQ5AHBDbx4im19ip3icMJ+S/Ne2To34gNeUOaudlGP1Q7UGk5NNcXa7r1Us47A=="`
    );
  });
});
