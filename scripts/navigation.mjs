const links = [
  ['home', '/'],
  ['campaigns', '/campaigns/'],
  ['services', '/#popular'],
  ['contact us', '/contact.html'],
  ['faq', '/#agency-faq'],
  ['sign in', '/campaigns/#signin'],
];

function items(divider = false) {
  return links.map(([label, href], index) => `${divider && index === 5 ? '<span class="site-nav-divider" aria-hidden="true">|</span>' : ''}<a href="${href}">${label}</a>`).join('');
}

export const headerMarkup = `<header class="site-header"><a class="site-nav-brand" href="/" aria-label="nfluence home">nfluence</a><nav class="site-nav" aria-label="Main navigation">${items(true)}</nav><button class="site-menu-toggle" type="button" aria-label="Open navigation menu" aria-controls="site-mobile-nav" aria-expanded="false"><span></span><span></span><span></span></button><nav id="site-mobile-nav" class="site-mobile-nav" aria-label="Mobile navigation" hidden>${items()}</nav></header>`;
