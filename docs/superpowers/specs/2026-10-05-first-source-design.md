# Wikipedia 以外の資料を最初の出典にする 設計書

- 作成日: 2026-10-05
- 状態: レビュー待ち
- 前提: [2026-10-03-source-panel-design.md](./2026-10-03-source-panel-design.md)（以下「出典パネルの spec」）、[2026-10-04-reference-sources-design.md](./2026-10-04-reference-sources-design.md)（以下「Wikipedia 以外の出典の spec」）

## 1. 目的

値を取った資料（最初の出典）は、今は Wikipedia の記事に限っている。Wikipedia は誰でも編集でき、確かめた後に書き換えられることもある。公的機関のページ（王室・政府など）や百科事典・辞典に同じ年が書かれていれば、それを Wikipedia より先に最初の出典にできるようにする。Wikipedia を最初の出典にするときは、確かめた時点の版に固定した URL にする。

## 2. データ（成果物）

形は変えない。

```ts
type Source = { label: string; url: string | null };
```

- 最初の出典は、値を取った資料。公的機関のページ、百科事典・辞典のページ、または Wikipedia の記事（確かめた時点の版に固定した URL）
- 最初の出典の `url` は https の URL（`null` は取らない）。2 つ目からは今までどおり https の URL か `null`
- `label` の例: `英国王室「Henry VII」`、`GOV.UK「Sir Robert Walpole」`、`Wikipedia「クフ」`

## 3. 検証

出典パネルの spec §7・Wikipedia 以外の出典の spec の検証のうち、最初の出典の `url` が Wikipedia でなければ弾く規則を、https の URL でなければ弾く規則に変える。

パネルの見た目と文言は変えない。

## 4. 検証（テスト）

- Vitest: 最初の出典に Wikipedia 以外の https のページを読めること、最初の出典の `url` が `null` や https でない URL なら弾くこと
