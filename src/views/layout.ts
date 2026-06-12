export const escape_html = (s: string): string =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export function render_layout(title: string, content: string): string {
  return `<!doctype html>
<html lang="fr-FR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width" />
    <title>${title}</title>
    <link rel="apple-touch-icon" href="/dsfr/favicon/apple-touch-icon.png" />
    <link rel="icon" href="/dsfr/favicon/favicon.svg" type="image/svg+xml" />
    <link rel="shortcut icon" href="/dsfr/favicon/favicon.ico" type="image/x-icon" />
    <link rel="manifest" href="/dsfr/favicon/manifest.webmanifest" crossorigin="use-credentials" />
    <link rel="stylesheet" href="/common.css" />
    <link rel="stylesheet" href="/dsfr/dsfr.min.css" />
    <link rel="stylesheet" href="/dsfr/utility/utility.min.css" />
  </head>
  <body>
    <header role="banner" class="fr-header">
      <div class="fr-header__body">
        <div class="fr-container">
          <div class="fr-header__body-row">
            <div class="fr-header__brand fr-enlarge-link">
              <div class="fr-header__brand-top">
                <div class="fr-header__logo">
                  <p class="fr-logo">République<br />française</p>
                </div>
                <div class="fr-header__navbar">
                  <button
                    class="fr-btn--menu fr-btn"
                    data-fr-opened="false"
                    aria-controls="modal-499"
                    id="button-500"
                    title="Menu"
                  >
                    Menu
                  </button>
                </div>
              </div>
              <div class="fr-header__service">
                <a href="/" title="Accueil - Dr. Proconnect">
                  <p class="fr-header__service-title">Docteur Proconnect</p>
                </a>
                <p class="fr-header__service-tagline">
                  Consultez vos données de connexion
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="fr-header__menu fr-modal" id="modal-499" aria-labelledby="button-500">
        <div class="fr-container">
          <button class="fr-btn--close fr-btn" aria-controls="modal-499" title="Fermer">
            Fermer
          </button>
          <div class="fr-header__menu-links"></div>
        </div>
      </div>
    </header>

    <main>
      ${content}
    </main>

    <footer class="fr-footer" role="contentinfo" id="footer-7361">
      <div class="fr-container">
        <div class="fr-footer__body">
          <div class="fr-footer__brand fr-enlarge-link">
            <a href="/" title="Retour à l'accueil du site - Docteur ProConnect">
              <p class="fr-logo">République<br />française</p>
            </a>
          </div>
          <div class="fr-footer__content">
            <ul class="fr-footer__content-list">
              <li class="fr-footer__content-item">
                <a class="fr-footer__content-link" target="_blank" rel="noopener external" title="info.gouv.fr - nouvelle fenêtre" href="https://info.gouv.fr">info.gouv.fr</a>
              </li>
              <li class="fr-footer__content-item">
                <a class="fr-footer__content-link" target="_blank" rel="noopener external" title="service-public.fr - nouvelle fenêtre" href="https://service-public.fr">service-public.fr</a>
              </li>
              <li class="fr-footer__content-item">
                <a class="fr-footer__content-link" target="_blank" rel="noopener external" title="legifrance.gouv.fr - nouvelle fenêtre" href="https://legifrance.gouv.fr">legifrance.gouv.fr</a>
              </li>
              <li class="fr-footer__content-item">
                <a class="fr-footer__content-link" target="_blank" rel="noopener external" title="data.gouv.fr - nouvelle fenêtre" href="https://data.gouv.fr">data.gouv.fr</a>
              </li>
            </ul>
          </div>
        </div>
        <div class="fr-footer__bottom">
          <ul class="fr-footer__bottom-list">
            <li class="fr-footer__bottom-item">
              <a class="fr-footer__bottom-link" href="#">Plan du site</a>
            </li>
            <li class="fr-footer__bottom-item">
              <a class="fr-footer__bottom-link" href="#">Accessibilité : non conforme</a>
            </li>
            <li class="fr-footer__bottom-item">
              <a class="fr-footer__bottom-link" href="#">Mentions légales</a>
            </li>
            <li class="fr-footer__bottom-item">
              <a class="fr-footer__bottom-link" href="#">Données personnelles</a>
            </li>
            <li class="fr-footer__bottom-item">
              <a class="fr-footer__bottom-link" href="#">Gestion des cookies</a>
            </li>
          </ul>
          <div class="fr-footer__bottom-copy">
            <p>
              Sauf mention explicite de propriété intellectuelle détenue par des tiers,
              les contenus de ce site sont proposés sous
              <a href="https://github.com/etalab/licence-ouverte/blob/master/LO.md" target="_blank" rel="noopener external" title="Licence etalab - nouvelle fenêtre">licence etalab-2.0</a>
            </p>
          </div>
        </div>
      </div>
    </footer>

    <script src="/dsfr/dsfr.module.min.js" type="module"></script>
    <script src="/dsfr/dsfr.nomodule.min.js" nomodule></script>
  </body>
</html>`;
}
