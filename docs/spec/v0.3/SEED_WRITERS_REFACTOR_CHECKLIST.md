# SEED writers refactor checklist

- [x] Split `write_crops` into `app.seed.writers.crops.write_crops`
- [x] Split market writer functions into `app.seed.writers.markets`
- [x] Extract growth writer logic into `app.seed.writers.growth`
- [x] Move payload orchestration to `app.seed.writers.payload`
- [x] Keep `app.seed.writers` as compatibility facade with `__all__`
- [ ] Add regression tests covering new modules directly
- [ ] Remove legacy override modules once deprecation period ends
