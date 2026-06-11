const PORT = process.env.PORT ?? 3000;

Bun.serve({
  port: PORT,
  fetch() {
    return new Response(
      `<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Docteur ProConnect</title>
  </head>
  <body>
    <h1>🩺 Docteur ProConnect</h1>
    <p>Déployé avec bun ✅</p>
  </body>
</html>`,
      { headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  },
});

console.log(`App listening on http://localhost:${PORT}`);
