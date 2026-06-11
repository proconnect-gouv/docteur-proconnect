const root = import.meta.dir + "/..";

export function create_server(port: number | string) {
  return Bun.serve({
    port,
    routes: {
      "/": new Response(Bun.file(`${root}/public/index.html`)),
      "/common.css": new Response(Bun.file(`${root}/public/common.css`)),
      "/welcome.svg": new Response(Bun.file(`${root}/public/welcome.svg`)),
    },
    fetch(req) {
      const { pathname } = new URL(req.url);

      if (pathname.startsWith("/dsfr/")) {
        return new Response(
          Bun.file(
            `${root}/node_modules/@gouvfr/dsfr/dist${pathname.slice("/dsfr".length)}`,
          ),
        );
      }

      return new Response("Not Found", { status: 404 });
    },
  });
}
