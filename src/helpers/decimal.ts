import { Prisma } from "@prisma/client";
/**
 * 整数部を指定桁数で切り捨てして返します
 * valueが指定桁数より小さい場合処理できないため例外を返します
 * @param value
 * @param digits
 */
export function floorDecimalToIntegerValue(
  value: Prisma.Decimal,
  digits: number,
): Prisma.Decimal {
  if (digits < 0) {
    throw new Error("digits must be greater than 0");
  }

  const integerPart = value.trunc(); // 整数部を取得
  const integerDigits = integerPart.toString().length; // 整数部の桁数を取得

  if (digits >= integerDigits) {
    throw new Error("Digits must be less than the number of integer digits.");
  }

  const factor = new Prisma.Decimal(10).pow(digits); // 10のdigits乗を計算
  return integerPart.divToInt(factor).mul(factor); // 整数部を切り捨て
}
