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
    |isMakeenvFinish|Makeenv exit judgment|
    |isMakeenvSuccess|Success determination of makeenv|
    |isVerifierFinish|Verifier exit judgment|
    |isVerifierSuccess|Success determination of verifier|
    |numOfErrors|Number of errors|
    |errorList|An array containing the line number, column number, error type, and error message|
    |makeenvText|String with mizar version, etc.|
* インデント修正API  
