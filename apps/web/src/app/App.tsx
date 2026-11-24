import { Link, NavLink, Route, Routes, useLocation } from 'react-router';
import { FoundationPage } from './FoundationPage';
import { AuthPage } from '../features/auth/AuthPage';
import { AccountPage } from '../features/auth/AccountPage';
import { useSession } from '../features/auth/useSession';
import { CatalogPage } from '../features/catalog/CatalogPage';
import { ProductPage } from '../features/catalog/ProductPage';
import { CartPage } from '../features/cart/CartPage';

import { Admin } from '../features/admin/Admin';
import { CheckoutScreen } from '../features/checkout/Checkout';

export function App() {
  const { user, status } = useSession();
  const location = useLocation();
  const admin = /^\/admin(?:\/|$)/.test(location.pathname);
  const adminAuth = /^\/admin\/sign-(?:in|up)$/.test(location.pathname);
  return <div data-admin={admin || undefined} className={admin ? 'admin-shell' : ''}><div className={admin ? "admin-frame" : "mx-auto flex min-h-screen max-w-[1296px] flex-col px-6 sm:px-12"}>
    <a href="#main" className="sr-only focus:not-sr-only focus:py-3">Skip to content</a>
    {admin ? <header className="admin-header">
      <Link to="/admin" className="admin-brand">Cartiva <span>Admin Portal</span></Link>
      <nav aria-label="Portal links"><Link to="/">Storefront ↗</Link>{user && <Link to="/account">Account</Link>}</nav>
    </header> : <header className="flex items-center justify-between gap-6 border-b border-stone-200 py-5">
      <Link to="/" className="text-3xl font-bold tracking-tight text-emerald-950">Cartiva</Link>
      <nav aria-label="Main navigation" className="flex flex-wrap justify-end gap-x-5 gap-y-2 text-sm font-medium">
        <NavLink to="/" end>Shop</NavLink>
        <NavLink to="/cart">Cart</NavLink>
        {user && <NavLink to="/orders">My Orders</NavLink>}
        {status !== 'loading' && <NavLink to={user ? '/account' : '/sign-in'}>{user ? 'Account' : 'Sign in'}</NavLink>}
      </nav>
    </header>}
    <main id="main" className={adminAuth ? "admin-auth-main" : "flex-1"} tabIndex={-1}>
      <Routes>
        <Route path="/" element={<CatalogPage />} />
        <Route path="/products/:slug" element={<ProductPage />} />
        <Route path="/admin" element={<Admin mode="dashboard" />} />
        <Route path="/admin/sign-in" element={<AuthPage key="admin-in" mode="sign-in" admin />} />
        <Route path="/admin/sign-up" element={<AuthPage key="admin-up" mode="sign-up" admin />} />
        <Route path="/admin/products" element={<Admin mode="products" />} />
        <Route path="/admin/products/new" element={<Admin mode="create" />} />
        <Route path="/admin/products/:id" element={<Admin mode="product" />} />
        <Route path="/admin/categories" element={<Admin mode="categories" />} />
        <Route path="/admin/orders" element={<Admin mode="orders" />} />
        <Route path="/admin/orders/:id" element={<Admin mode="order" />} />
        <Route path="/checkout" element={<CheckoutScreen mode="checkout" />} />
        <Route path="/orders" element={<CheckoutScreen mode="history" />} />
        <Route path="/orders/:id" element={<CheckoutScreen mode="order" />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/status" element={<FoundationPage />} />
        <Route path="/sign-in" element={<AuthPage key="sign-in" mode="sign-in" />} />
        <Route path="/sign-up" element={<AuthPage key="sign-up" mode="sign-up" />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="/about" element={<section className="max-w-2xl py-16 sm:py-24"><h1 className="text-4xl font-semibold tracking-tight">Built to learn. Built step by step.</h1><p className="mt-6 text-lg leading-8 text-stone-600">Cartiva is an independent e-commerce learning project. This first milestone connects a React interface to an Express API.</p><p className="mt-4 leading-7 text-stone-600">Browse the illustrative catalog and manage a cart saved to your account. Checkout and orders are simulated.</p><Link to="/" className="mt-8 inline-block font-semibold text-emerald-900 underline underline-offset-4">Back to home</Link></section>} />
        <Route path="*" element={<section className="py-16"><h1 className="text-4xl font-semibold">Page not found</h1><Link to="/" className="mt-6 inline-block underline">Return home</Link></section>} />
      </Routes>
    </main>
    {!admin && <footer className="mt-8 flex flex-wrap justify-between gap-4 border-t border-stone-200 py-6 text-sm text-stone-500"><p><strong className="text-emerald-950">Cartiva</strong> Â· Learning project Â· Illustrative sample images</p><Link to="/about" className="underline">About this demo</Link></footer>}
  </div></div>;
}
