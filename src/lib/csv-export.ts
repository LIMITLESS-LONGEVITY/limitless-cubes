/**
 * Generate CSV string from adherence trend data and trigger download.
 * Client-side only — no server endpoint needed.
 */
export function downloadAdherenceCSV(data: { week: string; completed: number; total: number; rate: number }[]) {
  const header = 'Week,Completed,Total,Rate\n'
  const rows = data.map((d) => `${d.week},${d.completed},${d.total},${(d.rate * 100).toFixed(1)}%`).join('\n')
  const blob = new Blob([header + rows], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `adherence-trend-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
