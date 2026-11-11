import { Link } from "react-router-dom";
import { Clock, MapPin } from "@phosphor-icons/react";
import { LoadingLines } from "../components/AsyncState.jsx";
import StoreMap from "../components/StoreMap.jsx";
import { useContent } from "@/lib/content.js";
import { directionsUrl } from "@/lib/maps.js";

/* FR-19. Store locator: map with the store pin, address and hours from
   site_content.store_location. The map is a media element inside canvas margins. */
export default function Contact() {
  const { store, loading } = useContent();
  const directions = store ? directionsUrl(store) : null;

  return (
    <section className="mx-auto w-full max-w-[var(--container-content)] px-4 py-10 lg:px-10 lg:py-16">
      <header className="flex flex-col gap-2">
        <p className="text-eyebrow font-bold text-primary-text uppercase">Visit the store</p>
        <h1 className="text-display-lg text-fg">Contact and store locator</h1>
      </header>

      <div className="mt-8 flex flex-col gap-8">
        {loading && !store ? <LoadingLines rows={2} /> : null}

        {store ? (
          <>
            <StoreMap center={{ lat: store.latitude, lng: store.longitude }} />

            <div className="flex flex-col gap-2">
              {store.address ? (
                <p className="flex items-start gap-2 text-body-lg text-fg">
                  <MapPin size={24} className="mt-1 shrink-0 text-primary-text" aria-hidden="true" />
                  {store.address}
                </p>
              ) : null}

              {store.hours ? (
                <p className="flex items-start gap-2 text-body-sm text-fg-muted">
                  <Clock size={20} className="mt-0.5 shrink-0 text-fg-subtle" aria-hidden="true" />
                  {store.hours}
                </p>
              ) : null}

              {directions ? (
                <a
                  href={directions}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex h-[var(--control-md)] w-fit items-center rounded-full bg-primary px-5 text-label font-semibold text-on-primary hover:bg-primary-hover"
                >
                  Get directions
                </a>
              ) : null}
            </div>
          </>
        ) : null}

        {!loading && !store ? (
          <div className="flex flex-col gap-2">
            <p className="max-w-[60ch] text-body-md text-fg-muted">
              The store has not published its location yet. Announcements and the catalog are
              still available while it is set up.
            </p>
            <Link to="/products" className="text-label font-semibold text-primary-text hover:underline">
              Browse the catalog
            </Link>
          </div>
        ) : null}

        <div className="flex flex-col gap-1">
          <p className="text-label font-semibold text-fg">Ordering questions</p>
          <p className="max-w-[60ch] text-body-sm text-fg-muted">
            Ask through chat once you are signed in, or check the announcements page for holiday
            hours and delivery advisories.
          </p>
          <Link to="/announcements" className="text-label font-semibold text-primary-text hover:underline">
            Read announcements
          </Link>
        </div>
      </div>
    </section>
  );
}
