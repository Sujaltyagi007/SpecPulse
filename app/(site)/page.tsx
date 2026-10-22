import { listPublishedProducts } from '@/lib/products';
import { listPublishedArticles } from '@/lib/articles/queries';
import { getSiteStats, listCategories, listComparisonCards, listRoundupCards, sortProducts } from '@/lib/catalog';
import { faqJsonLd, jsonLdString } from '@/lib/jsonld';
import { ArticleCard } from '@/components/site';
import {
  CategoryRow, ClosingCta, ComparisonGrid, HomeHero, ProductRail, RoundupShowcase, SectionTitle, WhyBento, Wrap,
  type CategorySpotlight,
} from '@/components/site/home';
import { BuyingHabits, HOME_FAQ, HomeFaq, PublishTimeline, SpecGlossary } from '@/components/site/home-content';

export const revalidate = 3600;

export default async function HomePage() {
  const [products, categories, comparisons, roundups, articles, stats] = await Promise.all([
    listPublishedProducts(),
    listCategories(),
    listComparisonCards({ take: 4 }),
    listRoundupCards({ take: 3 }),
    listPublishedArticles(3),
    getSiteStats(),
  ]);
  const latest = sortProducts(products, 'newest').slice(0, 10);

  // Each category's cheapest live price and a representative product image.
  const spotlight: CategorySpotlight[] = categories.map((c) => {
    const items = products.filter((p) => p.categorySlug === c.slug);
    const cheapest = sortProducts(items, 'price-asc')[0];
    return { ...c, from: cheapest?.bestPrice ?? null, imageUrl: items.find((p) => p.imageUrl)?.imageUrl ?? null };
  });
  const earbuds = categories.find((c) => c.slug === 'wireless-earbuds');

  // .home-page opts <main> out of the shared container (see site.css); each band brings its own <Wrap>.
  // Catalog sections (products, comparisons, best-of lists, guides) render only when they have published entries.
  return (
    <div className="home-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(faqJsonLd({ faq: HOME_FAQ })) }} />

      <HomeHero categories={categories} stats={stats} />

      {spotlight.length > 0 && (
        <section id="categories" className="anchor-section border-t border-line py-16 sm:py-20">
          <Wrap>
            <h2 className="m-0 mb-8 text-center text-[clamp(1.5rem,3vw,2rem)] text-fg">Shop by category</h2>
            <CategoryRow categories={spotlight} />
          </Wrap>
        </section>
      )}

      <section id="why" className="pb-20 sm:pb-28">
        <Wrap>
          <SectionTitle title="Why SpecPulse." sub="Built for people who read the spec sheet." />
          <WhyBento stats={stats} />
        </Wrap>
      </section>

      {latest.length > 0 && (
        <section id="latest" className="bg-soft py-20 sm:py-28">
          <Wrap>
            <SectionTitle title="Just verified." sub="New on SpecPulse, with today's lowest price." href="/search" linkLabel="Search everything" />
            <ProductRail products={latest} />
          </Wrap>
        </section>
      )}

      <section id="how-it-works" className="bg-soft py-20 sm:py-28">
        <Wrap>
          <SectionTitle title="From spec sheet to your screen." sub="Every product page passes the same four checks before it goes live." />
          <PublishTimeline />
        </Wrap>
      </section>

      {comparisons.length > 0 && (
        <section id="compare" className="pt-20 sm:pt-28">
          <Wrap>
            <SectionTitle title="Head to head." sub="Every verified spec, side by side." href="/compare" linkLabel="All comparisons" />
            <ComparisonGrid comparisons={comparisons} />
          </Wrap>
        </section>
      )}

      {roundups.length > 0 && (
        <section id="best" className="anchor-section pt-20 sm:pt-28">
          <Wrap>
            <SectionTitle title="The best, ranked." sub="Shortlists for common needs and budgets." href="/best" linkLabel="All best picks" />
            <RoundupShowcase roundups={roundups} />
          </Wrap>
        </section>
      )}

      <section id="specs" className="py-20 sm:py-28">
        <Wrap>
          <SectionTitle
            title="Specs, explained."
            sub="What each line on a wireless earbuds spec sheet means, and what to look for."
            href={earbuds ? `/${earbuds.slug}` : undefined}
            linkLabel="Browse wireless earbuds"
          />
          <SpecGlossary />
        </Wrap>
      </section>

      <section id="habits" className="bg-warm py-20 sm:py-28">
        <Wrap>
          <BuyingHabits />
        </Wrap>
      </section>

      {articles.length > 0 && (
        <section id="guides" className="pt-20 sm:pt-28">
          <Wrap>
            <SectionTitle title="Guides." sub="Buying guides and explainers, checked by a person." href="/articles" linkLabel="All guides" />
            <div className="article-grid">
              {articles.map((a) => <ArticleCard key={a.slug} a={a} />)}
            </div>
          </Wrap>
        </section>
      )}

      <section id="faq" className="py-20 sm:py-28">
        <Wrap>
          <h2 className="m-0 mb-8 text-center text-[clamp(1.75rem,4vw,2.75rem)] text-fg sm:mb-10">Questions, answered.</h2>
          <HomeFaq />
        </Wrap>
      </section>

      <section aria-label="Search" className="pb-4">
        <Wrap>
          <ClosingCta />
        </Wrap>
      </section>
    </div>
  );
}
