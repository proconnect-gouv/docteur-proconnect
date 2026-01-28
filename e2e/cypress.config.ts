//

import { addCucumberPreprocessorPlugin } from "@badeball/cypress-cucumber-preprocessor";
import { createEsbuildPlugin } from "@badeball/cypress-cucumber-preprocessor/esbuild";
import createBundler from "@bahmutov/cypress-esbuild-preprocessor";
import { defineConfig } from "cypress";
import dotenv_flow from "dotenv-flow";

dotenv_flow.config({
  default_node_env: "development",
});

//

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:3000",
    specPattern: "**/*.feature",
    setupNodeEvents,
    video: true,
    videoCompression: 32,
    supportFile: false,
  },
  env: {
    PC_PROVIDER: new URL(process.env.PC_PROVIDER).hostname,
    PCI_PROVIDER: "identite-sandbox.proconnect.gouv.fr",
  },
});

//

async function setupNodeEvents(
  on: Cypress.PluginEvents,
  config: Cypress.PluginConfigOptions,
) {
  await addCucumberPreprocessorPlugin(on, config);

  on(
    "file:preprocessor",
    createBundler({
      plugins: [createEsbuildPlugin(config)],
    }),
  );

  return config;
}
