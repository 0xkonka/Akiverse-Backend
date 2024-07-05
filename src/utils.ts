import { globalLogger } from "./logger";
import { createHash } from "node:crypto";

export function compareArrays(a: number[], b: number[]): number {
  // 配列と配列を比較する関数
  // 左から右へ、配列の要素を順序に比較して、左が出たら決まりって感じ。
  // Array.sortのcompareFunctionに合わせるように、
  //  aの方が小さい場合、負数を返却
  //  aとbが同じ場合、0を返却
  //  bの方が小さい場合、正数を返却
  const arrayLength = Math.min(a.length, b.length);
  for (let i = 0; i < arrayLength; i++) {
    if (a[i] < b[i]) return -1;
    if (a[i] > b[i]) return 1;
  }
  return a.length - b.length;
}

export function makeCompare<T>(
  toArray: (a: T) => number[],
): (a: T, b: T) => number {
  return (a: T, b: T): number => {
    return compareArrays(toArray(a), toArray(b));
  };
}

export function groupBy<T>(items: T[], keyFn: (item: T) => any): T[][] {
  // pythonのitertools.groupbyを参照:
  // https://docs.python.org/ja/3/library/itertools.html#itertools.groupby
  const groups: T[][] = [];
  let key: any;
  let currentGroup: T[] | null = null;
  for (const item of items) {
    const itemKey = keyFn(item);
    if (currentGroup?.length && key === itemKey) {
      currentGroup.push(item);
    } else {
      currentGroup?.length && groups.push(currentGroup);
      currentGroup = [item];
      key = itemKey;
    }
  }
  currentGroup?.length && groups.push(currentGroup);
  return groups;
}

export async function serialFilter<T>(
  fn: (item: T) => Promise<boolean>,
  items: T[],
): Promise<T[]> {
  const result: T[] = [];
  for (const item of items) {
    const itemResult = await fn(item);
    if (itemResult) result.push(item);
  }
  return result;
}

export const error = (params: Object) => {
  globalLogger.error(params);
};

export const info = (params: Object) => {
  globalLogger.info(params);
};

export const warn = (params: Object) => {
  globalLogger.warn(params);
};
export function randomBigInt(): BigInt {
  let result = BigInt(0);
  for (let i = 0; i < 4; i++) {
    result *= BigInt(65536);
    result += BigInt(Math.floor(Math.random() * 65536));
  }
  return result;
}

export function choice<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export function choiceMultiple<T>(items: T[], n: number): T[] {
  // itemsからn個のアイテムを選択する
  if (n > items.length) {
    throw Error("array is too short");
  }

  const result = [];
  for (let i = 0; i < items.length; i++) {
    // 0.02 < 0 - 0 / (100 -1)
    if (Math.random() < (n - result.length) / (items.length - i)) {
      result.push(items[i]);
    }
  }
  return result;
}

/**
 * isWalletAddressEqual.
 * @param a walletAddress
 * @param b walletAddress
 *
 * 両方nullの場合はtrueが返る
 */
export function isWalletAddressEqual(
  a: string | null,
  b: string | null,
): boolean {
  if (a === null && b === null) {
    return true;
  }
  if (a === null || b === null) {
    return false;
  }
  return a.toLowerCase() === b.toLowerCase();
}

export function shuffle<T>(items: T[]): T[] {
  items = items.slice();

  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = items[i];
    items[i] = items[j];
    items[j] = tmp;
  }
  return items;
}

export function getRandomInt(min: number, max: number): number {
  const diff = max - min + 1;
  const random = Math.floor(Math.random() * diff);
  return min + random;
}

export function sum(items: number[]): number {
  return items.reduce((x, y) => x + y, 0);
}

export function parseBoolean(bool: string | undefined): boolean | undefined {
  if (!bool) return undefined;
  const lower = bool.toLowerCase();
  if (lower === "true") {
    return true;
  } else if (lower === "false") {
    return false;
  } else {
    return;
  }
}

export function recordToArray<T>(records: Record<any, T>): T[] {
  const ret = [];
  for (const key in records) {
    ret.push(records[key]);
  }
  return ret;
}

export function asPartial<T extends object>(record: T): Partial<T> {
  // recordのキーの内、値がfalsyのキーを除く
  const result: Partial<T> = {};
  for (const key of Object.keys(record) as Array<keyof T>) {
    const value = record[key];
    if (value) {
      result[key] = value;
    }
  }
  return result;
}

export function sha256(message: string): string {
  return createHash("sha256").update(message).digest("hex");
}
