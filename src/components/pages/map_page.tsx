import { Head } from "fresh/runtime";
import type { JSX } from "preact";
import MapGrid from "../../islands/map_grid.tsx";
import type { MapRecord, UserRecord } from "../../schema.ts";
import type { AddUserFieldErrors } from "../forms/user_forms.tsx";

export type MapPageProps = {
  map: MapRecord;
  currentUser: UserRecord;
  users: UserRecord[];
  addUserError?: string;
  addUserFieldErrors?: AddUserFieldErrors;
};

export function MapPage(
  { map, currentUser, users, addUserError, addUserFieldErrors }: MapPageProps,
): JSX.Element {
  return (
    <>
      <Head>
        <title>{map.name} | Survival Map</title>
      </Head>
      <div className="map-page">
        <MapGrid
          mapId={map.id}
          mapName={map.name}
          currentUserId={currentUser.id}
          currentUserNickname={currentUser.nickname}
          members={users.map((user) => ({ id: user.id, nickname: user.nickname }))}
          addUserError={addUserError}
          addUserFieldErrors={addUserFieldErrors}
        />
      </div>
    </>
  );
}
