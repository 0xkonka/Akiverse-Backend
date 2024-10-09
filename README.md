# akiverse-backend

Akiverseのバックエンドです。
大まかに実装済みの所：
  - DBのSchema (prisma)
  - graphqlのAPI (typegraphql-prisma)
  - ウェブサーバー (apollo-server)
以下のコマンドを実行するとサーバーを起動できます：
```
cp ./env_examples/env ./.env.local # UT実行時にPrismaが読み込んでしまうので「.env」ファイルは作らないように注意
vi ./.env.local # DATABASE_URLを必要に応じて書き換えてください
yarn install # 実行前にPersonal access tokensを環境変数に設定する必要あり（下記参照）
docker compose up -d database s3 s3init
yarn generate
yarn db:migrate:dev
yarn start
```

※Personal access tokensの設定方法  
privateリポジトリを読み込むため、GitHubでPersonal access tokensの発行を行い、環境変数に設定する必要があります。
1. GitHubでトークンを発行する ※一度発行すると再度確認できないので忘れないようにコピーする  
参考：[個人用アクセス トークンの作成](https://docs.github.com/ja/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token#personal-access-token-classic-%E3%81%AE%E4%BD%9C%E6%88%90)
2. 環境変数にトークンを設定する
名前：NODE_AUTH_TOKEN
値　：生成したトークン
3. コマンドライン再起動

dockerを利用しない場合はローカルにPostgreSQLを入れて `docker compose up -d database` をSkipすれば動きます。

UTは以下の初回準備が必要です
```
cp ./env_examples/env.test ./.env.test
vi ./.env.test # DATABASE_URLを必要に応じて書き換えてください

# Test用のスキーマを作成する
# docker利用の場合
docker compose exec database psql -U akiverse

# ローカルのPostgreSQL利用の場合は以下
# psql -U akiverse

# PostgreSQLに対してDB作成コマンド実行
create database akiverse_test;
\q

# マイグレーション
yarn setup-test-db

＃ Firebaseセットアップ
yarn global add firebase-tools
```
その後はDBスキーマに変更がなければ `yarn test` でテスト実行できます。
※ 「.env」という名前のファイルがあるとUT実行時にPrismaが読み込んでしまうので、実行前に削除してください。

### インテグレーションテスト
ユニットテストに加えて、インテグレーションテストも存在します。これらのテストは`yarn test`で実行されませんが、`yarn test-all`で実行されます。
インテグレーションテストを起動するには、まず
```
yarn testchain
```
を起動します。これはローカルのポリゴンブロックチェーンのプロセスです。ブロックチェーンを立ち上がったら、別のタブでテストを実行します：
```
yarn test-all
```

## 命名規則
### SQL(schema.prisma)
- テーブル名：小文字のスネークケースの英語の複数形。例：`arcade_machines`
- カラム名：小文字のスネークケースの英語。例：`token_id`
- データ型：小文字のスネークケースの英語の単数形。例：`token_id`
- Enumの値は大文字のアッパースネークケース。例：`BUBBLE_ATTACK`
- フィールド名：キャメルケースの単数形。例：`tokenId`
- リレーションフィールド名：キャメルケース。1対1の場合は単数形。1対nの場合は複数形。例：`gameCenter` `arcadeMachines`

注意：フィールド名が生成されるTypeScriptの変数名になります。   
フィールド名とカラム名が一致しないので、`schema.prisma`にて`@map`や`@@map`を使って指定してください。

### TypeScript
- Enumの値： 大文字のアッパースネークケース。例：`BUBBLE_ATTACK`
- 文字列リテラルのユニオン型の値：大文字のアッパースネークケース。例：`BUBBLE_ATTACK`

## ディレクトリ構成

サーバー・バッチ処理ともにtypescriptで書かれており、緩いmonorepo運用をしています。  
ディレクトリ構成で共通利用ソースと専用利用を区分けします。

### エントリーポイント並びに専用利用ソースコードの配置

```
# recommend
src/apps/{app_name}/index.ts
# or Temporary Permit
src/apps/{app_name}/{app_name}.ts
```

そのアプリケーションでのみ利用される資産はこのディレクトリ内に配置する。  
例えば、serverアプリケーションのCORSロジックやresolver層のソースコードなどは `src/apps/server/apis`などに配置する。

### 使い捨てやテスト用のスクリプトの配置

このディレクトリ配下に配置されたtsファイル群はAWS環境で動くDockerイメージには含まれません。ビルドもされません。

```
src/temp_scripts/...
```

### 共通利用のソースコード配置

基本的には `src/apps` `src/temp_scripts` 以外は共通利用のコード群です。  
いずれは `src/libs` ディレクトリ配下に移動して明示的に共通利用とわかるようにしたい。  
use_casesとhelpersの用途が混在しているところがありますが、基本的にはhelpersはビジネスロジックを書き、use_casesはビジネスロジックの呼び出し処理が書かれる想定です。

### デプロイ設定

`deploy/{env}/{role}` 配下に設定を入れてデプロイしています。  
中にはFluentBitのconfファイル、ECSのタスク定義テンプレート、非常駐バッチのスケジュール設定が入っています。  
実際のデプロイ処理は `.github/workflows/{env}.yml` を調べてください

## yarn scriptでts-node前にdotenv -e .env.localを実行している理由

テスト実行時は.env.testのみを読み込んで実行していますが、Prismaがデフォルトで.envファイルを読み込んでしまうので、.envだけに記載されている環境変数があるとテスト実行時に読み込まれてしまいます。  
.envファイルを利用せずにyarn scriptで.env.localを読み込んでから実行することでテスト実行時とデバッグ時で予期しない環境変数の読み込みを防止しています。

[Prismaの環境変数仕様](https://www.prisma.io/docs/guides/development-environment/environment-variables#how-does-prisma-use-environment-variables)

[関連するissue](https://github.com/prisma/prisma/issues/18239)

## 本リポジトリーのテーブル
[ここ参照](./prisma/schema.prisma)

## メアドログインの検証手順
[ここ参照](./docs/login_test.md)

## ローカルからSTG環境のDBにアクセスしたいとき
[ここ参照](./docs/stg_db_access_from_local.md)

## APをエアドロップしたいとき
[ここ参照](./docs/ap_aidrop.md)

## 画像アップロード結果の確認

ローカルではminioでS3をモックしています  
[こちらのURL](http://localhost:9001/)にアクセスし、  
- ID: minioroot
- password: miniorootpass

でログインすると確認できます  
また、AWS CLIでアクセスしたい場合は以下の手順を行ってください

```shell
echo '[minio]                                                                                                                                                            17:45:10
aws_access_key_id = minioroot
aws_secret_access_key = miniorootpass' >> ~/.aws/credentials 

echo '
[profile minio]
endpoint_url=http://localhost:9000
' >> ~/.aws/config
```

こちらを行うことで`aws s3 ls image-bucket --profile=minio`でアクセスできるようになります

## 定期開催のトーナメントデータ投入方法

SQLの生成スクリプトを用意しています  
投入済みのデータとのバッティングの考慮が大変なのでSQL文を出力後にチェックしてからSQLを手動実行してください  
カレントディレクトリ配下にtournament_query_yyyy-mm-dd〜.sqlの形で出力されます  
できたSQLを投入してください

```shell
yarn create_paid_tournaments_data "2024-06-01" "2025-6-1"
```
