WORD EXPLORER — Cloud + Map + Bulk Search
=========================================
GitHub Pagesに以下の11ファイルを同じ階層にアップロードしてください。
  index.html
  about.html
  style.css
  graph.css
  cloud.css
  updates.css
  word-families.js
  difficulty.js
  app.js
  graph.js
  cloud.js

使い方：
1. Single Word：1語ずつ検索（入力後に自動検索／Enterも可）。
2. Bulk Search：Googleスプレッドシートの1列（最大20語）を貼り付けて「EXPLORE WORD LIST」を選択。
   - 1行に英単語1語、改行区切り。
   - 重複は除外。
   - Previous / Next または語句ボタンで、検索結果を1語ずつ閲覧。
   - 全20語を同時リクエストするのではなく、表示語だけ取得（再訪問はページ内キャッシュ）。
3. 各カテゴリは最大3項目。単語をクリックしてコピーできます。
4. Word Cloud / Word Mapを切り替えられます。

難易度について：
- 英検3級などの公式語彙リストを搭載しているわけではありません。
- 基本語彙の手動リスト、その他はDatamuseから受け取れる頻度情報等を参考にした推定順位です。
- 常に教科書本文の意味と一致するとは限らず、意味・語義ごとの難易度保証もありません。
- Word Mapでは各カテゴリの中心側から外側へ順に表示します。
- Word Cloudの位置や文字サイズも直感的な参考表示であり、厳密な級別を表しません。
- 収録済み語形グループのみWord Familyに表示。

技術上の注意：
- データは外部のFree Dictionary APIとDatamuse APIを通信で取得します。ネット接続が必要。
- GitHubにAPIキーを公開してはいけません。Datamuseの利用条件が変わる場合、バックエンド移行が必要です。
- 生徒の情報を収集せず、スプレッドシートへの書き込みも行いません。
- ブラウザの基本動作はモックAPIで確認済み。実API通信はGitHub公開後の現地テストが必要です。
- Word Partnersは統計的な候補であり、文法・自然さの保証はありません。
