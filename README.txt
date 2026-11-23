WORD EXPLORER — Word Cloud + Word Map（GitHub Pages用）
======================================================

【使い方】
1. 生徒は検索窓に英単語を入力（入力後約0.9秒で検索、Enterも可）。
2. 検索結果の最初にWord Cloudが毎回自動表示されます。
3. 青＝Synonyms、赤＝Antonyms、緑＝Word Family、橙＝Word Partners。
4. 気になる語句をクリックするとコピーされます（ブラウザの許可が必要な場合あり）。
5. 「Word Map」に切り替えると、中央の単語から枝が出る従来の関係図が使えます。
6. 下の各カテゴリ別一覧からもコピーできます。
7. 生徒自身が配布されたGoogleスプレッドシートに入力します。自動保存／クイズ機能はありません。

【GitHub Pagesへのアップロード】
ZIPを解凍し、次の9ファイルすべてをサイトの公開ディレクトリにアップロード／上書きしてください。
index.html, style.css, graph.css, cloud.css, app.js, graph.js, cloud.js, word-families.js, about.html
README.txt はアップロード不要です。
Settings → Pages → Deploy from a branch → main / (root) で公開できます。

【Word Cloudの大きさについて】
文字の大きさは各分類内の候補順位を参考にした簡易表現です。
コーパスの絶対使用頻度・関連度・類義性の厳密な強さを示すものではありません。
一度に最大28候補（各分類最大7件）のうち、重なりなく配置できた語を表示します。
狭い画面ではクラウドを横スクロールできます。

【検索データ】
Free Dictionary API https://dictionaryapi.dev/
Datamuse API https://www.datamuse.com/api/
派生語はword-families.jsの登録グループからのみ抽出します。
Word Partnersは統計的な共起候補であり、必ずしも自然なコロケーションとは限りません。
検索結果は生徒自身で教科書本文の意味に照らして判断してください。
外部APIの通信障害時には検索できないことがあります。

【将来のAPI仕様変更】
Datamuseは2027年2月からAPIキー必須となる予定です（2026年11月時点）。
APIキーは公開するGitHub PagesのJavaScriptに直書きしないでください。
将来は安全なAPI中継や別データ源への変更が必要になる可能性があります。
