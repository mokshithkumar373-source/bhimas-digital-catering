import { createFileRoute, Link } from "@tanstack/react-router";
import { Utensils, Phone, MapPin, UtensilsCrossed, PartyPopper, Truck, ChefHat } from "lucide-react";
import heroImg from "@/assets/catering-hero.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Bhimas Catering Tanuku — Wedding & Function Catering" },
      {
        name: "description",
        content:
          "Bhimas Catering, Tanuku — traditional Andhra wedding, function and event catering with breakfast, lunch and dinner menus. Call 90000 74444.",
      },
      { property: "og:title", content: "Bhimas Catering Tanuku — Wedding & Function Catering" },
      {
        property: "og:description",
        content:
          "Traditional Andhra catering for weddings, functions and events in Tanuku. Custom menus, servers and transport.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});

const services = [
  { icon: PartyPopper, title: "Weddings & Functions", desc: "Complete arrangements for marriages, receptions and housewarmings." },
  { icon: UtensilsCrossed, title: "Breakfast · Lunch · Dinner", desc: "Traditional Andhra menus — sweets, curries, rice items and tiffins." },
  { icon: ChefHat, title: "Custom Menus", desc: "Choose your own items per category and we plan the rates per plate." },
  { icon: Truck, title: "Servers & Transport", desc: "Trained serving staff and delivery to your function venue." },
];

function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-brand-foreground">
              <Utensils className="h-5 w-5" />
            </div>
            <div>
              <div className="text-base font-bold leading-tight text-brand">Bhimas Catering</div>
              <div className="text-[11px] text-muted-foreground">తణుకు</div>
            </div>
          </div>
          <Link
            to="/login"
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground hover:bg-brand/90"
          >
            Staff Login
          </Link>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-12 md:grid-cols-2 md:py-20">
          <div>
            <h1 className="text-3xl font-extrabold leading-tight text-brand md:text-5xl">
              Traditional Andhra Catering in Tanuku
            </h1>
            <p className="mt-4 text-base text-muted-foreground md:text-lg">
              Weddings, receptions and family functions served with authentic taste — from breakfast
              tiffins to full banana-leaf meals, with servers and transport arranged for you.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a
                href="tel:+919000074444"
                className="inline-flex items-center gap-2 rounded-lg bg-brand px-5 py-3 text-sm font-semibold text-brand-foreground hover:bg-brand/90"
              >
                <Phone className="h-4 w-4" /> Call 90000 74444
              </a>
              <a
                href="https://wa.me/919000074444"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border px-5 py-3 text-sm font-semibold hover:bg-brand-soft"
              >
                Enquire on WhatsApp
              </a>
            </div>
          </div>
          <img
            src={heroImg}
            alt="Traditional Andhra catering spread served on a banana leaf with silver vessels"
            width={1600}
            height={1000}
            className="w-full rounded-2xl border object-cover shadow-lg"
          />
        </section>

        <section className="border-y bg-brand-soft/50 py-14">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-2xl font-bold text-brand">What we serve</h2>
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {services.map((s) => (
                <div key={s.title} className="rounded-xl border bg-card p-5 shadow-sm">
                  <s.icon className="h-6 w-6 text-brand" />
                  <h3 className="mt-3 text-base font-semibold">{s.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-14">
          <h2 className="text-2xl font-bold text-brand">Contact us</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="flex items-start gap-3 rounded-xl border bg-card p-5">
              <Phone className="mt-0.5 h-5 w-5 text-brand" />
              <div>
                <div className="text-sm font-semibold">Phone</div>
                <a href="tel:+919000074444" className="text-sm text-muted-foreground hover:text-brand">
                  90000 74444
                </a>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl border bg-card p-5">
              <MapPin className="mt-0.5 h-5 w-5 text-brand" />
              <div>
                <div className="text-sm font-semibold">Location</div>
                <p className="text-sm text-muted-foreground">Tanuku, West Godavari, Andhra Pradesh</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t bg-card py-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 text-xs text-muted-foreground sm:flex-row">
          <span>© {new Date().getFullYear()} Bhimas Catering, Tanuku</span>
          <Link to="/login" className="hover:text-brand">
            Staff Login
          </Link>
        </div>
      </footer>
    </div>
  );
}
