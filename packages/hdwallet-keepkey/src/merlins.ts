import type { AminoSignResponse, OfflineAminoSigner, StdSignDoc, StdTx } from "@cosmjs/amino";
import type { AccountData } from "@cosmjs/proto-signing";
import type { SignerData } from "@cosmjs/stargate";
import * as Messages from "@keepkey/device-protocol/lib/messages_pb";
import * as MerlinsMessages from "@keepkey/device-protocol/lib/messages-merlins_pb";
import * as core from "@shapeshiftoss/hdwallet-core";
import { sortTxFields } from "@shapeshiftoss/hdwallet-core";
import * as bs58check from "bs58check";
import PLazy from "p-lazy";

import { Transport } from "./transport";

const protoTxBuilder = PLazy.from(() => import("@shapeshiftoss/proto-tx-builder"));

export function merlinsGetAccountPaths(msg: core.MerlinsGetAccountPaths): Array<core.MerlinsAccountPath> {
  return [
    {
      addressNList: [0x80000000 + 44, 0x80000000 + core.slip44ByCoin("Osmo"), 0x80000000 + msg.accountIdx, 0, 0],
    },
  ];
}

export async function merlinsGetAddress(
  transport: Transport,
  msg: MerlinsMessages.MerlinsGetAddress.AsObject
): Promise<string> {
  const getAddr = new MerlinsMessages.MerlinsGetAddress();
  getAddr.setAddressNList(msg.addressNList);
  getAddr.setShowDisplay(msg.showDisplay !== false);
  const response = await transport.call(Messages.MessageType.MESSAGETYPE_MERLINSGETADDRESS, getAddr, {
    msgTimeout: core.LONG_TIMEOUT,
  });

  const merlinsAddress = response.proto as MerlinsMessages.MerlinsAddress;
  return core.mustBeDefined(merlinsAddress.getAddress());
}

