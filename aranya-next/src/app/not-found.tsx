import { resolveMarket } from "@/lib/market";
import { SiteChrome } from "@/components/SiteChrome";
import { NotFoundClient } from "@/components/marketing/NotFoundClient";

// App-Router 404. Rendered for any unmatched route, wrapped in the storefront
// chrome (solid nav + footer) so users land somewhere navigable.
export default function NotFound() {
  const market = resolveMarket();
  return (
    <SiteChrome initialMarket={market}>
      <NotFoundClient />
    </SiteChrome>
  );
}
