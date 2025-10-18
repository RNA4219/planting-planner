# Feature Flags

## WEATHER_TAB

- 既定: on
- 読み取り順序:
  1. `FEATURE_FLAGS.WEATHER_TAB`
  2. `__APP_FEATURE_FLAGS__.WEATHER_TAB`
  3. `VITE_FEATURE_WEATHER_TAB`
  4. 既定値
- 説明:
  - 天気タブを表示する。既定では常に有効。
  - 文字列は `on/true/1/yes` 系で有効化。

## I18N_EN

- 既定: off
- 読み取り順序:
  1. `FEATURE_FLAGS.I18N_EN`
  2. `VITE_I18N_EN`
  3. 既定値
- 説明:
  - 英語辞書を読み込む。既定は日本語のみ。
  - `true` を明示した場合でも `?lang=en` 指定時のみ英語辞書を選択し
    （`frontend/src/constants/messages.ts` を参照）。
  - 未指定時は日本語に戻る（`frontend/src/components/RegionSelect.tsx`
    の条件分岐を参照）。

## SW_FORCE_UPDATE

- 既定: off
- 読み取り順序:
  1. `VITE_SW_FORCE_UPDATE`
  2. `SW_FORCE_UPDATE`
  3. 既定値
- 説明:
  - 次回セッションで SW を強制更新。
  - `true` にした場合のみ、更新トーストを閉じるには「今すぐ更新」が
    必須。
