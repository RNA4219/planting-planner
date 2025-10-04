# 型定義ガイド — v0.2

## バックエンド (Python)
```python
class RefreshState(str, Enum):
    RUNNING = "running"
    SUCCESS = "success"
    FAILURE = "failure"
    STALE = "stale"

class RefreshStatus(BaseModel):
    state: RefreshState
    started_at: datetime | None
    finished_at: datetime | None
    updated_records: int
    last_error: str | None
```
- `updated_records` は 0 以上の整数。
- 花きデータ対応でも既存 Enum を再利用。

## フロントエンド (TypeScript)
```ts
export type Crop = {
  id: number;
  name: string;
  category: string;
  variety?: string;
};

export type RefreshStatus = {
  state: "running" | "success" | "failure" | "stale";
  startedAt: string | null;
  finishedAt: string | null;
  updatedRecords: number;
  lastError: string | null;
};
```
- `SearchFilter` 型を追加し将来の条件拡張に備える。
```ts
export type SearchFilter = {
  keyword: string;
};
```
