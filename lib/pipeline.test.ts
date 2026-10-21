import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isValidGtin } from '@/lib/gtin';
import { isLiveOffer } from '@/lib/offers';
import { buildAffiliateUrl } from '@/lib/affiliate';
import { amazonAsin, isMatchingListing, pickOffers, retailerDomain, retailerSlug } from '@/lib/ingest/normalize';

const sony = { brand: 'Sony', model: 'WF-1000XM5' };
const airpods = { brand: 'Apple', model: 'AirPods Pro 2 (USB-C)' };

test('matches product listings, rejects accessories, used items and other models', () => {
  assert.equal(isMatchingListing(sony, { title: 'Sony WF-1000XM5 Wireless Noise Canceling Earbuds' }), true);
  assert.equal(isMatchingListing(sony, { title: 'Sony WF 1000XM5 Black' }), true);
  assert.equal(isMatchingListing(sony, { title: 'Silicone Case for Sony WF-1000XM5' }), false);
  assert.equal(isMatchingListing(sony, { title: 'Sony WF-1000XM4' }), false);
  assert.equal(isMatchingListing(sony, { title: 'Sony WF-1000XM50' }), false);
  assert.equal(isMatchingListing(sony, { title: 'Sony WF-1000XM5', second_hand_condition: 'used' }), false);
  assert.equal(isMatchingListing(airpods, { title: 'Apple AirPods Pro 2nd Gen with USB-C' }), true);
  assert.equal(isMatchingListing(airpods, { title: 'Apple AirPods Pro 3' }), false);
  assert.equal(isMatchingListing({ brand: 'Apple', model: 'AirPods Pro' }, { title: 'Apple AirPods Pro 3' }), false);
});

test('pickOffers keeps cheapest per retailer and skips unpriced', () => {
  const offers = pickOffers(sony, [
    { title: 'Sony WF-1000XM5', source: 'Amazon.com', link: 'https://www.amazon.com/dp/B0C33XXS56', extracted_price: 279.99 },
    { title: 'Sony WF-1000XM5 Black', source: 'Amazon', link: 'https://www.amazon.com/dp/B0C33XXS56', extracted_price: 249 },
    { title: 'Sony WF-1000XM5', source: 'Best Buy', link: 'https://www.bestbuy.com/x', extracted_price: 299.99 },
    { title: 'Sony WF-1000XM5', source: 'Walmart', link: 'https://www.walmart.com/x' },
  ]);
  assert.equal(offers.length, 2);
  const amazon = offers.find((o) => retailerSlug(o.retailerName) === 'amazon')!;
  assert.equal(amazon.priceCents, 24900);
  assert.equal(amazon.externalId, 'B0C33XXS56');
});

test('retailer identity', () => {
  assert.equal(retailerSlug('Amazon.com'), 'amazon');
  assert.equal(retailerSlug('Best Buy'), 'best-buy');
  assert.equal(retailerDomain('https://www.amazon.com/dp/B0C33XXS56'), 'amazon.com');
  assert.equal(retailerDomain('https://www.google.com/shopping/product/123'), null);
  assert.equal(amazonAsin('https://www.amazon.com/Sony-WF-1000XM5/dp/B0C33XXS56/ref=sr_1'), 'B0C33XXS56');
  assert.equal(amazonAsin('https://www.bestbuy.com/site/123'), null);
});

test('GTIN checksum', () => {
  assert.equal(isValidGtin('4006381333931'), true); // EAN-13
  assert.equal(isValidGtin('036000291452'), true); // UPC-A
  assert.equal(isValidGtin('036000291453'), false);
  assert.equal(isValidGtin('12345'), false);
});

test('affiliate link injection', () => {
  const program = { urlTemplate: 'https://www.amazon.com/dp/{external_id}?tag={tag}', tag: 'specpulse-20', active: true };
  assert.equal(
    buildAffiliateUrl({ sourceUrl: 'https://www.amazon.com/x/dp/B0C33XXS56', externalId: 'B0C33XXS56' }, program),
    'https://www.amazon.com/dp/B0C33XXS56?tag=specpulse-20',
  );
  assert.equal(buildAffiliateUrl({ sourceUrl: 'https://a.com/p', externalId: null }, program), 'https://a.com/p');
  assert.equal(buildAffiliateUrl({ sourceUrl: 'https://a.com/p', externalId: 'X' }, { ...program, active: false }), 'https://a.com/p');
});

test('offer freshness', () => {
  const now = new Date('2026-10-20T12:00:00Z');
  const fresh = new Date('2026-10-19T12:00:00Z');
  const stale = new Date('2026-10-16T12:00:00Z');
  assert.equal(isLiveOffer({ priceCents: 100, inStock: null, lastSeenAt: fresh }, now), true);
  assert.equal(isLiveOffer({ priceCents: 100, inStock: false, lastSeenAt: fresh }, now), false);
  assert.equal(isLiveOffer({ priceCents: 100, inStock: true, lastSeenAt: stale }, now), false);
  assert.equal(isLiveOffer({ priceCents: null, inStock: true, lastSeenAt: fresh }, now), false);
});
