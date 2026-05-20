import { Head } from "fresh/runtime";
import type { JSX } from "preact";
import { Eyebrow } from "../ui/eyebrow.tsx";
import { LinkButton } from "../ui/link_button.tsx";
import { Panel } from "../ui/panel.tsx";

export function MapNotFoundPage(): JSX.Element {
  return (
    <>
      <Head>
        <title>Map not found | Survival Map</title>
      </Head>
      <Panel>
        <Eyebrow>Map not found</Eyebrow>
        <h1>No map here</h1>
        <p>That map does not exist.</p>
        <LinkButton href="/">Create a map</LinkButton>
      </Panel>
    </>
  );
}

export function ErrorPage(): JSX.Element {
  return (
    <>
      <Head>
        <title>Server error | Survival Map</title>
      </Head>
      <Panel>
        <Eyebrow>Server error</Eyebrow>
        <h1>Something broke</h1>
        <p>Try again in a moment.</p>
        <LinkButton href="/">Return home</LinkButton>
      </Panel>
    </>
  );
}
