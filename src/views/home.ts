import { render_layout } from "./layout";

type Userinfo = Record<string, unknown>;
type IdTokenClaims = Record<string, unknown>;

const escape_html = (s: string): string =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const optional = (value: unknown, fallback = "Non renseigné"): string =>
  value != null ? escape_html(String(value)) : `<em>${fallback}</em>`;

const format_date = (unix: unknown): string => {
  if (typeof unix !== "number") return "<em>—</em>";
  return `<time datetime="${unix}">${new Date(unix * 1000).toLocaleString("fr-FR")}</time>`;
};

const proconnect_button = (action: string, csrf_token: string): string => `
  <div class="fr-consent-placeholder" style="background: var(--grey-1000-50)">
    <form action="${action}" method="post">
      <input type="hidden" name="_csrf" value="${csrf_token}" />
      <button class="proconnect-button">
        <span class="proconnect-sr-only">S'identifier avec ProConnect</span>
      </button>
    </form>
    <p>
      <a href="https://www.proconnect.gouv.fr/" target="_blank" rel="noopener noreferrer" title="Qu'est-ce que ProConnect ? - nouvelle fenêtre">
        Qu'est-ce que ProConnect ?
      </a>
    </p>
  </div>`;

const render_logged_out = (csrf_token: string): string => `
  <div class="fr-container fr-py-9v fr-my-32v">
    <div class="fr-grid-row fr-grid-row--middle">
      <div class="fr-col-sm-12 fr-col-md-5">
        <img
          alt="Welcome Page Logo"
          class="fr-responsive-img"
          src="/welcome.svg"
          data-fr-js-ratio="true"
        />
      </div>
      <div class="fr-col-sm-12 fr-col-md-7">
        <h1>Bienvenue chez le Dr. ProConnect !</h1>
        <p>
          Le docteur ProConnect, c'est le service qui vous permet d'accéder à
          vos données de connexion à travers les différentes connexions
          possibles. C'est un moyen facile de tester des parcours de connexion
          en tant qu'usager et de comprendre quelles sont les données
          transmises à nos partenaires.
        </p>
      </div>
    </div>

    <div class="fr-grid-row fr-grid-row--middle fr-py-9v fr-my-32v">
      <div class="fr-col-sm-12 fr-col-md-6">
        <div class="fr-my-2w fr-mx-5w">
          <h6 class="fr-h6" id="standard">Connexion standard</h6>
          <p>Pour suivre vos connexions avec le niveau de sécurité standard.<br /></p>
        </div>
      </div>
      <div class="fr-col-sm-12 fr-col-md-6">
        ${proconnect_button("/login", csrf_token)}
      </div>
    </div>

    <div class="fr-grid-row fr-grid-row--middle fr-py-9v fr-my-32v">
      <div class="fr-col-sm-12 fr-col-md-6">
        <div class="fr-my-2w fr-mx-5w">
          <h6 class="fr-h6" id="double-authentification">
            Connexion double authentification (2FA)
          </h6>
          <p>
            En plus de votre mot de passe et de la vérification de l'adresse
            email, nous vous demanderons un code à usage unique ou une clé
            spécifique.
          </p>
        </div>
      </div>
      <div class="fr-col-sm-12 fr-col-md-6">
        ${proconnect_button("/force-2fa", csrf_token)}
      </div>
    </div>

    <div class="fr-grid-row fr-grid-row--middle fr-py-9v fr-my-32v">
      <div class="fr-col-sm-12 fr-col-md-6">
        <div class="fr-my-2w fr-mx-5w">
          <h6 class="fr-h6" id="certification-dirigeant">
            Connexion avec certification dirigeant
          </h6>
          <p>
            En plus de votre mot de passe et de la vérification de l'adresse
            email, nous vous demanderons de prouver le statut de dirigeant au
            sein de l'organisation sélectionnée.
          </p>
        </div>
      </div>
      <div class="fr-col-sm-12 fr-col-md-6">
        ${proconnect_button("/force-certification-dirigeant", csrf_token)}
      </div>
    </div>
  </div>
`;

const render_logged_in = (
  userinfo: Userinfo,
  idtoken: IdTokenClaims,
  csrf_token: string,
): string => {
  const roles = userinfo.roles;
  const amr = idtoken.amr;

  return `
  <div class="fr-container fr-py-9v fr-my-32v">
    <h1>Votre compte</h1>
    <div class="fr-grid-row fr-grid-row--gutters">
      <div class="fr-col-12 fr-col-lg-6">
        <div class="fr-basic-card">
          <div class="fr-col">
            <h3>
              Vous êtes <strong>${optional(userinfo.usual_name)} ${optional(userinfo.given_name)}</strong>
            </h3>
            <ul>
              <li>Nom usuel : <strong>${optional(userinfo.usual_name)}</strong></li>
              <li>Prénom : <strong>${optional(userinfo.given_name)}</strong></li>
              <li>Email : <strong>${optional(userinfo.email)}</strong></li>
              <li>Profession : <strong>${optional(userinfo.job, "Non renseignée")}</strong></li>
              <li>Rôles : <strong>${Array.isArray(roles) ? roles.map((r) => escape_html(String(r))).join(", ") : optional(undefined)}</strong></li>
              <li>Connexion établie le <strong>${format_date(idtoken.iat)}</strong></li>
              <li>Date d'expiration de la connexion le <strong>${format_date(idtoken.exp)}</strong></li>
              <li>Type de connexion : <strong>${Array.isArray(amr) ? amr.map((a) => escape_html(String(a))).join(", ") : optional(undefined, "Non renseignée")}</strong></li>
              <li>Classe de contexte d'authentification : <strong>${optional(idtoken.acr)}</strong></li>
            </ul>
          </div>
        </div>
      </div>
      <div class="fr-col-12 fr-col-lg-6">
        <div class="fr-basic-card">
          <div class="fr-col">
            <h3>Organisation</h3>
            <ul>
              <li>Nom de l'organisation : <strong>${optional(userinfo.organization_label)}</strong></li>
              <li>Numéro d'identification du fournisseur d'identité : <strong>${optional(userinfo.idp_id)}</strong></li>
              <li>SIRET : <strong>${optional(userinfo.siret)}</strong></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
    <div class="fr-mt-4w">
      <form action="/logout" method="post" style="display:inline">
        <input type="hidden" name="_csrf" value="${csrf_token}" />
        <button type="submit" class="fr-btn fr-btn--secondary">Se déconnecter</button>
      </form>
    </div>
  </div>
`;
};

export function render_home(
  userinfo: Userinfo | undefined,
  idtoken: IdTokenClaims | undefined,
  csrf_token: string,
): string {
  const content =
    userinfo && idtoken
      ? render_logged_in(userinfo, idtoken, csrf_token)
      : render_logged_out(csrf_token);
  return render_layout("Docteur ProConnect", content);
}
