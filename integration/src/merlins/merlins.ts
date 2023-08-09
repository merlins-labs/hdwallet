/* eslint-disable jest/no-disabled-tests */
import * as core from "@shapeshiftoss/hdwallet-core";

import tx_unsigned_delegation from "./tx01.mainnet.merlins.delegate.json";
import tx_signed_delegation from "./tx01.mainnet.merlins.delegate.signed.json";
import tx_unsigned_lp_add_merlins from "./tx01.mainnet.merlins.lp-add.json";
import tx_signed_lp_add_merlins from "./tx01.mainnet.merlins.lp-add.signed.json";
import tx_unsigned_lp_remove_merlins from "./tx01.mainnet.merlins.lp-remove.json";
import tx_signed_lp_remove_merlins from "./tx01.mainnet.merlins.lp-remove.signed.json";
import tx_unsigned_redelegate_merlins from "./tx01.mainnet.merlins.redelegate.json";
import tx_signed_redelegate_merlins from "./tx01.mainnet.merlins.redelegate.signed.json";
import tx_unsigned_rewards_merlins from "./tx01.mainnet.merlins.rewards.json";
import tx_signed_rewards_merlins from "./tx01.mainnet.merlins.rewards.signed.json";
import tx_unsigned_transfer from "./tx01.mainnet.merlins.transfer.json";
import tx_signed_transfer from "./tx01.mainnet.merlins.transfer.signed.json";
import tx_unigned_undelegate_merlins from "./tx01.mainnet.merlins.undelegate.json";
import tx_signed_undelegate_merlins from "./tx01.mainnet.merlins.undelegate.signed.json";

const MNEMONIC12_NOPIN_NOPASSPHRASE = "alcohol woman abuse must during monitor noble actual mixed trade anger aisle";

const TIMEOUT = 60 * 1000;

/**
 *  Main integration suite for testing MerlinsWallet implementations' Merlins support.
 */
