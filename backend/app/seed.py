"""Legacy compatibility shim for :mod:`app.seed` package.

Checklist:
- Keep imports aligned with :mod:`app.seed` package exports.
- Avoid adding new logic here; implement in ``app/seed/`` modules instead.
- Remove this shim only after all legacy imports migrate to the package.
"""

from __future__ import annotations

from .seed import data_loader, seed, seed_from_default_db, writers

__all__ = ["seed", "seed_from_default_db", "data_loader", "writers"]
