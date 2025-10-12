from __future__ import annotations

from fastapi import APIRouter

from .. import schemas
from ..dependencies import CategoryQuery, ConnDependency

router = APIRouter(prefix="/api/crops")


@router.get("", response_model=list[schemas.Crop])
def list_crops(
    category: CategoryQuery = None,
    *,
    conn: ConnDependency,
) -> list[schemas.Crop]:
    clauses: list[str] = []
    params: list[object] = []
    if category is not None:
        clauses.append("category = ?")
        params.append(category)
    where = " WHERE " + " AND ".join(clauses) if clauses else ""
    rows = conn.execute(
        f"SELECT id, name, category FROM crops{where} ORDER BY name",
        params,
    ).fetchall()
    return [
        schemas.Crop(id=row["id"], name=row["name"], category=row["category"]) for row in rows
    ]
