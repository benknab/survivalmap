export function getCookie(headers: Headers, name: string): string | undefined {
  const cookieHeader = headers.get("cookie");

  if (!cookieHeader) {
    return undefined;
  }

  for (const cookie of cookieHeader.split(";")) {
    const [rawName = "", ...valueParts] = cookie.trim().split("=");

    if (rawName !== name || valueParts.length === 0) {
      continue;
    }

    const value = valueParts.join("=");

    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }

  return undefined;
}
