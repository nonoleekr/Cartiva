import { Link, NavLink, Route, Routes } from 'react-router';
import { FoundationPage } from './FoundationPage';
import { AuthPage } from '../features/auth/AuthPage';
import { AccountPage } from '../features/auth/AccountPage';
import { useSession } from '../features/auth/useSession';
import { CatalogPage } from '../features/catalog/CatalogPage';
import { ProductPage } from '../features/catalog/ProductPage';

export function App() {
  const { user, status } = useSession();
  return <div className="mx-auto flex min-h-screen max-w-[1296px] flex-col px-6 sm:px-12">
    <a href="#main" className="sr-only focus:not-sr-only focus:py-3">Skip to content</a>
    <header className="flex items-center justify-between gap-6 border-b border-stone-200 py-5">
      <Link to="/" className="text-3xl font-bold tracking-tight text-emerald-950">Cartiva</Link>
      <nav aria-label="Main navigation" className="flex gap-5 text-sm font-medium">
        <NavLink to="/" end>Shop</NavLink>
        {status !== 'loading' && <NavLink to={user ? '/account' : '/sign-in'}>{user ? 'Account' : 'Sign in'}</NavLink>}
      </nav>
    </header>
    <main id="main" className="flex-1" tabIndex={-1}>
      <Routes>
        <Route path="/" element={<CatalogPage />} />
        <Route path="/products/:slug" element={<ProductPage />} />
        <Route path="/status" element={<FoundationPage />} />
        <Route path="/sign-in" element={<AuthPage key="sign-in" mode="sign-in" />} />
        <Route path="/sign-up" element={<AuthPage key="sign-up" mode="sign-up" />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="/about" element={<section className="max-w-2xl py-16 sm:py-24"><h1 className="text-4xl font-semibold tracking-tight">Built to learn. Built step by step.</h1><p className="mt-6 text-lg leading-8 text-stone-600">Cartiva is an independent e-commerce learning project. This first milestone connects a React interface to an Express API.</p><p className="mt-4 leading-7 text-stone-600">Accounts are available now. The catalog API is ready; shopping pages, carts and simulated orders are still in development.</p><Link to="/" className="mt-8 inline-block font-semibold text-emerald-900 underline underline-offset-4">Back to home</Link></section>} />
        <Route path="*" element={<section className="py-16"><h1 className="text-4xl font-semibold">Page not found</h1><Link to="/" className="mt-6 inline-block underline">Return home</Link></section>} />
      </Routes>
    </main>
    <footer className="mt-8 flex flex-wrap justify-between gap-4 border-t border-stone-200 py-6 text-sm text-stone-500"><p><strong className="text-emerald-950">Cartiva</strong> · Learning project · Illustrative sample images</p><Link to="/about" className="underline">About this demo</Link></footer>
  </div>;
}
