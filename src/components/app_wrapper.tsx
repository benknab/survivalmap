import type { PageProps } from "fresh";

export function AppWrapper({ Component }: PageProps) {
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
