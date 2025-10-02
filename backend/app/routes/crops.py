from __future__ import annotations

from fastapi import APIRouter

from .. import schemas
from ..dependencies import ConnDependency

router = APIRouter(prefix="/api/crops")


@router.get("", response_model=list[schemas.Crop])
def list_crops(conn: ConnDependency) -> list[schemas.Crop]:
    rows = conn.execute("SELECT id, name, category FROM crops ORDER BY name").fetchall()
    return [schemas.Crop(id=row["id"], name=row["name"], category=row["category"]) for row in rows]
