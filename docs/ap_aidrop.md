# Arcade Partsをaidrop (配布)する方法

## CSVを用意する

AP配布の必要なデータ項目をCSVファイルに入れ込みます。下記のカラムを指定できます：
1. ownerWalletAddress -- 配布先のウォレットアドレス
2. category (任意) -- パーツのカテゴリ (例：LOWER_CABINET)
3. subCategory (任意) -- パーツのサブカテゴリ (例：MERCURY)
4. id (任意) -- 新規のNFTに使うToken ID

## 未指定のカラムを自動生成する

ownerWalletAddressを含んだ`example.csv`を処理する：

```
yarn aidrop-ap example.csv
```

本番の実行は上記の全てのカラムが必要ですが、ownerWalletAddress以外のカラムが定義されていない場合、そのカラムが自動生成され、新規のCSVファイルとして保存されます。デフォルトな新規ファイル名は`output.csv`になります。

## StagingまたはProduction環境のDBに接続します
[ここ参照](./docs/stg_db_access_from_local.md)

## 配布を行う

全てのカラムが揃えているCSVファイルを処理します。例として`output.csv`を使います。

```
yarn aidrop-ap output.csv
```
Token IDが指定されているため、重複なAPが作成される恐れはありません。