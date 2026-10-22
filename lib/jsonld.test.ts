import { test } from 'node:test';
import assert from 'node:assert/strict';
import { breadcrumbJsonLd } from '@/lib/jsonld';
import { SITE_URL } from '@/lib/site';

test('breadcrumb structured data matches the page hierarchy with absolute URLs', () => {
  const data = breadcrumbJsonLd([
    { name: 'Home', path: '/' },
    { name: 'Laptops', path: '/laptops' },
    { name: 'Example Laptop', path: '/laptops/example-laptop' },
  ]);

  assert.equal(data['@type'], 'BreadcrumbList');
  assert.deepEqual(data.itemListElement, [
    { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
    { '@type': 'ListItem', position: 2, name: 'Laptops', item: `${SITE_URL}/laptops` },
    { '@type': 'ListItem', position: 3, name: 'Example Laptop', item: `${SITE_URL}/laptops/example-laptop` },
  ]);
});
