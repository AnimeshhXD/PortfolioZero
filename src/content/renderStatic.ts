/**
 * Build-time renderer for the semantic content (doc 8 §11 SEO + screen readers + no-JS/no-WebGL).
 * Injected into index.html by vite.config.ts. Pure string output — no DOM, no three.js.
 */
import { identity } from './identity.ts';
import { projects } from './projects.ts';

const esc = (s: string): string =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);

export function renderStaticContent(): string {
  const roles = identity.roles.map((r) => `<li>${esc(r)}</li>`).join('');
  const work = projects
    .map((p) => {
      const facts = p.facts.map((f) => `<li>${esc(f)}</li>`).join('');
      const signals = p.signals.length
        ? `<p class="pz-static__signals">${p.signals.map((s) => `<span><strong>${esc(s.value)}</strong> ${esc(s.label)}</span>`).join(' · ')}</p>`
        : '';
      const links = p.links
        .map((l) => `<a href="${esc(l.href)}" target="_blank" rel="noopener noreferrer">${esc(l.label)}<span class="pz-sr"> — ${esc(p.name)}</span></a>`)
        .join(' ');
      return `
      <article class="pz-static__project" id="work-${esc(p.id)}" aria-labelledby="h-${esc(p.id)}">
        <h2 id="h-${esc(p.id)}">${esc(p.name)}</h2>
        <p class="pz-static__tagline">${esc(p.tagline)}</p>
        <p>${esc(p.summary)}</p>
        <ul>${facts}</ul>
        ${signals}
        <p class="pz-static__stack">${p.stack.map(esc).join(' · ')}</p>
        <p class="pz-static__links">${links}</p>
      </article>`;
    })
    .join('');
  const contacts = identity.contacts
    .map((c) => `<li><a href="${esc(c.href)}"${c.external ? ' target="_blank" rel="noopener noreferrer"' : ''}>${esc(c.label)}</a> <span>${esc(c.description)}</span></li>`)
    .join('');
  return `
    <header class="pz-static__head">
      <p class="pz-static__boot">${esc(identity.boot[0])} ${esc(identity.boot[1])}</p>
      <h1>${esc(identity.name)}</h1>
      <ul class="pz-static__roles">${roles}</ul>
      <p>${esc(identity.experience.role)} · ${esc(identity.experience.period)}. ${esc(identity.experience.summary)}</p>
      <p>${esc(identity.education.degree)} — ${esc(identity.education.school)}, ${esc(identity.education.expected)}. ${esc(identity.education.detail)}.</p>
    </header>
    <section aria-label="Selected work">${work}
    </section>
    <footer class="pz-static__end" id="contact">
      <p class="pz-static__closing">${esc(identity.ending)}</p>
      <ul class="pz-static__contacts">${contacts}</ul>
      <p class="pz-static__hack">Hackathons: ${esc(identity.hackathons)}</p>
    </footer>`;
}

export function renderJsonLd(): string {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: identity.name,
    jobTitle: 'Full-Stack Developer',
    address: { '@type': 'PostalAddress', addressLocality: 'Mumbai', addressCountry: 'IN' },
    alumniOf: identity.education.school,
    email: 'mailto:animesh.sharma554@gmail.com',
    sameAs: ['https://github.com/AnimeshhXD', 'https://www.linkedin.com/in/animesh-animw'],
  };
  return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;
}
