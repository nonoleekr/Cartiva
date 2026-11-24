export function Pagination({ label, page, total, hasNext, change }: {
  label: string; page: number; total?: number; hasNext: boolean; change: (page: number) => void;
}) {
  return <nav aria-label={label} className="page-controls">
    <button type="button" className="page-button" disabled={page <= 1} onClick={() => change(page - 1)}>
      <span aria-hidden="true">← </span>Previous
    </button>
    <span aria-current="page">Page {page}{total !== undefined && ' of ' + total}</span>
    <button type="button" className="page-button page-button-primary" disabled={!hasNext} onClick={() => change(page + 1)}>
      Next<span aria-hidden="true"> →</span>
    </button>
  </nav>;
}
