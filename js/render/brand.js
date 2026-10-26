// Unit paw shared with js/render/draw/paw.js geometry.
const PAW = '<ellipse cy=".25" rx=".47" ry=".36"/><ellipse cx="-.4" cy="-.2" rx=".18" ry=".23" transform="rotate(-29 -.4 -.2)"/>'
  + '<ellipse cx="-.16" cy="-.5" rx=".18" ry=".24" transform="rotate(-6 -.16 -.5)"/><ellipse cx=".2" cy="-.5" rx=".18" ry=".24" transform="rotate(6 .2 -.5)"/>'
  + '<ellipse cx=".45" cy="-.16" rx=".18" ry=".23" transform="rotate(29 .45 -.16)"/>';

/** Trusted static brand asset (Three Dogs wordmark); replacing this string replaces the entire logo. */
export const BRAND_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 170" aria-hidden="true">
  <g fill="currentColor">
    <g transform="translate(94 26) rotate(-18) scale(20)">${PAW}</g>
    <g transform="translate(120 18) scale(22)">${PAW}</g>
    <g transform="translate(146 26) rotate(18) scale(20)">${PAW}</g>
    <g font-family="Arial Black, Arial, sans-serif" font-weight="900" text-anchor="middle">
      <text x="120" y="96" font-size="58" textLength="224" lengthAdjust="spacingAndGlyphs">THREE</text>
      <text x="120" y="160" font-size="62" textLength="176" lengthAdjust="spacingAndGlyphs">DOGS</text>
      <text x="228" y="44" font-size="18">®</text>
    </g>
  </g>
</svg>`;

/** BRAND_SVG painted in one color, for canvas drawImage. @param {string} color @returns {string} */
export function brandDataUrl(color) {
  return `data:image/svg+xml,${encodeURIComponent(BRAND_SVG.replaceAll('currentColor', color))}`;
}

/** Official wordmarks: black ink on transparency, resolved from this module so test pages also find them. */
export const LOGO_URLS = Object.freeze({
  dogs: new URL('../../assets/brand/three-dogs.png', import.meta.url).href,
  cats: new URL('../../assets/brand/three-cats.png', import.meta.url).href,
});

/** Official product packshots shown courtside. */
export const BAG_URLS = Object.freeze({
  dogsAdult: new URL('../../assets/brand/bag-dogs-adult.webp', import.meta.url).href,
  dogsSenior: new URL('../../assets/brand/bag-dogs-senior.webp', import.meta.url).href,
  catsKitten: new URL('../../assets/brand/bag-cats-kitten.webp', import.meta.url).href,
  catsSterilised: new URL('../../assets/brand/bag-cats-sterilised.png', import.meta.url).href,
});

const bags = {};
/** Lazily decoded packshot for canvas; null until ready or outside a browser. @param {keyof BAG_URLS} name @returns {HTMLImageElement|null} */
export function bagImage(name) {
  if (!bags[name] && typeof Image !== 'undefined') { bags[name] = new Image(); bags[name].src = BAG_URLS[name]; }
  return bags[name]?.complete && bags[name].naturalWidth ? bags[name] : null;
}
