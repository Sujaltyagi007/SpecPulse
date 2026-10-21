import Link from 'next/link';
import { SearchForm } from '@/components/site';

export default function NotFound() {
  return (
    <section className="not-found">
      <span className="not-found-code">404</span>
      <h1>We couldn’t find that page</h1>
      <p className="lead">It may have moved, or the product isn’t published yet. Try searching instead.</p>
      <SearchForm size="lg" />
      <p> <Link href="/" className="btn btn-ghost">Back to home</Link> </p>
    </section>
  );
}