export function merlinsTests(get: () => { wallet: core.HDWallet; info: core.HDWalletInfo }): void {
  let wallet: core.MerlinsWallet & core.HDWallet;

  describe.skip("Merlins", () => {
    beforeAll(async () => {
      const { wallet: w } = get();
      if (core.supportsMerlins(w)) {
        wallet = w;
      }
    });

    beforeEach(async () => {
      if (!wallet) return;
      await wallet.wipe();
      await wallet.loadDevice({
        mnemonic: MNEMONIC12_NOPIN_NOPASSPHRASE,
        label: "test",
        skipChecksum: true,
      });
    }, TIMEOUT);

    test(
      "merlinsGetAccountPaths()",
      () => {
        if (!wallet) return;
        const paths = wallet.merlinsGetAccountPaths({ accountIdx: 0 });
        expect(paths.length > 0).toBe(true);
        expect(paths[0].addressNList[0] > 0x80000000).toBe(true);
      },
      TIMEOUT
    );

    test(
      "merlinsGetAddress()",
      async () => {
        if (!wallet) return;
        expect(
          await wallet.merlinsGetAddress({
            addressNList: core.bip32ToAddressNList("m/44'/118'/0'/0/0"),
            showDisplay: false,
          })
        ).toEqual("osmo15cenya0tr7nm3tz2wn3h3zwkht2rxrq7g9ypmq");
      },
      TIMEOUT
    );

    test(
      "merlinsSignTx()",
      async () => {
        if (!wallet) return;
        const input: core.MerlinsSignTx = {
          tx: tx_unsigned_transfer as unknown as any,
          addressNList: core.bip32ToAddressNList("m/44'/118'/0'/0/0"),
          chain_id: tx_unsigned_transfer.chain_id,
          account_number: tx_unsigned_transfer.account_number,
          sequence: tx_unsigned_transfer.sequence,
        };

        const res = await wallet.merlinsSignTx(input);
        expect(res).toEqual(tx_signed_transfer);
      },
      TIMEOUT
    );

    //delegate tx
    test(
      "(delegate) merlinsSignTx()",
      async () => {
        if (!wallet) return;
        const input: core.MerlinsSignTx = {
          tx: tx_unsigned_delegation as unknown as any,
          addressNList: core.bip32ToAddressNList("m/44'/118'/0'/0/0"),
          chain_id: tx_unsigned_delegation.chain_id,
          account_number: tx_unsigned_delegation.account_number,
          sequence: tx_unsigned_delegation.sequence,
        };

        const res = await wallet.merlinsSignTx(input);
        expect(res).toEqual(tx_signed_delegation);
      },
      TIMEOUT
    );

    //undelegate
    test(
      "(undelegate) merlinsSignTx()",
      async () => {
        if (!wallet) return;
        const input: core.MerlinsSignTx = {
          tx: tx_unigned_undelegate_merlins as unknown as any,
          addressNList: core.bip32ToAddressNList("m/44'/118'/0'/0/0"),
          chain_id: tx_unigned_undelegate_merlins.chain_id,
          account_number: tx_unigned_undelegate_merlins.account_number,
          sequence: tx_unigned_undelegate_merlins.sequence,
        };

        const res = await wallet.merlinsSignTx(input);
        expect(res).toEqual(tx_signed_undelegate_merlins);
      },
      TIMEOUT
    );

    //redelegate
    test(
      "(redelegate) merlinsSignTx()",
      async () => {
        if (!wallet) return;
        const input: core.MerlinsSignTx = {
          tx: tx_unsigned_redelegate_merlins as unknown as any,
          addressNList: core.bip32ToAddressNList("m/44'/118'/0'/0/0"),
          chain_id: tx_unsigned_redelegate_merlins.chain_id,
          account_number: tx_unsigned_redelegate_merlins.account_number,
          sequence: tx_unsigned_redelegate_merlins.sequence,
        };

        const res = await wallet.merlinsSignTx(input);
        expect(res).toEqual(tx_signed_redelegate_merlins);
      },
      TIMEOUT
    );

    //claim reward
    test(
      "(claim) merlinsSignTx()",
      async () => {
        if (!wallet) return;
        const input: core.MerlinsSignTx = {
          tx: tx_unsigned_rewards_merlins as unknown as any,
          addressNList: core.bip32ToAddressNList("m/44'/118'/0'/0/0"),
          chain_id: tx_unsigned_rewards_merlins.chain_id,
          account_number: tx_unsigned_rewards_merlins.account_number,
          sequence: tx_unsigned_rewards_merlins.sequence,
        };

        const res = await wallet.merlinsSignTx(input);
        expect(res).toEqual(tx_signed_rewards_merlins);
      },
      TIMEOUT
    );

    //lp add
    test(
      "(lp add) merlinsSignTx()",
      async () => {
        if (!wallet) return;
        const input: core.MerlinsSignTx = {
          tx: tx_unsigned_lp_add_merlins as unknown as any,
          addressNList: core.bip32ToAddressNList("m/44'/118'/0'/0/0"),
          chain_id: tx_unsigned_lp_add_merlins.chain_id,
          account_number: tx_unsigned_lp_add_merlins.account_number,
          sequence: tx_unsigned_lp_add_merlins.sequence,
        };

        const res = await wallet.merlinsSignTx(input);
        expect(res).toEqual(tx_signed_lp_add_merlins);
      },
      TIMEOUT
    );

    test(
      "(lp remove) merlinsSignTx()",
      async () => {
        if (!wallet) return;
        const input: core.MerlinsSignTx = {
          tx: tx_unsigned_lp_remove_merlins as unknown as any,
          addressNList: core.bip32ToAddressNList("m/44'/118'/0'/0/0"),
          chain_id: tx_unsigned_lp_remove_merlins.chain_id,
          account_number: tx_unsigned_lp_remove_merlins.account_number,
          sequence: tx_unsigned_lp_remove_merlins.sequence,
        };

        const res = await wallet.merlinsSignTx(input);
        expect(res).toEqual(tx_signed_lp_remove_merlins);
      },
      TIMEOUT
    );
  });
}
