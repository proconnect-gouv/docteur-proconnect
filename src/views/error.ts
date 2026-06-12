import { escape_html, render_layout } from "./layout";

// DSFR "Page d'erreur" template:
// https://www.systeme-de-design.gouv.fr/composants-et-modeles/modeles/pages-d-erreurs
export function render_error(
  status: number,
  title: string,
  message: string,
  pictogram = "/dsfr/artwork/pictograms/system/error.svg",
): string {
  const content = `
  <div class="fr-container">
    <div class="fr-my-7w fr-mt-md-12w fr-mb-md-10w fr-grid-row fr-grid-row--gutters fr-grid-row--middle fr-grid-row--center">
      <div class="fr-py-0 fr-col-12 fr-col-md-6">
        <h1>${escape_html(title)}</h1>
        <p class="fr-text--sm fr-mb-3w">Erreur ${status}</p>
        <p class="fr-text--lead fr-mb-3w">${escape_html(message)}</p>
        <p class="fr-text--sm fr-mb-5w">
          Si le problème persiste, vous pouvez recommencer depuis la page d'accueil.
        </p>
        <ul class="fr-btns-group fr-btns-group--inline-md">
          <li>
            <a class="fr-btn" href="/">Retour à l'accueil</a>
          </li>
        </ul>
      </div>
      <div class="fr-col-12 fr-col-md-3 fr-col-offset-md-1 fr-px-6w fr-px-md-0 fr-py-0">
        <img src="${pictogram}" alt="" width="160" height="160" />
      </div>
    </div>
  </div>
`;
  return render_layout(`${title} - Docteur ProConnect`, content);
}
