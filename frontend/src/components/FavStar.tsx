interface Props {
  active: boolean
  cropName: string
  onToggle: () => void
}

export const FavStar = ({ active, cropName, onToggle }: Props) => {
  const label = active ? `${cropName}をお気に入りから外す` : `${cropName}をお気に入りに追加`
  return (
    <button
      type="button"
      className={`fav-star${active ? ' fav-star--active' : ''}`}
      aria-pressed={active}
      aria-label={label}
      onClick={onToggle}
    >
      {active ? '★' : '☆'}
    </button>
  )
}

FavStar.displayName = 'FavStar'
