interface TargetArea {
  targetArea: string | null;
}

const ignorePrefix = "NON-";
export function filterTargetsByCountryAndExclusion<T extends TargetArea>(
  array: Array<T>,
  country?: string,
): Array<T> {
  return array.filter((value) => {
    // targetArea未指定=全エリア表示対象
    if (!value.targetArea) return true;

    // country が undefined の場合は表示しない
    if (country === undefined) return false;

    // 大文字スペース削除
    const targetArea = value.targetArea.toUpperCase().replaceAll(" ", "");
    //対象国としてマッチさせる文字列
    const upperCountry = country.toUpperCase();
    const split = targetArea.split(",");
    // IgnorePrefixを削除して国のみにしたリスト
    const disableTargetArea = split
      .filter((v) => v.startsWith(ignorePrefix))
      .map((v) => v.replace(ignorePrefix, ""));
    const enableTargetArea = split.filter((v) => !v.startsWith(ignorePrefix));

    // 除外指定のみの場合
    if (enableTargetArea.length === 0) {
      return !disableTargetArea.includes(upperCountry);
    }

    // 除外指定と対象指定が両方設定されている場合、除外指定が優先
    if (disableTargetArea.includes(upperCountry)) {
      return false;
    } else {
      return enableTargetArea.includes(upperCountry);
    }
  });
}
