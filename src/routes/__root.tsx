import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AppLayout } from "../components/AppLayout";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-brand">404</h1>
        <p className="mt-2 text-muted-foreground">Page not found</p>
        <Link
          to="/"
          className="mt-6 inline-flex rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}


function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground"
          >
            Try again
          </button>
          <a href="/" className="rounded-lg border px-4 py-2 text-sm font-semibold">
            Home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Bhimas Catering — Order Management" },
      {
        name: "description",
        content:
          "Bhimas Catering order management: create orders, generate PDFs, track revenue and customers.",
      },
      { name: "author", content: "Bhimas Catering" },
      { property: "og:title", content: "Bhimas Catering — Order Management" },
      {
        property: "og:description",
        content:
          "Bhimas Catering order management: create orders, generate PDFs, track revenue and customers.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Bhimas Catering — Order Management" },
      { name: "twitter:description", content: "Bhimas Catering order management: create orders, generate PDFs, track revenue and customers." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/fce237a7-354b-4d2d-8e7d-85cd934b46d8/id-preview-141955af--6e1bb42f-3e76-472d-9fd2-e4c6bbaac139.lovable.app-1784716913792.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/fce237a7-354b-4d2d-8e7d-85cd934b46d8/id-preview-141955af--6e1bb42f-3e76-472d-9fd2-e4c6bbaac139.lovable.app-1784716913792.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Noto+Sans+Telugu:wght@400;500;600;700;800&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
    </QueryClientProvider>
  );
}
