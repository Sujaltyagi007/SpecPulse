/**
 * Built-in banner prompts. The admin can override each one in Settings → AI & API keys; these are the values
 * "Reset to default" goes back to. Placeholders: {{title}}, {{subject}}, {{direction}}, {{palette}}.
 */

export const DEFAULT_BANNER_TEMPLATE = `Design the hero banner for a consumer tech article. It must look like it was art-directed by a senior graphic designer at a top tech publication: deliberate, bold, premium and instantly eye-catching at thumbnail size.

ARTICLE (context only, do not write it on the image): "{{title}}"

SUBJECT: {{subject}}. The subject is the single hero of the image. Photorealistic, accurate proportions, believable materials (anodised aluminium, glass, ceramic, soft-touch plastic), crisp edges, fine surface detail. Generic and unbranded.

{{direction}}

COLOUR: {{palette}}. Keep the whole image disciplined to this palette plus neutrals; strong value contrast so the subject pops.

COMPOSITION: Wide 1.9:1 banner. Subject fully inside the frame on the right side, never cropped at the edges, filling about 40-55% of the frame height. The left 45% is clean negative space (background only) where a headline will be overlaid later. One clear focal point.

FINISH: Commercial advertising photography, shot on a medium-format camera, 85mm lens, sharp focus on the subject, natural depth of field, refined colour grade, subtle film grain. No cheap CGI look.

STRICTLY AVOID: any text, letters, numbers, words, UI labels, logos, brand marks or watermarks; people or hands; duplicated or extra buttons, ports, lenses or keys; warped or melted geometry; clutter; flat stock-photo lighting; cartoon or illustration styles.`;

/** Three distinct art directions, like a designer pitching options: each candidate is a different idea. */
export const DEFAULT_BANNER_DIRECTIONS = {
  hero: `ART DIRECTION: "Cinematic hero." A dramatic, moody product hero shot like a flagship launch keynote visual. The subject sits on the right third at a confident three-quarter angle on a glossy dark surface with a crisp reflection. Coloured gel lighting: a strong rim light in the lead colour carves the silhouette, a soft accent-colour kick light from the opposite side, a faint volumetric haze glow behind the subject. Deep, rich near-black background with a smooth colour gradient. The left half stays dark and calm.`,
  color: `ART DIRECTION: "Bold colour still life." A punchy, magazine-cover studio still life in the style of a premium tech brand print campaign. A seamless saturated backdrop in the lead colour, the subject placed on or leaning against simple sculptural props (a matte plinth, a disc, an arch) in tonal shades of the backdrop with one prop in the accent colour. Hard, sunny directional light casting long graphic shadows. Flat-lay-meets-sculpture composition, clean and confident, lots of solid colour, subject on the right half, open colour field on the left.`,
  kinetic: `ART DIRECTION: "Kinetic energy." A high-energy, scroll-stopping thumbnail. The subject floats at a dynamic tilted angle on the right, as if just launched into frame, with sweeping long-exposure light trails in the lead and accent colours wrapping around it, a burst of fine glowing particles and a few motion-blurred fragments for depth. Dark background with a bright radial glow behind the subject. Sense of speed and power, the subject itself perfectly sharp. The left side is darker with only soft trails for headline space.`,
} as const;

export type BannerConcept = keyof typeof DEFAULT_BANNER_DIRECTIONS;

export function fillBannerTemplate(template: string, vars: { title: string; subject: string; direction: string; palette: string }): string {
  return template.replace(/\{\{\s*(title|subject|direction|palette)\s*\}\}/g, (_, k: keyof typeof vars) => vars[k]);
}
