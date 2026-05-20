import { getCookie } from "./cookies.ts";

const userCookieName = "survivalmap_users";
const userCookieMaxAgeSeconds = 60 * 60 * 24 * 365 * 20;

export function getCurrentUserId(headers: Headers, mapId: string): number | undefined {
  return getUserCookieSelections(headers)[mapId];
}

export function setCurrentUserCookie(
  responseHeaders: Headers,
  requestHeaders: Headers,
  mapId: string,
  userId: number,
): void {
  const selections = getUserCookieSelections(requestHeaders);
  selections[mapId] = userId;
  const expires = new Date(Date.now() + userCookieMaxAgeSeconds * 1000);
  const encodedSelections = encodeURIComponent(formatUserCookieSelections(selections));

  responseHeaders.append(
    "Set-Cookie",
    `${userCookieName}=${encodedSelections}; Path=/; Max-Age=${userCookieMaxAgeSeconds}; Expires=${expires.toUTCString()}; SameSite=Lax; HttpOnly`,
  );
}

export function getUserCookieSelections(headers: Headers): Record<string, number> {
  const value = getCookie(headers, userCookieName);

  if (!value) {
    return {};
  }

  const selections: Record<string, number> = {};

  for (const pair of value.split("|")) {
    const separatorIndex = pair.lastIndexOf(":");

    if (separatorIndex < 1) {
      continue;
    }

    const mapId = pair.slice(0, separatorIndex);
    const userId = Number(pair.slice(separatorIndex + 1));

    if (mapId && Number.isSafeInteger(userId) && userId > 0) {
      selections[mapId] = userId;
    }
  }

  return selections;
}

function formatUserCookieSelections(selections: Record<string, number>): string {
  return Object.entries(selections)
    .map(([mapId, userId]) => `${mapId}:${userId}`)
    .join("|");
}
