const UNKNOWN_LABEL = '未同期'

export const formatLastSync = (date: Date | null, unknownLabel: string = UNKNOWN_LABEL) => {
  if (!date) {
    return unknownLabel
  }
  const timestamp = date.getTime()
  if (Number.isNaN(timestamp)) {
    return unknownLabel
  }
  const formatter = new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const parts = formatter.formatToParts(date)
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? ''
  const year = get('year')
  const month = get('month')
  const day = get('day')
  const hour = get('hour')
  const minute = get('minute')
  if (!year || !month || !day || !hour || !minute) {
    return unknownLabel
  }
  return `${year}/${month}/${day} ${hour}:${minute}`
}
