---
name: ui-design
description: >
  UIデザインのベストプラクティスとこのプロジェクトのデザインルール。
  フロントエンドのUI実装・レビュー・改善時に参照する。
triggers:
  - UIを改善
  - デザイン
  - スタイル
  - CSS
  - 見た目
  - レイアウト
---

# UIデザインガイド

`apps/web` の UI 実装に適用するデザインルール。Tailwind CSS v4 + shadcn/ui を前提にする。

テンプレートから作ったアプリは「0. このアプリのデザイン」にブランドと方針を書く。
それ以外の節はアプリをまたいで共通。

---

## 0. このアプリのデザイン

- **トーン**：大質量星の内部を覗く観測装置のパネル。数値と状態を密に見せるが、星の断面だけは大きく美しく描く
- **テーマ**：ダーク1種類だけ（星の内部という1つの世界に固定する）。ライトテーマは作らない
- **モバイルファースト**：幅 390px で横スクロールを出さない。広い画面では「星と計器」と「燃焼カード」の2列
- **色**：背景は紫がかった黒。強調色は点火の琥珀色1色だけで、点火・崩壊・次の目標にだけ使う。
  元素ごとの色（H, He, C, O, Ne, Mg, Si, S, Fe）はトークン `--el-h` などで定義し、玉ねぎ構造・チップ・周期表で同じ色を使う
- **フォント**：見出しは Dela Gothic One、本文は Zen Kaku Gothic New、数値は IBM Plex Mono（`tabular-nums`）。
  日本語フォントは画面に出す文字だけに絞って同梱している（`apps/web/scripts/build-fonts.mjs`）。
  文字を足して `src/fonts.test.ts` が落ちたら `npm run fonts -w @app/web` で作り直し、できたファイルもコミットする
- **数の書き方**：大きな数は `1.23×10⁴⁵ J` のように仮数2桁＋上付きの指数。単位は J、K、M☉ を必ず付ける
- **動き**：点火と超新星だけを演出する（`prefers-reduced-motion` では止める）。それ以外は静かに保つ

---

## 1. デザイントークン

### 色はトークンでだけ使う

色は `apps/web/src/index.css` の `:root` / `.dark` に CSS 変数として定義し、`@theme inline` で
Tailwind のユーティリティに結びつけてある。

- コンポーネントでは `bg-primary` `text-muted-foreground` `border-border` などのユーティリティを使う
- **色のハードコード（`#e94560`、`bg-[#...]`、`text-red-500`）は禁止。** 足りない色はトークンを足す
- ブランドの色はトークンの値を差し替えて変える。コンポーネントは触らない

| トークン | 用途 |
|---|---|
| `background` / `foreground` | ページの背景と本文 |
| `card` / `card-foreground` | カード・セクション |
| `popover` | ポップオーバー・メニュー |
| `primary` | 主要なアクション（1画面に1つが理想） |
| `secondary` | 二次的なアクション |
| `muted` / `muted-foreground` | 補助テキスト・無効な領域 |
| `accent` | ホバー・選択中の強調 |
| `destructive` | 削除・エラー |
| `border` / `input` / `ring` | 枠線・入力欄・フォーカスリング |

### コントラストを測って残す

トークンを決めたら、主要な組み合わせのコントラスト比を測り、この節に表で残す（WCAG AA は本文 4.5:1 以上）。

このアプリの測定値（`apps/web/src/index.css`）:

| 組み合わせ | 比 | 用途 |
|---|---|---|
| `foreground` / `background` | 16.5 | 本文 |
| `foreground` / `card` | 15.5 | カードの本文 |
| `muted-foreground` / `background` | 7.6 | 補助テキスト |
| `muted-foreground` / `card` | 7.1 | カードの補助テキスト |
| `muted-foreground` / `popover` | 6.6 | 知らせ |
| `ignite` / `card` | 10.2 | 点火・崩壊・次の目標 |
| `ignite` / `muted` | 9.6 | 目標の行 |
| `primary-foreground` / `primary` | 10.2 | 次の星を生むボタン |
| `ring` / `background` | 9.7 | フォーカスリング |
| `input` / `card` | 3.7 | 入力欄・outline ボタンの枠 |
| `background` / `el-*` | 5.4（Fe）〜15.2（He） | 元素チップ・周期表の文字 |

鉄の色は試作の `#8a5a44` だと元素チップの文字が 3.4 しかなかったため、`#b07a5e` に明るくした。

### 角丸・余白・文字

- 角丸は `--radius` から派生する `rounded-sm` / `rounded-md` / `rounded-lg` / `rounded-xl` だけを使う
- 余白は Tailwind の 4px 刻み（`p-1` = 4px）。中途半端な値（`p-[13px]`）を使わない
- 本文は 16px（`text-base`）。**入力欄は 16px 以上**（iOS Safari が入力時にズームするのを防ぐ）

---

## 2. ダークテーマのルール