export async function merlinsSignTx(transport: Transport, msg: core.MerlinsSignTx): Promise<any> {
  const address = await merlinsGetAddress(transport, { addressNList: msg.addressNList, showDisplay: false });
  const getPublicKeyMsg = new Messages.GetPublicKey();
  getPublicKeyMsg.setAddressNList(msg.addressNList);
  getPublicKeyMsg.setEcdsaCurveName("secp256k1");

  const pubkeyMsg = (
    await transport.call(Messages.MessageType.MESSAGETYPE_GETPUBLICKEY, getPublicKeyMsg, {
      msgTimeout: core.DEFAULT_TIMEOUT,
    })
  ).proto as Messages.PublicKey;
  const pubkey = bs58check.decode(core.mustBeDefined(pubkeyMsg.getXpub())).slice(45);

  return transport.lockDuring(async () => {
    const signTx = new MerlinsMessages.MerlinsSignTx();
    signTx.setAddressNList(msg.addressNList);
    signTx.setAccountNumber(msg.account_number);
    signTx.setChainId(msg.chain_id);
    signTx.setFeeAmount(parseInt(msg.tx.fee.amount[0].amount));
    signTx.setGas(parseInt(msg.tx.fee.gas));
    signTx.setSequence(msg.sequence);
    if (msg.tx.memo !== undefined) {
      signTx.setMemo(msg.tx.memo);
    }
    signTx.setMsgCount(1);

    let resp = await transport.call(Messages.MessageType.MESSAGETYPE_MERLINSSIGNTX, signTx, {
      msgTimeout: core.LONG_TIMEOUT,
      omitLock: true,
    });

    for (const m of msg.tx.msg) {
      if (resp.message_enum !== Messages.MessageType.MESSAGETYPE_MERLINSMSGREQUEST) {
        throw new Error(`merlins: unexpected response ${resp.message_type}`);
      }

      let ack;
      switch (m.type) {
        case "cosmos-sdk/MsgSend": {
          // Transfer
          if (m.value.amount.length !== 1) {
            throw new Error("merlins: Multiple amounts per msg not supported");
          }

          const denom = m.value.amount[0].denom;
          if (denom !== "uosmo") {
            throw new Error("merlins: Unsupported denomination: " + denom);
          }

          const send = new MerlinsMessages.MerlinsMsgSend();
          send.setFromAddress(m.value.from_address);
          send.setToAddress(m.value.to_address);
          send.setDenom(m.value.amount[0].denom);
          send.setAmount(m.value.amount[0].amount);

          ack = new MerlinsMessages.MerlinsMsgAck();
          ack.setSend(send);
          break;
        }
        case "cosmos-sdk/MsgDelegate": {
          // Delegate
          const denom = m.value.amount.denom;
          if (denom !== "uosmo") {
            throw new Error("merlins: Unsupported denomination: " + denom);
          }

          const delegate = new MerlinsMessages.MerlinsMsgDelegate();
          delegate.setDelegatorAddress(m.value.delegator_address);
          delegate.setValidatorAddress(m.value.validator_address);
          delegate.setDenom(m.value.amount.denom);
          delegate.setAmount(m.value.amount.amount);

          ack = new MerlinsMessages.MerlinsMsgAck();
          ack.setDelegate(delegate);
          break;
        }
        case "cosmos-sdk/MsgUndelegate": {
          // Undelegate
          const denom = m.value.amount.denom;
          if (denom !== "uosmo") {
            throw new Error("merlins: Unsupported denomination: " + denom);
          }

          const undelegate = new MerlinsMessages.MerlinsMsgUndelegate();
          undelegate.setDelegatorAddress(m.value.delegator_address);
          undelegate.setValidatorAddress(m.value.validator_address);
          undelegate.setDenom(m.value.amount.denom);
          undelegate.setAmount(m.value.amount.amount);

          ack = new MerlinsMessages.MerlinsMsgAck();
          ack.setUndelegate(undelegate);
          break;
        }
        case "cosmos-sdk/MsgBeginRedelegate": {
          // Redelegate
          const denom = m.value.amount.denom;
          if (denom !== "uosmo") {
            throw new Error("merlins: Unsupported denomination: " + denom);
          }

          const redelegate = new MerlinsMessages.MerlinsMsgRedelegate();
          redelegate.setDelegatorAddress(m.value.delegator_address);
          redelegate.setValidatorSrcAddress(m.value.validator_src_address);
          redelegate.setValidatorDstAddress(m.value.validator_dst_address);
          redelegate.setAmount(m.value.amount.amount);
          redelegate.setDenom(m.value.amount.denom);

          ack = new MerlinsMessages.MerlinsMsgAck();
          ack.setRedelegate(redelegate);
          break;
        }
        case "cosmos-sdk/MsgWithdrawDelegationReward": {
          // Rewards
          const rewards = new MerlinsMessages.MerlinsMsgRewards();
          rewards.setDelegatorAddress(m.value.delegator_address);
          rewards.setValidatorAddress(m.value.validator_address);

          ack = new MerlinsMessages.MerlinsMsgAck();
          ack.setRewards(rewards);
          break;
        }
        case "merlins/gamm/join-pool": {
          // LP add
          const lpAdd = new MerlinsMessages.MerlinsMsgLPAdd();
          lpAdd.setSender(m.value.sender);
          lpAdd.setPoolId(m.value.pool_id);
          lpAdd.setShareOutAmount(m.value.share_out_amount);
          lpAdd.setDenomInMaxA(m.value.token_in_maxs[0].denom);
          lpAdd.setAmountInMaxA(m.value.token_in_maxs[0].amount);
          lpAdd.setDenomInMaxB(m.value.token_in_maxs[1].denom);
          lpAdd.setAmountInMaxB(m.value.token_in_maxs[1].amount);

          ack = new MerlinsMessages.MerlinsMsgAck();
          ack.setLpAdd(lpAdd);
          break;
        }
        case "merlins/gamm/exit-pool": {
          // LP remove
          const lpRemove = new MerlinsMessages.MerlinsMsgLPRemove();
          lpRemove.setSender(m.value.sender);
          lpRemove.setPoolId(m.value.pool_id);
          lpRemove.setShareInAmount(m.value.share_in_amount);
          lpRemove.setDenomOutMinA(m.value.token_out_mins[0].denom);
          lpRemove.setAmountOutMinA(m.value.token_out_mins[0].amount);
          lpRemove.setDenomOutMinB(m.value.token_out_mins[1].denom);
          lpRemove.setAmountOutMinB(m.value.token_out_mins[1].amount);

          ack = new MerlinsMessages.MerlinsMsgAck();
          ack.setLpRemove(lpRemove);
          break;
        }
        case "cosmos-sdk/MsgTransfer": {
          // IBC Transfer
          const ibcTransfer = new MerlinsMessages.MerlinsMsgIBCTransfer();
          ibcTransfer.setReceiver(m.value.receiver);
          ibcTransfer.setSender(m.value.sender);
          ibcTransfer.setSourceChannel(m.value.source_channel);
          ibcTransfer.setSourcePort(m.value.source_port);
          ibcTransfer.setRevisionHeight(m.value.timeout_height.revision_height);
          ibcTransfer.setRevisionNumber(m.value.timeout_height.revision_number);
          ibcTransfer.setAmount(m.value.token.amount);
          ibcTransfer.setDenom(m.value.token.denom);

          ack = new MerlinsMessages.MerlinsMsgAck();
          ack.setIbcTransfer(ibcTransfer);
          break;
        }
        case "merlins/gamm/swap-exact-amount-in": {
          // Swap
          const swap = new MerlinsMessages.MerlinsMsgSwap();
          swap.setSender(m.value.sender);
          swap.setPoolId(m.value.routes[0].pool_id);
          swap.setTokenOutDenom(m.value.routes[0].token_out_denom);
          swap.setTokenInDenom(m.value.token_in.denom);
          swap.setTokenInAmount(m.value.token_in.amount);
          swap.setTokenOutMinAmount(m.value.token_out_min_amount);

          ack = new MerlinsMessages.MerlinsMsgAck();
          ack.setSwap(swap);
          break;
        }
        default:
          throw new Error(`merlins: Message ${m.type} is not yet supported`);
      }

      resp = await transport.call(Messages.MessageType.MESSAGETYPE_MERLINSMSGACK, ack, {
        msgTimeout: core.LONG_TIMEOUT,
        omitLock: true,
      });
    }

    if (resp.message_enum !== Messages.MessageType.MESSAGETYPE_MERLINSSIGNEDTX) {
      throw new Error(`merlins: unexpected response ${resp.message_type}`);
    }

    const signedTx = resp.proto as MerlinsMessages.MerlinsSignedTx;

    const offlineSigner: OfflineAminoSigner = {
      async getAccounts(): Promise<readonly AccountData[]> {
        return [
          {
            address,
            algo: "secp256k1",
            pubkey,
          },
        ];
      },
      async signAmino(signerAddress: string, signDoc: StdSignDoc): Promise<AminoSignResponse> {
        if (signerAddress !== address) throw new Error("expected signerAddress to match address");
        return {
          signed: signDoc,
          signature: {
            pub_key: {
              type: "tendermint/PubKeySecp256k1",
              value: signedTx.getPublicKey_asB64(),
            },
            signature: signedTx.getSignature_asB64(),
          },
        };
      },
    };
    const signerData: SignerData = {
      sequence: Number(msg.sequence),
      accountNumber: Number(msg.account_number),
      chainId: msg.chain_id,
    };
    return (await protoTxBuilder).sign(address, sortTxFields(msg.tx) as StdTx, offlineSigner, signerData);
  });
}
