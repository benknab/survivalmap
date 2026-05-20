export function isPointApiRequest(request: Request): boolean {
  return new URL(request.url).pathname.includes("/points");
}

export async function getJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}
