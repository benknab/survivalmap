import { App, staticFiles } from "fresh";
import { h } from "preact";
import { AppWrapper } from "./components/app_wrapper.tsx";
import { ErrorPage, MapNotFoundPage } from "./components/pages/mod.ts";
import { getHomePage, postCreateMap, postJoinMap } from "./handlers/home_handlers.ts";
import { getMapPage, postMapSession, postMapUser } from "./handlers/map_handlers.ts";
import { getMapPoints, patchMapPoint, postMapPoint } from "./handlers/point_handlers.ts";
import { getErrorLog, getRequestLogContext, logError, logRequest } from "./http/logging.ts";
import { isPointApiRequest } from "./http/requests.ts";

export const app = new App()
  .use(staticFiles())
  .use(logRequest)
  .appWrapper(AppWrapper)
  .onError("*", (ctx) => {
    logError("request_error", getRequestLogContext(ctx, { error: getErrorLog(ctx.error) }));

    if (isPointApiRequest(ctx.req)) {
      return Response.json({ error: "Unexpected point server error." }, { status: 500 });
    }

    return ctx.render(h(ErrorPage, {}), { status: 500 });
  })
  .get("/", getHomePage)
  .get("/index.html", getHomePage)
  .get("/map", (ctx) => ctx.redirect("/", 303))
  .post("/map", postCreateMap)
  .post("/map/join", postJoinMap)
  .get("/map/:id/points", getMapPoints)
  .post("/map/:id/points", postMapPoint)
  .patch("/map/:id/points/:pointId", patchMapPoint)
  .get("/map/:id", getMapPage)
  .post("/map/:id/session", postMapSession)
  .post("/map/:id/users", postMapUser)
  .notFound((ctx) => ctx.render(h(MapNotFoundPage, {}), { status: 404 }));