- `<html class="dark">` で切り替える（`@custom-variant dark` 定義済み）
- ダークテーマでは影が見えにくいため、より明るい背景色で「浮き」を表現する（`background` → `card` → `popover`）
- `shadow` より `border` で区切る方が効果的
- 純白テキスト・純黒背景を避ける。トークンの値で調整する
- 彩度の高い色は小面積に限定する

---

## 3. タイポグラフィ

| 用途 | クラス | weight |
|---|---|---|
| ページタイトル (h1) | `text-2xl sm:text-3xl` | `font-bold` |
| セクション見出し (h2) | `text-xl` | `font-bold` |
| カード見出し (h3) | `text-base` | `font-semibold` |
| 本文 | `text-base` | 400 |
| 補助テキスト | `text-sm text-muted-foreground` | 400 |
| ラベル・キャプション | `text-sm` | `font-medium` |

- 見出しのレベルを飛ばさない（h1 → h3 にしない）

---

## 4. コンポーネントルール

### 部品は shadcn/ui から足す

- ボタン・入力・ダイアログなどは shadcn/ui を `npx shadcn@latest add <name>` で `src/components/ui/` に追加する
- 生成物は自分のコードとして扱ってよいが、**見た目の調整はトークンの差し替えで済ませる**のを優先する
- 同じ見た目の部品を features ごとに作り直さない

### ボタン

- **最小タッチターゲット 44x44px**（Apple HIG / WCAG 2.2）。小さいボタンは余白で当たり判定を広げる
- primary は1画面に1つが理想。二次的な操作は `variant="outline"` / `"ghost"`
- 処理中は `disabled` にし、ラベルを「保存中…」などに変えて二重送信を防ぐ
- 押下のフィードバック（`active:scale-[0.97]`）を付ける

### 入力フィールド

- 高さ 44px 以上、文字 16px 以上
- `<label htmlFor>` で必ず紐づける。プレースホルダをラベルの代わりにしない
- エラーは入力欄の下にテキストで出し、`aria-invalid` と `aria-describedby` で紐づける

### ダイアログ

- shadcn/ui の Dialog（Radix）を使う。フォーカストラップと Esc での閉じを自前で書かない
- タイトルを必ず持たせる（`DialogTitle`）

### エラー・成功メッセージ

- `role="alert"`（エラー）/ `role="status"`（成功・進捗）でスクリーンリーダーに通知する
- 色だけで伝えない。必ずテキストを添える

### ローディング状態

- 一瞬で終わる処理にスピナーを出さない（ちらつく）。300ms 以上かかりそうなものだけ
- 一覧などはスケルトン（`animate-pulse` の灰色ブロック）を推奨

---

## 5. レスポンシブデザイン

- **モバイルファースト。** 素のクラスはモバイル向けに書き、`sm:` `md:` で広い画面を足す
- 本文のコンテナは `max-w-xl`〜`max-w-3xl` 程度に抑え、左右に `px-4` を取る
- タッチデバイスではタッチターゲット 48px を推奨。隣り合うターゲットは 8px 以上離す
- 画面の高さには `min-h-svh` を使う（モバイルのアドレスバーで `vh` がずれるため）

---

## 6. アクセシビリティ

### WCAG AA 必須要件

| 要素 | 最小コントラスト比 |
|---|---|
| 通常テキスト (<18px, <14px bold) | 4.5:1 |
| 大テキスト (>=18px or >=14px bold) | 3:1 |
| 非テキスト（UI部品、アイコン、ボーダー） | 3:1 |
| フォーカスインジケーター | 3:1 |

### フォーカス

- フォーカスリングを消さない（`outline-none` だけを付けない）。shadcn/ui の `focus-visible:ring-*` を残す
- キーボードだけで全操作ができること

### セマンティック HTML

- エラー表示には `role="alert"`
- リストは `<ul>` + `<li>`、ナビゲーションは `<nav>`、本文は `<main>`
- アイコンだけのボタンには `aria-label` か `sr-only` のテキスト
- テストは `getByRole` で書く（.claude/skills/coding-standards.md）。role で取れない UI はアクセシブルでない

### 色だけに頼らない

- ステータスは色 + テキスト（またはアイコン）
- 色覚多様性を考慮し、赤/緑の対比だけで区別しない

---

## 7. トランジション・アニメーション

| 操作 | 時間 | イージング |
|---|---|---|
| 色変化（ホバー） | 150ms | ease-out |
| 浮き上がり（ホバー） | 150ms | ease-out |
| ボタン押下 | 50ms | ease-out |
| モーダル表示 | 200ms | ease-out |
| モーダル非表示 | 150ms | ease-in |

- アニメーションするプロパティは明示する（`transition-all` は避け、`transition-colors` / `transition-transform`）
- GPU で処理できる `transform` / `opacity` を優先し、`width` `height` `margin` を動かさない
- `prefers-reduced-motion` を尊重する（`motion-safe:` / `motion-reduce:` を使う）
