/**
 * Legacy compatibility shim for runners importing the historical test entry.
 * Checklist:
 * - TODO [x] loader.test.ts へ移行完了
 * - TODO [x] controller.test.ts へ移行完了
 * すべて完了したらこのシムを削除し、新しいパスへ更新する。
 */
import './recommendations/__tests__/loader.test'
import './recommendations/__tests__/controller.test'
