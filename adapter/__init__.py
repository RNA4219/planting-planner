from __future__ import annotations
import sys
from collections import Counter
from collections.abc import Callable, Hashable, Mapping, Sequence
from dataclasses import dataclass
from types import MappingProxyType, ModuleType
from typing import Any, Dict, Generic, MutableMapping, TypeVar
__all__ = ["AggregationError", "AggregationStrategy", "MajorityVoteStrategy", "ProviderRegistrationError", "ProviderRegistry", "ProviderSpec", "registry"]
class AdapterError(RuntimeError): ...
class AggregationError(AdapterError): ...
class ProviderRegistrationError(AdapterError): ...
T = TypeVar("T")
K = TypeVar("K", bound=Hashable)
class AggregationStrategy(Generic[T]):
    def aggregate(self, responses: Sequence[T]) -> T: raise NotImplementedError
    def __call__(self, responses: Sequence[T]) -> T: return self.aggregate(responses)
class MajorityVoteStrategy(AggregationStrategy[T]):
    def __init__(self, *, key: Callable[[T], K] | None = None, tie_breaker: Callable[[Sequence[T]], T] | None = None) -> None:
        self._key = key or (lambda item: item)  # type: ignore[assignment]
        self._tie_breaker = tie_breaker
    def aggregate(self, responses: Sequence[T]) -> T:
        if not responses: raise AggregationError("cannot aggregate an empty sequence")
        counts: Dict[K, int] = Counter(self._key(item) for item in responses)
        max_count = max(counts.values())
        winners = {key for key, value in counts.items() if value == max_count}
        for item in responses:
            if self._key(item) in winners: return item
        if self._tie_breaker is not None: return self._tie_breaker(responses)
        raise AggregationError("unable to resolve majority vote tie")
@dataclass(frozen=True)
class ProviderSpec:
    name: str
    factory: Callable[..., Any]
    metadata: Mapping[str, Any] | None = None
    aggregation_strategy: AggregationStrategy[Any] | None = None
    def __post_init__(self) -> None:
        if self.metadata is not None and not isinstance(self.metadata, Mapping): raise TypeError("metadata must be a mapping")
class ProviderRegistry:
    def __init__(self) -> None:
        self._providers: MutableMapping[str, ProviderSpec] = {}
    def register(self, spec: ProviderSpec, *, override: bool = False) -> None:
        if spec.name in self._providers and not override: raise ProviderRegistrationError(f"provider '{spec.name}' is already registered")
        self._providers[spec.name] = spec
    def register_factory(self, name: str, factory: Callable[..., Any], *, metadata: Mapping[str, Any] | None = None, aggregation_strategy: AggregationStrategy[Any] | None = None, override: bool = False) -> ProviderSpec:
        spec = ProviderSpec(name, factory, metadata, aggregation_strategy)
        self.register(spec, override=override)
        return spec
    def get(self, name: str) -> ProviderSpec:
        try: return self._providers[name]
        except KeyError as exc: raise KeyError(f"provider '{name}' is not registered") from exc
    def names(self) -> tuple[str, ...]: return tuple(sorted(self._providers))
    def as_mapping(self) -> Mapping[str, ProviderSpec]: return MappingProxyType(dict(self._providers))
registry = ProviderRegistry()
def _module(name: str) -> ModuleType:
    module = ModuleType(name)
    sys.modules[name] = module
    return module
core = _module("adapter.core")
core.AggregationError = AggregationError
core.ProviderRegistry = ProviderRegistry
aggregation = _module("adapter.core.aggregation")
aggregation.AggregationError = AggregationError
aggregation.AggregationStrategy = AggregationStrategy
_module("adapter.core.aggregation.builtin")
majority_vote = _module("adapter.core.aggregation.builtin.majority_vote")
majority_vote.MajorityVoteStrategy = MajorityVoteStrategy
majority_vote.__all__ = ["MajorityVoteStrategy"]
_module("adapter.core.providers")
providers_registry = _module("adapter.core.providers.registry")
providers_registry.ProviderRegistry = ProviderRegistry
providers_registry.ProviderSpec = ProviderSpec
providers_registry.ProviderRegistrationError = ProviderRegistrationError
providers_registry.registry = registry
providers_registry.default_registry = registry
providers_registry.__all__ = ["ProviderRegistry", "ProviderSpec", "ProviderRegistrationError", "registry", "default_registry"]
