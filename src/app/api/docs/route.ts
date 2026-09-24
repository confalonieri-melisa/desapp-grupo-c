import { readFileSync } from "node:fs";
import path from "node:path";
import YAML from "yaml";

const openApiPath = path.join(
  process.cwd(),
  "specs",
  "001-player-token-marketplace",
  "contracts",
  "openapi.yaml",
);

function loadOpenApiDocument(): string {
  const yamlDocument = readFileSync(openApiPath, "utf8");
  const openApiDocument = YAML.parse(yamlDocument);

  return JSON.stringify(openApiDocument).replace(/</g, "\\u003c");
}

export function GET(): Response {
  const openApiDocument = loadOpenApiDocument();

  return new Response(
    `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Player Token Marketplace API</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
    <style>
      .parameters-container input,
      .parameters-container select,
      .parameters-container textarea {
        display: none;
      }
    </style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      window.onload = () => {
        window.ui = SwaggerUIBundle({
          spec: ${openApiDocument},
          dom_id: "#swagger-ui",
          deepLinking: true,
          supportedSubmitMethods: [],
          presets: [SwaggerUIBundle.presets.apis],
          layout: "BaseLayout"
        });
      };
    </script>
  </body>
</html>`,
    {
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "text/html; charset=utf-8",
      },
    },
  );
}
