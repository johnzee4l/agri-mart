import { LazyMotion, domMax } from "motion/react";
import { Outlet } from "react-router-dom";

/* domMax is the feature set that enables shared layoutId morphs (product tile to
   detail, designtokens 9.3). It is scoped by this layout: admin and auth routes are
   outside it. The features module itself ships in the shared UI bundle because the
   `m` components that use it live in the same dependency graph; splitting it out
   would mean lazy-loading the pages that render these morphs. */
export default function MorphMotion({ children }) {
  return (
    <LazyMotion features={domMax} strict>
      {children}
    </LazyMotion>
  );
}

/* Layout route: one provider instance survives child route changes, which is what
   lets a layoutId morph across /products and /products/:id. */
export function MorphLayout() {
  return (
    <MorphMotion>
      <Outlet />
    </MorphMotion>
  );
}
