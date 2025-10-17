# Feature Flags

| Flag | 既定 | 読み取り順序 | 説明 |
|---|---|---|---|
| WEATHER_TAB | on | `FEATURE_FLAGS.WEATHER_TAB` → `__APP_FEATURE_FLAGS__.WEATHER_TAB` → `VITE_FEATURE_WEATHER_TAB` → 既定値 | 天気タブを表示する。既定では常に有効。文字列は `on/true/1/yes` 系で有効化。 |
| I18N_EN | off | `FEATURE_FLAGS.I18N_EN` → `VITE_I18N_EN` → 既定値 | 英語辞書を読み込む。既定は日本語のみ。`true` を明示した場合でも `?lang=en` 指定時のみ英語辞書を選択し（`frontend/src/constants/messages.ts` を参照）、未指定時は日本語に戻る（`frontend/src/components/RegionSelect.tsx` の条件分岐を参照）。 |
| SW_FORCE_UPDATE | off | `VITE_SW_FORCE_UPDATE` → `SW_FORCE_UPDATE` → 既定値 | 次回セッションで SW 強制更新。`true` にした場合のみ、更新トーストを閉じるには「今すぐ更新」が必須。 |
