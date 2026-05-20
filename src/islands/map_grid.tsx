import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ComponentChildren, FunctionComponent, JSX } from "preact";
import { useState } from "react";
import { MapGridContents } from "../map_grid/map_grid_contents.tsx";
import type { MapGridProps } from "../map_grid/types.ts";

// TanStack ships React typings; Fresh runs it through Preact compat at runtime.
const PreactQueryClientProvider = QueryClientProvider as unknown as FunctionComponent<{
  client: QueryClient;
  children: ComponentChildren;
}>;

export default function MapGrid(props: MapGridProps): JSX.Element {
  const [queryClient] = useState((): QueryClient => new QueryClient());

  return (
    <PreactQueryClientProvider client={queryClient}>
      <MapGridContents {...props} />
    </PreactQueryClientProvider>
  );
}
