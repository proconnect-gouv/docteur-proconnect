export async function handler(req: Request): Promise<Response> {
  const { pathname } = new URL(req.url);

  if (pathname.startsWith("/dsfr/")) {
    const file = Bun.file(
      `./node_modules/@gouvfr/dsfr/dist${pathname.slice("/dsfr".length)}`,
    );
    if (await file.exists()) return new Response(file);
  }

  const file = Bun.file(
    `./public${pathname === "/" ? "/index.html" : pathname}`,
  );
  if (await file.exists()) return new Response(file);

  return new Response("Not Found", { status: 404 });
}
