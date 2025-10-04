// NOTE: legacy compatibility shim. Remove after downstream imports migrate.
// # TODO [ ] hooks/recommendations/controller.ts を直接参照する
// # TODO [ ] hooks/recommendations/loader.ts を直接参照する

export {
  useRecommendations,
  type UseRecommendationsOptions,
  type UseRecommendationsResult,
  type RecommendationRow,
  useRecommendationLoader,
  type UseRecommendationLoaderResult,
  useCropCatalog,
  type CropCatalogEntry,
  type CropCatalogMap,
  type UseCropCatalogResult,
  type RecommendationFetcher,
} from './recommendations/controller'
