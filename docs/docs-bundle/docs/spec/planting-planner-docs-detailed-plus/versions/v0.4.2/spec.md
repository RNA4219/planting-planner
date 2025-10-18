# v0.4.2 i18n – 仕様

## キー命名

- `screen.<name>.<part>` / `common.<term>` / `action.<verb>`
- 例: `screen.dashboard.title`, `action.refresh`, `common.region`

## ロケール決定

1) URL (?lang) → 2) localStorage → 3) navigator.language

## 実装

- `import()` で辞書 JSON を遅延ロード
- フォールバック: current → en → ja

## 文言長の扱い

- ボタン: 2 行まで折返し。超過は ellipsis + title ツールチップ
- テーブル: 見出しは固定幅 + ellipsis、セルは `minmax(0,1fr)`
