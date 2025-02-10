import { type RouteConfig, type RouteConfigEntry, index, prefix } from "@react-router/dev/routes";

const routes: RouteConfigEntry[] =
  prefix("/tuner", [
  index("routes/home.tsx")
  ])

export default routes satisfies RouteConfig;
