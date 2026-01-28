//

import { Given, Then, When } from "@badeball/cypress-cucumber-preprocessor";

//

Given("je navigue sur la page", () => {
  cy.visit("/");
});

When("je clique sur le bouton ProConnect nommé {string}", (text: string) => {
  cy.get(`[aria-label="${text}"]`).click();
});

When("je suis redirigé sur {string}", (path: string) => {
  cy.url().should("contain", path);
});

Then("je vois {string}", function (text: string) {
  cy.contains(text);
});

//

When("je vois {string} sur ProConnect Fédération", (_text: string) => {
  cy.origin(Cypress.env("PC_PROVIDER"), { args: _text }, (text) => {
    cy.contains(text);
  });
});

When("je vois {string} sur ProConnect Identité", (_text: string) => {
  cy.origin(Cypress.env("PCI_PROVIDER"), { args: _text }, (text) => {
    cy.contains(text);
  });
});

When("je clique sur {string} sur ProConnect Fédération", (_text: string) => {
  cy.origin(Cypress.env("PC_PROVIDER"), { args: _text }, (text) => {
    cy.contains(text).click();
  });
});

When("je clique sur {string} sur ProConnect Identité", (_text: string) => {
  cy.origin(Cypress.env("PCI_PROVIDER"), { args: _text }, (text) => {
    cy.contains(text).click();
  });
});

When(
  "je me connecte en tant que user@yopmail.com sur ProConnect Fédération",
  () => {
    cy.origin(Cypress.env("PC_PROVIDER"), () => {
      cy.contains("Email professionnel").click();
      cy.focused().type("user@yopmail.com");
      cy.contains("Continuer").click();
    });

    cy.origin(Cypress.env("PCI_PROVIDER"), () => {
      cy.contains("Renseignez votre mot de passe").click();
      cy.focused().type("user@yopmail.com");
      cy.contains("S’identifier").click();
    });
  },
);
