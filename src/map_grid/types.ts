import type { JSX } from "preact";

export type MapGridProps = {
  mapId: string;
  mapName: string;
  currentUserId: number;
  currentUserNickname: string;
  members: MapMember[];
  addUserError?: string;
  addUserFieldErrors?: AddUserFieldErrors;
};

export type MapMember = {
  id: number;
  nickname: string;
};

export type AddUserFieldErrors = Partial<Record<"nickname", string>>;

export type ViewState = {
  panX: number;
  panY: number;
  zoom: number;
};

export type ViewportSize = {
  width: number;
  height: number;
};

export type Coordinate = {
  x: number;
  y: number;
};

export type CursorPosition = {
  coordinate: Coordinate;
  screen: Coordinate;
};

export type MapPoint = {
  id: number;
  mapId: string;
  name: string;
  emoji: string;
  color: string;
  x: number;
  y: number;
  z: number;
  addedByUserId: number;
  deletedAt: string | null;
  addedByNickname: string;
};

export type PointFormMode = "bearing" | "manual";
export type RelativeBearingOrigin = "new-point" | "saved-point";

export type PointDraft = {
  formMode: PointFormMode;
  name: string;
  emoji: string;
  color: string;
  x: string;
  y: string;
  z: string;
  relativeBearingOrigin: RelativeBearingOrigin;
  relativePointId: number | null;
  relativePointQuery: string;
  relativeBearing: string;
  relativeDistance: string;
};

export type PointEditDraft = Pick<PointDraft, "name" | "emoji" | "color">;
export type PointDraftTextField = Exclude<
  keyof PointDraft,
  "formMode" | "relativePointId" | "relativeBearingOrigin"
>;
export type PointEditField = keyof PointEditDraft;
export type PointStyleField = "emoji" | "color";

export type PointInput = {
  name: string;
  emoji: string;
  color: string;
  x: number;
  y: number;
  z: number;
};

export type PointEditInput = PointEditDraft;

export type PointPatchInput = Partial<PointEditInput> & {
  deleted?: boolean;
};

export type PointListResponse = {
  points?: MapPoint[];
  error?: string;
};

export type PointCreateResponse = {
  point?: MapPoint;
  error?: string;
};

export type PointUpdateResponse = {
  point?: MapPoint;
  error?: string;
};

export type DragState = {
  pointerId: number;
  x: number;
  y: number;
};

export type RelativePointResult = {
  point: MapPoint | null;
  coordinate: Coordinate | null;
  error: string | null;
};

export type FormSubmitHandler = (event: JSX.TargetedSubmitEvent<HTMLFormElement>) => void;
