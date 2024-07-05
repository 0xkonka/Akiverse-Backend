// 編集済み項目：
// playersを削除
//   (usersを使う)
// sequential_idを全て削除
//   (idを使う)
// walletsを削除
//   users.wallet_addressを追加
// user_money_balancesを削除
//   users.akir_balanceを追加
//   users.akv_balanceを追加
// played_historiesをplaysに名前変更
// plays.game_idを削除
//   plays.arcade_machine_idを追加
// payment_installation_historiesをinstallation_paymentsに名前変更
// is_withdrewを全て削除
//   is_depositedを使う
// arcade_machine_metadatasをarcade_machine_typesに名前変更
// indexing_block_numbersをblock_checksに名前変更
// arcade_parts_metadatasをarcade_part_typesに名前変更
// game_centers.max_installation_sizeをsizeに名前変更
// game_centers.is_playingを削除
//   arcade_machines.in_useを追加

// 質問：
// arcade_machine_typesとgamesは無関係でいいですか？
//    iwataさん, toneさんに聞きます
// GCの中の位置指数なしで良いですか？
//  　はい。まだ追加されていません
// 以下の項目はリポジトリ内のファイルで管理してもいい？
//   games
//   arcade_machine_types
//   arcade_part_types
//   arcade_machine_recipes

//   arcade_parts
//    どんな頻度で増えるかiwataさん, toneさんに聞きます、、わからなそう。


// ユーザー
// NFTの保有者もゲームプレイヤーも兼ねる
Table users {
  id varchar [pk] // magic?moralis?が採番するuid
  created_at datetime [not null]
  updated_at datetime
  
  email varchar [unique, not null]
  name varchar [not null]
  wallet_address varchar [unique, not null]
  akir_balance bigint [not null]
  akv_balance bigint [not null]
}

Table user_balances {
  id varchar [pk] // magic?moralis?が採番するuid
  created_at datetime [not null]
  updated_at datetime
  
  token_type ft_type [not null]
  token_id uuid
  arcade_part_id uuid
  balance bigint [not null]
  transfer_tx_status transaction_status [not null]
}

// ユーザーが保有するなどするtokenの種類。FTのこと
// denkiポイントはここには入らなそうだけど、検討する必要はある
Enum ft_type {
  akv
  akir
  // arcade_part
}

Enum blockchain_filter {
  game_center_transfer
  arcade_machine_transfer
}

// ブロックチェーンのトランザクションステータス
Enum transaction_status {
  not_synced // default
  syncing // トランザクションを確認ができるが、confirmを待っている状態
  confirmed // confirmerがconfirm済み
}

// game_center
Table game_centers {
  id uuid [pk]
  created_at datetime [not null]
  updated_at datetime
  
  owner_address varchar [not null]
  // transfer途中の状態を細かくユーザーに見せるなら必要
  // destination_owner_address varchar 
  token_id bigint [not null]
  name varchar [not null]
  size integer [not null] // AMを設置できる最大数
  
  // BC statuses, BC info
  mint_tx_status transaction_status [not null]
  transfer_tx_status transaction_status [not null]
  deposit_tx_status transaction_status [not null]
  withdraw_tx_status transaction_status [not null]
  is_deposited boolean

  // ↓ 不要かも
  minted_tx_hash varchar [not null]
  transfered_tx_hash varchar
  deposited_tx_hash varchar
  withdrew_tx_hash varchar
}

// game_centerの募集履歴
Table game_center_recruitings {
  id uuid [pk]
  created_at datetime [not null]
  updated_at datetime
  
  game_center_id uuid [ref: > game_centers.id] // 募集の履歴を残すのでN:1
  fee_akir_amount_per_day bigint [not null]
  approval_required boolean // AMを設置するときにGCOの許可が必要か否かのflag。まだ仕様が決まってないので、default: false（不要）ということでOK
  recruit_start_at datetime
  recruit_end_at datetime
}

// arcade_machineがgame_centerに設置料を支払った履歴
Table installation_payments {
  id uuid [pk]
  created_at datetime [not null]
  updated_at datetime
  
  game_center_recruiting_id uuid [ref: > game_center_recruitings.id]
  arcade_machine_id uuid [ref: > arcade_machines.id]
  fee_akir_amount bigint [not null]
  paid_at datetime
  game_center_owner_id varchar [ref: > users.id]
  arcade_machine_owner_id varchar [ref: > users.id]
  
  // BC statuses, BC info
  // note akirをBC上で動かすタイミングとレコード生成やステータス遷移のタイミングを整理する
  created_tx_hash varchar [not null]
  transfer_tx_status transaction_status [not null]
}

// arcade_machine の雛形（mold）。AMの種類
Table arcade_machine_types {
  id uuid [pk]
  created_at datetime [not null]
  updated_at datetime
  
  name varchar [not null]
  required_akir_amount_for_craft bigint [not null] // craftに必要なトークンの量
  required_akv_amount_for_craft bigint [not null] // craftに必要なトークンの量
}

