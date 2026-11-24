export function LoadingState({ message = 'Loading products…' }: { message?: string }) {
  return <p role="status" className="py-12 text-stone-600">{message}</p>;
}

export function ErrorState({ message, retry }: { message: string; retry: () => void }) {
  return <div className="my-8 border-l-4 border-red-700 py-3 pl-5"><p role="alert" className="text-red-800">{message}</p><button onClick={retry} className="mt-3 font-semibold underline underline-offset-4">Try again</button></div>;
}
