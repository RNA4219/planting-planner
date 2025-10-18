# v0.3.3 現場補助 – 設計

## フロー

1) 起動→オンライン→対象 API をリージョン単位で取得
2) `queryClient.setQueryData` → IndexedDB('prefetch') へ保存
3) オフライン時は prefetch ヒットを優先

## 擬似コード

```ts
const { quota, usage } = await navigator.storage.estimate();
if (quota && usage && quota - usage < 10*1024*1024) { /* 追い出し */ }
```
