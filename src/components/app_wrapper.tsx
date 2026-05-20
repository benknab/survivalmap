import type { PageProps } from "fresh";
import type { JSX } from "preact";

export function AppWrapper({ Component }: PageProps): JSX.Element {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Survival Map</title>
      </head>
      <body>
        <main>
          <Component />
        </main>
      </body>
    </html>
  );
}
