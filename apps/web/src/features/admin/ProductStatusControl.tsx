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
          {status === 'DRAFT' ? 'Draft' : <>
            <span aria-hidden="true" className={selected === 'ACTIVE'
              ? 'mr-2 inline-block size-2.5 rounded-full border border-emerald-100 bg-emerald-300 align-baseline'
              : 'mr-2 inline-block size-2.5 rounded-full border-2 border-emerald-700 align-baseline'} />
            Active
          </>}
        </span>
      </label>)}
    </div>
    <p id="product-visibility" aria-live="polite" className="product-status-description text-sm">
      <span aria-hidden="true">{published ? '◉' : '⊘'} </span>
      {published ? <>
        <span className="product-status-accent font-semibold">Published</span>. Customers can view this product on the storefront.
      </> : <>
        <span className="font-semibold">Unpublished</span>. Customers cannot see this product on the storefront.
      </>}
      {' '}{published ? (pending ? 'Save to unpublish.' : '') : <>
        {pending ? 'Save to ' : 'Select Active and save to '}
        <span className="product-status-accent font-semibold">publish</span>.
      </>}
    </p>
  </fieldset>;
}
