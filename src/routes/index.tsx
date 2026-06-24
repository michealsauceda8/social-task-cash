import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, MousePointerClick, Send, Wallet, Sparkles, Shield, Zap } from "lucide-react";

import ogImage from "@/assets/og-image.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TaskPay — Earn cash completing social media tasks" },
      { name: "description", content: "Earn real money completing quick social tasks — like, follow, share, comment, subscribe. Fast reviews under 24h and flexible payouts with no hidden fees." },
      { property: "og:title", content: "TaskPay — Earn cash completing social media tasks" },
      { property: "og:description", content: "Get paid to like, follow, share, comment and subscribe. Reviews in under 24h, withdraw anytime once you hit the minimum balance." },
      { property: "og:image", content: ogImage },
      { property: "og:url", content: "https://social-task-cash.lovable.app/" },
      { name: "twitter:image", content: ogImage },
    ],
    links: [{ rel: "canonical", href: "https://social-task-cash.lovable.app/" }],
  }),
  component: Landing,
});

function Landing() {
  const { data: cms } = useQuery({
    queryKey: ["cms"],
    queryFn: async () => {
      const { data } = await supabase.from("cms_content").select("*");
      return Object.fromEntries((data ?? []).map((r) => [r.key, r]));
    },
  });
  const { data: testimonials } = useQuery({
    queryKey: ["testimonials-approved"],
    queryFn: async () => (await supabase.from("testimonials").select("*").eq("approved", true).limit(6)).data ?? [],
  });
  const { data: faqs } = useQuery({
    queryKey: ["faqs"],
    queryFn: async () => (await supabase.from("faqs").select("*").order("sort_order")).data ?? [],
  });

  const hero = cms?.hero;
  const how = cms?.how_it_works;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* NAV */}
      <header className="sticky top-0 z-30 border-b border-border/50 backdrop-blur-xl bg-background/60">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-md bg-gradient-primary text-primary-foreground font-display font-bold">T</div>
            <span className="font-display text-lg font-bold tracking-tight">TaskPay</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#how" className="hover:text-foreground transition">How it works</a>
            <a href="#testimonials" className="hover:text-foreground transition">Reviews</a>
            <a href="#faq" className="hover:text-foreground transition">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/auth"><Button variant="ghost" size="sm">Sign in</Button></Link>
            <Link to="/auth"><Button size="sm" className="bg-gradient-primary text-primary-foreground shadow-glow">Get started</Button></Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden bg-hero">
        <div className="absolute inset-0 grid-glow opacity-60" />
        <div className="relative mx-auto max-w-7xl px-6 pt-24 pb-32 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Earn from your daily scroll
          </div>
          <h1 className="mt-6 font-display text-5xl md:text-7xl font-bold tracking-tight text-balance">
            {hero?.title ?? "Get Paid for Social Tasks"}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground text-balance">
            {hero?.body ?? "Earn real money completing quick tasks: like, follow, share, comment. Cash out anytime."}
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link to="/auth">
              <Button size="lg" className="bg-gradient-primary text-primary-foreground shadow-glow h-12 px-6 text-base">
                Start earning <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
            <a href="#how"><Button size="lg" variant="outline" className="h-12 px-6 text-base">See how it works</Button></a>
          </div>
          <div className="mt-16 grid grid-cols-3 gap-8 max-w-2xl mx-auto">
            {[
              { v: "$2.1M+", l: "paid out" },
              { v: "120k", l: "active users" },
              { v: "< 24h", l: "review time" },
            ].map((s) => (
              <div key={s.l} className="text-center">
                <div className="font-display text-3xl font-bold text-primary">{s.v}</div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground mt-1">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="py-24 border-t border-border/50">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-16">
            <h2 className="font-display text-4xl md:text-5xl font-bold">{how?.title ?? "How It Works"}</h2>
            <p className="mt-4 text-muted-foreground">Four steps from sign-up to payout.</p>
          </div>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { icon: CheckCircle2, t: "Sign up free", d: "Create your account in 30 seconds." },
              { icon: MousePointerClick, t: "Pick a task", d: "Browse available social media tasks." },
              { icon: Send, t: "Submit proof", d: "Show you've done the task — link or screenshot." },
              { icon: Wallet, t: "Cash out", d: "Reach the minimum and withdraw anytime." },
            ].map((s, i) => (
              <div key={s.t} className="relative rounded-2xl bg-gradient-card border border-border p-6 shadow-card">
                <div className="absolute -top-3 -left-3 grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground font-display text-sm font-bold">
                  {i + 1}
                </div>
                <s.icon className="h-7 w-7 text-primary" />
                <h3 className="mt-4 font-display text-lg font-semibold">{s.t}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BENEFITS */}
      <section className="py-24 border-t border-border/50">
        <div className="mx-auto max-w-7xl px-6 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="font-display text-4xl font-bold">Built for everyone with a phone.</h2>
            <p className="mt-4 text-muted-foreground text-lg">No skills required. If you can scroll Instagram, you can earn with TaskPay.</p>
            <ul className="mt-8 space-y-4">
              {[
                { i: Zap, t: "Fast reviews", d: "Most submissions reviewed in under 24 hours." },
                { i: Shield, t: "Safe payouts", d: "Multiple withdrawal methods, no hidden fees." },
                { i: Sparkles, t: "Always fresh tasks", d: "New campaigns added every day." },
              ].map((b) => (
                <li key={b.t} className="flex gap-4">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
                    <b.i className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-semibold">{b.t}</div>
                    <div className="text-sm text-muted-foreground">{b.d}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-3xl bg-gradient-card border border-border p-8 shadow-card">
            <div className="rounded-2xl bg-background/60 border border-border p-6">
              <div className="flex items-center justify-between">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Available balance</div>
                <div className="rounded-full bg-success/20 text-success px-2 py-0.5 text-xs">+ $4.25 today</div>
              </div>
              <div className="mt-2 font-display text-5xl font-bold text-primary">$127.50</div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-lg bg-muted p-3"><div className="font-semibold text-foreground">82</div><div className="text-muted-foreground">tasks done</div></div>
                <div className="rounded-lg bg-muted p-3"><div className="font-semibold text-foreground">5</div><div className="text-muted-foreground">pending</div></div>
                <div className="rounded-lg bg-muted p-3"><div className="font-semibold text-foreground">98%</div><div className="text-muted-foreground">approval</div></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section id="testimonials" className="py-24 border-t border-border/50">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-16">
            <h2 className="font-display text-4xl md:text-5xl font-bold">Loved by side-hustlers</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {(testimonials ?? []).map((t) => (
              <div key={t.id} className="rounded-2xl bg-gradient-card border border-border p-6 shadow-card">
                <div className="text-primary text-lg">{"★".repeat(t.rating ?? 5)}</div>
                <p className="mt-4 text-foreground/90">"{t.content}"</p>
                <div className="mt-6 flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/20 text-primary font-display font-bold">
                    {t.author_name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{t.author_name}</div>
                    <div className="text-xs text-muted-foreground">{t.author_role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 border-t border-border/50">
        <div className="mx-auto max-w-3xl px-6">
          <div className="text-center mb-12">
            <h2 className="font-display text-4xl md:text-5xl font-bold">Questions</h2>
          </div>
          <div className="space-y-4">
            {(faqs ?? []).map((f) => (
              <details key={f.id} className="group rounded-xl border border-border bg-gradient-card p-5">
                <summary className="cursor-pointer font-semibold list-none flex items-center justify-between">
                  {f.question}
                  <span className="text-primary group-open:rotate-45 transition">+</span>
                </summary>
                <p className="mt-3 text-sm text-muted-foreground">{f.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 border-t border-border/50">
        <div className="mx-auto max-w-4xl px-6 text-center rounded-3xl bg-gradient-primary p-16 shadow-glow">
          <h2 className="font-display text-4xl md:text-5xl font-bold text-primary-foreground">Ready to start earning?</h2>
          <p className="mt-4 text-primary-foreground/80">Join thousands earning every day. No fees, no hidden tricks.</p>
          <Link to="/auth" className="mt-8 inline-block">
            <Button size="lg" variant="secondary" className="h-12 px-6 text-base">Create your account →</Button>
          </Link>
        </div>
      </section>

      <footer className="border-t border-border/50 py-10">
        <div className="mx-auto max-w-7xl px-6 flex flex-wrap items-center justify-between gap-4 text-sm text-muted-foreground">
          <div>© {new Date().getFullYear()} TaskPay. {cms?.footer?.body ?? "Monetize your social activity."}</div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-foreground">Terms</a>
            <a href="#" className="hover:text-foreground">Privacy</a>
            <a href="#" className="hover:text-foreground">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
