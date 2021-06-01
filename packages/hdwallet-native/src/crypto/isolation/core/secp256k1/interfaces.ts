import { ByteArray, Uint32 } from "../../types";
import { CurvePoint, Message, RecoverableSignature, Signature } from "./types";
import * as Digest from "../digest";

export interface ECDSAKeyInterface {
    readonly publicKey: CurvePoint;

    // Signatures MUST use a determinsitic nonce generation algorithm, which SHOULD be the one specified in RFC6979. The
    // counter parameter is used to generate multiple distinct signatures over the same message, and SHOULD be included as
    // additional entropy in the nonce generation algorithm (typically after convertion to a 32-byte big-endian integer).
    //
    // This can be used, for example, to find a signature whose r-value does not have the MSB set (i.e. a lowR signature),
    // which can be encoded in DER format with one less byte. If an implementation does not support the use of the counter
    // value, it MUST return undefined rather than perform a signing operation which ignores it.
    ecdsaSign(message: Message): NonNullable<Signature>;
    ecdsaSign(message: Message, counter: Uint32): NonNullable<Signature> | undefined;
}

export interface ECDSARecoverableKeyInterface extends ECDSAKeyInterface {
    ecdsaSign(message: Message): NonNullable<RecoverableSignature>;
    ecdsaSign(message: Message, counter: Uint32): NonNullable<RecoverableSignature> | undefined;
}

export interface ECDHKeyInterface {
    readonly publicKey: CurvePoint;

    // Calculates a shared secret field element according to the ECDH key-agreement scheme specified in SEC 1 section 3.3.2,
    // encoded as a 32-byte big-endian integer. The output of this function is not uniformly distributed, and is not safe to
    // use as a cryptographic key by itself.
    //
    // A key derivation function is required to convert the output into a usable key; a plain, unkeyed cryptographic hash
    // function such as SHA-256 is typically used for this purpose.
    ecdh(publicKey: CurvePoint, digestAlgorithm?: Digest.AlgorithmName<32>): NonNullable<ByteArray<32>>;
    ecdhRaw?(publicKey: CurvePoint): NonNullable<CurvePoint>;
}