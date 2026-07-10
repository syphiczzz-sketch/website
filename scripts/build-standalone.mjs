import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = path.join(projectRoot, "public");

const [sourceHtml, css, javascript, logo, mark, hero] = await Promise.all([
  readFile(path.join(publicDir, "index.html"), "utf8"),
  readFile(path.join(publicDir, "styles.css"), "utf8"),
  readFile(path.join(publicDir, "app.js"), "utf8"),
  readFile(path.join(publicDir, "assets", "northweld-logo.png")),
  readFile(path.join(publicDir, "assets", "northweld-mark.png")),
  readFile(path.join(publicDir, "assets", "northweld-hero-v2.png"))
]);

const logoDataUri = `data:image/png;base64,${logo.toString("base64")}`;
const markDataUri = `data:image/png;base64,${mark.toString("base64")}`;
const heroDataUri = `data:image/png;base64,${hero.toString("base64")}`;
const safeJavascript = javascript.replaceAll("</script", "<\\/script");

let standaloneHtml = sourceHtml
  .replace(
    '    <link rel="stylesheet" href="./styles.css" />',
    `    <style>\n${css}\n    </style>`
  )
  .replace('    <script src="./app.js" defer></script>\n', "")
  .replaceAll("./assets/northweld-logo.png", logoDataUri)
  .replaceAll("./assets/northweld-mark.png", markDataUri)
  .replaceAll("./assets/northweld-hero-v2.png", heroDataUri)
  .replaceAll('href="./privacy.html"', 'href="./public/privacy.html"')
  .replaceAll('href="./terms.html"', 'href="./public/terms.html"')
  .replace(
    "  </body>",
    `    <script>\n${safeJavascript}\n    </script>\n  </body>`
  );

await writeFile(path.join(projectRoot, "OPEN-ME.html"), standaloneHtml);
