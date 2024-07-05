# ログインの手動テスト方法

## 事前準備

### 環境変数設定
.env.localに `MAGIC_SECRET_KEY` `MAGIC_API_KEY` `MORALIS_API_KEY` を設定する  
それぞれ1passwordからMagic、Moralisの管理画面にログインし確認してください。

### DB設定

GameCenterを登録しておく。

## サーバー起動

2つのターミナルでそれぞれ以下のコマンドを実行

```bash
# terminal 1 FrontEnd Mock
yarn login-server
```

```bash
# terminal 2 BackEnd
yarn start
```

## 手順

ブラウザで [FrontEndMock](http://localhost:4001) にアクセス  
Magicによるメールアドレスログインがされていない場合、メアド入力画面へ遷移する  
メアドを入力してSubmit→メールのリンククリックでブラウザに戻ってくるとMagicはログイン状態になっている  

BackEndのloginクエリを叩くために `API Login` のボタンを押す。  
正しくMagicにログインできていれば、`{"data":{"login":{"login":true,"user":{"id":"0ff83a12-e3cd-43e9-8ab1-0169ea9a8d41"}}}}` のような文字列が表示される  
この時、`login:false` が返ってきている場合、ユーザーが存在しない状態です。  
名前を入力して `CreateUser` ボタンを押してユーザーを作成してください。

BackEndもログインしている状態になったら、GameCenterIDを入力して `Request` ボタンを押すと `listPlacementArcadeMachines` を叩いた結果が表示される

