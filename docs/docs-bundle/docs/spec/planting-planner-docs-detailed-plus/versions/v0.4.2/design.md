# v0.4.2 i18n – 設計

## Provider

- ルートに I18nProvider を追加、`t(key, params?)` を提供

## 検査

- ESLint でハードコード文字列検出（許容リストあり）
- スクリプトで `en.json` / `ja.json` のキー差分をチェック（CI 失敗）

## テスト

- E2E: 言語固定/切替/辞書ロード失敗
- Visual regression: 英語での伸長崩れをスクショ差分で検出
