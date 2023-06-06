[English README is here](https://github.com/cIel104/mizar_api/blob/main/README.md)
# mizar_api
* WebAPIを用いたMizarのリモート検証環境
# メモ
* このAPIは現在開発中です
* Cドライブ直下にリポジトリをクローンしてください(修正予定)
* レスポンスデータはJSON形式のみ対応しています
# 機能
* 検証プログラムを実行するAPI
  * リクエスト  
  リクエストボディにJSON形式の文字列を指定してください  
    http://localhost:3000/api/v0.1/verifier
  
    |パラメータ|内容|
    |:---:|:---:|
    |fileName|Mizarファイル名|
    |url|MizarファイルのあるGitHubリポジトリのURL|
    |branch|現在のブランチ|
    |command|実行するコマンド|
  * レスポンス
  
    |パラメータ|内容|
    |:---:|:---:|
    |ID|DBのインデックス|

* 検証結果を取得するAPI
  * リクエスト  
  パスパラメータにIDを追加してください  
    http://localhost:3000/api/v0.1/verifier/{ID}

  * レスポンス
  
    |パラメータ|内容|
    |:---:|:---:|
    |progressPhase|現在の検証段階|
    |progressPercent|現在の検証段階の進捗率|
    |isMakeenvFinish|makeenvの終了判定|
    |isMakeenvSuccess|makeenvの成功判定|
    |isVerifierFinish|verifierの終了判定|
    |isVerifierSuccess|verifierの成功判定|
    |numOfErrors|エラーの個数|
    |errorList|行番号、列番号、エラータイプ、エラーメッセージを含む配列|
    |makeenvText|mizarのバージョンなどが記載されている文字列|
    
* インデント修正API  
  * リクエスト
  リクエストボディにJSON形式の文字列を指定してください
    http://localhost:3000/api/v0.1/formatter
    
    |パラメータ|内容|
    |:---:|:---:|
    |fileName|Mizarファイル名|
    |url|MizarファイルのあるGitHubリポジトリのURL|
    |branch|現在のブランチ|
    
  * レスポンス

    |パラメータ|内容|
    |:---:|:---:|
    |fileContent|インデントされたMizarファイル|
