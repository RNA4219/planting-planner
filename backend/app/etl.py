"""レガシー互換用シム: :mod:`app.etl` パッケージの再エクスポート。

このモジュールは段階的移行のために残されています。以下のチェックがすべて
埋まり次第、このファイルは削除できます。

- [ ] 直接 ``app.etl`` を import している箇所を新パッケージへ移行
- [ ] 新パッケージの API 安定化とドキュメント整備
- [ ] ETL Runner まわりの互換シム解消
"""

from __future__ import annotations

from importlib import import_module
from pathlib import Path
from typing import TYPE_CHECKING, Any

__path__ = [str(Path(__file__).with_name("etl"))]
_PACKAGE = import_module(f"{__name__}.etl")

if TYPE_CHECKING:  # pragma: no cover - type checking only
    from .etl import *  # noqa: F401,F403

__all__ = list(getattr(_PACKAGE, "__all__", ()))

for _name in __all__:
    globals()[_name] = getattr(_PACKAGE, _name)


def __getattr__(name: str) -> Any:
    return getattr(_PACKAGE, name)


def __setattr__(name: str, value: Any) -> None:
    setattr(_PACKAGE, name, value)
    globals()[name] = value
