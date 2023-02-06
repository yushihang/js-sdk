import { Hex } from '@iden3/js-crypto';
import { Hash, ZERO_HASH, Proof, swapEndianness } from '@iden3/js-merkletree';
import { TreeState } from './models';

export const defaultMTLevels = 32; // max MT levels, default value for identity circuits
export const defaultValueArraySize = 64; // max value array size, default value for identity circuits
export const defaultMTLevelsOnChain = 32; // max MT levels on chain, default value for identity circuits

export const ErrorEmptyAuthClaimProof = 'empty auth claim mtp proof';
export const ErrorEmptyAuthClaimNonRevProof = 'empty auth claim non-revocation mtp proof';
export const ErrorEmptyChallengeSignature = 'empty challenge signature';
export const ErrorEmptyClaimSignature = 'empty claim signature';
export const ErrorEmptyClaimProof = 'empty claim mtp proof';
export const ErrorEmptyClaimNonRevProof = 'empty claim non-revocation mtp proof';
export const ErrorUserStateInRelayClaimProof =
  'empty user state in relay claim non-revocation mtp proof';
export const ErrorEmptyIssuerAuthClaimProof = 'empty issuer auth claim mtp proof';
export const ErrorEmptyIssuerAuthClaimNonRevProof =
  'empty issuer auth claim non-revocation mtp proof';

/**
 * base config for circuit inputs
 *
 * @export
 * @beta
 * @class BaseConfig
 */
export class BaseConfig {
  mtLevel: number; // Max levels of MT
  valueArraySize: number; // Size if( value array in identity circuit)s
  mtLevelOnChain: number;

  /**
   *  getMTLevel max circuit MT levels
   *
   * @returns number
   */
  getMTLevel(): number {
    return this.mtLevel ? this.mtLevel : defaultMTLevels;
  }

  /**
   * GetValueArrSize return size of circuits value array size
   *
   * @returns number
   */
  getValueArrSize(): number {
    return this.valueArraySize ? this.valueArraySize : defaultValueArraySize;
  }

  /**
   * getMTLevelOnChain return level on chain for given circuit
   *
   * @returns number
   */
  getMTLevelOnChain(): number {
    return this.mtLevelOnChain ? this.mtLevelOnChain : defaultMTLevelsOnChain;
  }
}

/**
 * converts hex to Hash
 *
 * @param {(string | undefined)} s - string hex
 * @returns Hash
 */
export const strMTHex = (s: string | undefined): Hash => {
  if (!s) {
    return ZERO_HASH;
  }
  const h = new Hash();
  h.value = swapEndianness(Hex.decodeString(s));
  return h;
};

/**
 * converts hexes of tree roots to Hashes
 *
 * @param {(string | undefined)} state - state of tree hex
 * @param {(string | undefined)} claimsTreeRoot - claims tree root hex
 * @param {(string | undefined)} revocationTreeRoot - revocation tree root hex
 * @param {(string | undefined)} rootOfRoots - root of roots tree root hex
 * @returns TreeState
 */
export const buildTreeState = (
  state: string | undefined,
  claimsTreeRoot: string | undefined,
  revocationTreeRoot: string | undefined,
  rootOfRoots: string | undefined
): TreeState => ({
  state: strMTHex(state),
  claimsRoot: strMTHex(claimsTreeRoot),
  revocationRoot: strMTHex(revocationTreeRoot),
  rootOfRoots: strMTHex(rootOfRoots)
});

/**
 * siblings as string array
 *
 * @param {Hash[]} siblings - siblings array as Hashes
 * @param {number} levels - levels number
 * @returns string[]
 */
export const prepareSiblingsStr = (siblings: Hash[], levels: number): string[] => {
  // Add the rest of empty levels to the siblings
  for (let i = siblings.length; i < levels; i++) {
    siblings.push(ZERO_HASH);
  }
  return siblings.map((s) => s.bigInt().toString());
};

/**
 * Constructs siblings from proof
 *
 * @param {Proof} proof - mtp
 * @param {number} levels - siblings max count
 * @returns Hash[]
 */
export const circomSiblings = (proof: Proof, levels: number): Hash[] => {
  const siblings = proof.allSiblings();
  // Add the rest of empty levels to the siblings
  for (let i = siblings.length; i < levels; i++) {
    siblings.push(ZERO_HASH);
  }
  return siblings;
};

/**
 * PrepareCircuitArrayValues padding values to size.
 * Validate array size and throw an exception if array is bigger than size
 * if array is bigger, circuit cannot compile because number of inputs does not match
 *
 *
 * @param {bigint[]} arr - given values
 * @param {number} size - size to pad
 * @returns bigint[]
 */
export const prepareCircuitArrayValues = (arr: bigint[], size: number): bigint[] => {
  if (arr.length > size) {
    throw new Error(`array size ${arr.length} is bigger max expected size ${size}`);
  }

  // Add the empty values
  for (let i = arr.length; i < size; i++) {
    arr.push(BigInt(0));
  }

  return arr;
};

/**
 * converts each big integer in array to string
 *
 * @param {bigint[]} arr -  array of big numbers
 * @returns string[]
 */
export const bigIntArrayToStringArray = (arr: bigint[]): string[] => {
  return arr.map((a) => a.toString());
};

// PrepareSiblings prepare siblings for zk
/**
 *
 *
 * @param {Hash[]} siblings
 * @param {number} levels
 * @returns bigint[]
 */
export const prepareSiblings = (siblings: Hash[], levels: number): bigint[] => {
  // Add the rest of empty levels to the siblings
  for (let i = siblings.length; i < levels; i++) {
    siblings.push(ZERO_HASH);
  }

  return siblings.map((s) => s.bigInt());
};

/**
 * auxiliary node
 *
 * @export
 * @beta
 * @interface   NodeAuxValue
 */
export interface NodeAuxValue {
  key: Hash;
  value: Hash;
  noAux: string;
}

export /**
 * gets auxiliary node from proof
 *
 * @param {(Proof | undefined)} p - mtp
 * @returns NodeAuxValue
 */
const getNodeAuxValue = (p: Proof | undefined): NodeAuxValue => {
  // proof of inclusion
  if (p?.existence) {
    return {
      key: ZERO_HASH,
      value: ZERO_HASH,
      noAux: '0'
    };
  }

  // proof of non-inclusion (NodeAux exists)
  if (p?.nodeAux?.value && p?.nodeAux?.key) {
    return {
      key: p.nodeAux.key,
      value: p.nodeAux.value,
      noAux: '0'
    };
  }
  // proof of non-inclusion (NodeAux does not exist)
  return {
    key: ZERO_HASH,
    value: ZERO_HASH,
    noAux: '1'
  };
};

/**
 * converts boolean existence param to integer
 * if true - 1, else - 0
 *
 * @param {boolean} b - existence
 * @returns number
 */
export const existenceToInt = (b: boolean): number => (b ? 0 : 1);

/**
 * return object properties
 *
 * @export
 * @param {object} obj
 * @returns object
 */
export function getProperties(obj: object): object {
  const result: object = {};
  for (const property in obj) {
    // eslint-disable-next-line no-prototype-builtins
    if (obj.hasOwnProperty(property) && !property.startsWith('_')) {
      result[property] = obj[property];
    }
  }
  return result;
}