// arcade_machine
Table arcade_machines {
  id uuid [pk]
  created_at datetime [not null]
  updated_at datetime
  
  owner_address varchar [not null]
  arcade_machine_type_id uuid  [ref: > arcade_machine_types.id]
  game_id uuid  [ref: > games.id]
  token_id bigint [not null]
  stored_energy integer [not null] // 貯まっているenergy
  fixed_energy integer [not null] // 使用済みenergy
  in_use boolean [not null] // プレー中
  
  // ↓ note arcade_machine_typeごとに決まるかも？確認中
  max_energy integer [not null]
  
  // BC statuses, BC info
  mint_tx_status transaction_status [not null]
  transfer_tx_status transaction_status [not null]
  deposit_tx_status transaction_status [not null]
  withdraw_tx_status transaction_status [not null]
  is_deposited boolean
}

// arcade_machineの設置履歴
Table arcade_machine_installations {
  id uuid [pk]
  created_at datetime [not null]
  updated_at datetime
  
  arcade_machine_id uuid  [ref: > arcade_machines.id]
  game_center_recruiting_id uuid [ref: > game_center_recruitings.id]
  scholarship_fee_rate int 
  is_auto_extend boolean // 自動延長するしない
  max_increase_of_fee_akir_amount bigint // 自動更新の価格上限。カラム名が微妙なので命名し直す
  install_from datetime
  install_to datetime
}

// game
Table games {
  id uuid [pk]
  created_at datetime [not null]
  updated_at datetime
  
  name varchar
  // TODO 色々カラム追加
}

// playerがgameをplayした履歴
Table plays {
  id uuid [pk]
  created_at datetime [not null]
  updated_at datetime
  
  user_id uuid [ref: > users.id]
  arcade_machine_id uuid [ref: > arcade_machines.id]
  game_center_id uuid [ref: > game_centers.id]
  game_center_owner_id uuid [ref: > users.id]
  earned_akir_amount bigint [not null] // 獲得した全額
  arcade_machine_owner_fee_rate float [not null] // AMOの取り分
  arcade_machine_owner_fee_akir_amount bigint [not null] // AMOが獲得したakirの量
  play_start_at datetime [not null]
  play_end_at datetime
}

// arcade_partsの雛形（mold）。ERC1155。arcade_partsの種類
Table arcade_part_types {
  id uuid [pk]
  created_at datetime [not null]
  updated_at datetime
  
  name varchar [not null]

  // BC statuses, BC info
  mint_tx_status transaction_status [not null]
  
  // ↓ 不要かも
  minted_tx_hash varchar [not null]
}

// arcade_parts。ERC1155でmintされる1つのtoken
Table arcade_part_balances {
  id uuid [pk]
  created_at datetime [not null]
  updated_at datetime
  
  arcade_part_type_id uuid [ref: > arcade_part_types.id]
  token_id bigint [not null]
  balance integer [not null]
  burned_at datetime
  
  // BC statuses, BC info
  mint_tx_status transaction_status [not null]
  transfer_tx_status transaction_status [not null]
  deposit_tx_status transaction_status [not null]
  withdraw_tx_status transaction_status [not null]
  burn_tx_status transaction_status [not null]
  is_deposited boolean

  // ↓ 不要かも
  minted_tx_hash varchar [not null]
  transfered_tx_hash varchar
  deposited_tx_hash varchar
  withdrew_tx_hash varchar
  burned_tx_hash varchar
}

// arcade_parts。ERC-1155でmintされる1つのtoken
// TODO Extract, Fabricate, Downloadあたりの仕様が決まっていないので待ち
// 参考：https://docs.google.com/spreadsheets/d/1W9S6ncrm5WZmW98sqtMfC4-0HUnohGj0XV2FSTsCfdw/edit#gid=201796066
Table arcade_machine_recipes {
  id uuid [pk]
  created_at datetime [not null]
  updated_at datetime
  
  arcade_machine_type_id uuid [ref: > arcade_machine_types.id]
  arcade_part_type_id uuid [ref: > arcade_part_types.id]
}

// block_numberをどこまでみたかを永続化するテーブル
Table block_checks {
  id int [pk]
  block_number int
  filter blockchain_filter [not null]
//  confirmed_block_number int
  created_at datetime [not null]
  updated_at datetime // updated_atが現在時点より極端に遅れていることを見てwatcher, confirmerの死活監視する
}

// note アクティビティの種類など仕様待ち
Table activities {
  id uuid [pk]
  created_at datetime [not null]
  updated_at datetime
}

// akiverseに関わるtransactionのみ保管しておくテーブル。不要かも
// Table transaction_logs {
//   id uuid [pk]
//   created_at datetime
//   updated_at datetime
// }


// ==========================
// クローズドベータでスコープ内だけどこれから考える
// お知らせ
// Table notifications {}
// 画像などパブリックなアセットの共通マスタ
// Table assets {}


// ==========================
// クローズドベータでスコープ外

// Table missions {}
// Table seasons {}
// Table terms {}
// Table game_waitings {}
