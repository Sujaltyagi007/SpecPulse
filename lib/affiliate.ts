export interface AffiliateProgramLike {
  urlTemplate: string;
  tag: string | null;
  active: boolean;
}

export interface LinkableOffer {
  sourceUrl: string;
  externalId: string | null;
}


export function buildAffiliateUrl(offer: LinkableOffer, program: AffiliateProgramLike | null): string {
  if (!program || !program.active) return offer.sourceUrl;
  const tpl = program.urlTemplate;
  if (tpl.includes('{external_id}') && !offer.externalId) return offer.sourceUrl;
  if (tpl.includes('{tag}') && !program.tag) return offer.sourceUrl;

  return tpl.replaceAll('{url}', encodeURIComponent(offer.sourceUrl)).replaceAll('{external_id}', encodeURIComponent(offer.externalId ?? '')).replaceAll('{tag}', encodeURIComponent(program.tag ?? ''));
}
