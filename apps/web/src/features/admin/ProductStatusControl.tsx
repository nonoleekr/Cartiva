export function ProductStatusControl({ saved, selected, onChange }: {
  saved: 'DRAFT' | 'ACTIVE';
  selected: 'DRAFT' | 'ACTIVE';
  onChange: (status: 'DRAFT' | 'ACTIVE') => void;
}) {
  const published = saved === 'ACTIVE';
  const pending = saved !== selected;
  return <fieldset className="grid gap-2" aria-describedby="product-visibility">
    <legend className="font-semibold">Product status</legend>
    <div className="grid grid-cols-2 gap-2">
      {(['DRAFT', 'ACTIVE'] as const).map(status => <label key={status} className="cursor-pointer">
        <input className="peer sr-only" type="radio" name="status" value={status}
          checked={selected === status} onChange={() => onChange(status)} />
        <span className={status === 'DRAFT'
          ? 'block rounded border border-blue-700 bg-white px-3 py-2 text-center font-semibold text-blue-800 transition hover:bg-blue-50 peer-checked:bg-blue-700 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-blue-700 peer-focus-visible:ring-offset-2'
          : 'block rounded border border-emerald-700 bg-white px-3 py-2 text-center font-semibold text-emerald-800 transition hover:bg-emerald-50 peer-checked:bg-emerald-700 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-700 peer-focus-visible:ring-offset-2'}>
          {status === 'DRAFT' ? 'Draft' : 'Active'}
        </span>
      </label>)}
    </div>
    <p id="product-visibility" aria-live="polite" className="text-sm text-slate-700">
      <span aria-hidden="true">{published ? '◉' : '⊘'} </span>
      {published ? 'Published. Customers can view this product on the storefront.' : 'Unpublished. Customers cannot see this product on the storefront.'}
      {' '}{pending ? (published ? 'Save to unpublish.' : 'Save to publish.') : !published ? 'Select Active and save to publish.' : ''}
    </p>
  </fieldset>;
}
