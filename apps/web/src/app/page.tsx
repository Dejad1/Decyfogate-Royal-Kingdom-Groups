import Link from "next/link";

export default function MarketingHome() {
  return (
    <div className="flex flex-col">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-sm font-semibold text-amber-300">
              DG
            </div>
            <span className="text-sm font-semibold tracking-tight text-slate-900">DecyfoGate for Schools</span>
          </div>
          <Link
            href="/login"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
          >
            Sign in
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-[radial-gradient(circle_at_top,_#132347_0%,_#0a1530_60%,_#050912_100%)] px-6 py-24 text-slate-100">
        <div className="mx-auto max-w-4xl text-center">
          <p className="mb-4 text-sm font-medium uppercase tracking-widest text-amber-300">Safety and attendance, not homework</p>
          <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            &ldquo;Did my child get to school today?&rdquo;
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-300">
            Every parent asks that question every morning. DecyfoGate answers it in the same second a teacher
            taps a name — a text and a WhatsApp message land on the parent&apos;s phone before the register is
            even finished.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <a
              href="mailto:hello@decyfogate.com?subject=Request%20a%20DecyfoGate%20demo"
              className="rounded-lg bg-amber-400 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-300"
            >
              Request a demo
            </a>
            <Link
              href="/login"
              className="rounded-lg border border-white/20 px-6 py-3 text-sm font-medium text-white transition hover:border-white/40"
            >
              See a live sign-in
            </Link>
          </div>
        </div>

        {/* Hero moment: tap -> buzz */}
        <div className="mx-auto mt-16 grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Form Teacher · Primary 4B</p>
            <p className="mt-2 text-sm text-slate-200">Chidinma Okafor</p>
            <div className="mt-3 inline-flex rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-medium text-emerald-300">
              Marked present · 07:42am
            </div>
          </div>
          <div className="hidden text-2xl text-amber-300 sm:block">→</div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Guardian&apos;s phone</p>
            <p className="mt-2 text-sm text-slate-200">SMS + WhatsApp, 07:42am</p>
            <p className="mt-1 text-sm text-slate-400">
              &ldquo;Royal Kingdom Nursery and Primary School: Chidinma Okafor was marked PRESENT at 07:42 today.&rdquo;
            </p>
          </div>
        </div>
      </section>

      {/* Value props */}
      <section className="bg-white px-6 py-20">
        <div className="mx-auto grid max-w-6xl gap-10 sm:grid-cols-3">
          {[
            {
              title: "One tap, one notification",
              body: "Form Teachers mark the daily register once. Guardians are notified once. No spam, no confusion about whether the child is safe.",
            },
            {
              title: "Catches the gap in between",
              body: "Subject Teachers can log per-class attendance too, feeding a low-attendance flag the school admin sees before it becomes a pattern.",
            },
            {
              title: "Built for how Nigerian schools run",
              body: "Nursery through SS3, arms A/B/C, JSS and SS departments, Form and Subject Teachers modeled exactly as your staff structure works today.",
            },
          ].map((item) => (
            <div key={item.title} className="rounded-2xl border border-slate-200 p-6">
              <h3 className="text-base font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Case study */}
      <section className="bg-slate-50 px-6 py-20">
        <div className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-10 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-widest text-amber-600">Flagship school group</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
            Royal Kingdom Group of Schools
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-slate-600">
            Royal Kingdom Nursery and Primary School and Royal Kingdom College run under one group account on
            DecyfoGate — two schools, 51 class units, and over 800 pupils, with every Form Teacher&apos;s daily
            register wired straight to guardians&apos; phones. The Group Admin sees both schools at a glance;
            each School Admin runs their own building day to day.
          </p>
          <dl className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-4">
            {[
              ["2", "Schools, one group"],
              ["51", "Class units"],
              ["800+", "Pupils covered"],
              ["2", "Channels per alert"],
            ].map(([stat, label]) => (
              <div key={label}>
                <dt className="text-2xl font-semibold text-slate-900">{stat}</dt>
                <dd className="mt-1 text-xs text-slate-500">{label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#0a1530] px-6 py-16 text-center text-slate-100">
        <h2 className="text-2xl font-semibold text-white">See it running on your own school&apos;s structure</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-slate-300">
          We&apos;ll walk through DecyfoGate against the Royal Kingdom demo tenant, then map it to your levels,
          arms, and staff in the same call.
        </p>
        <a
          href="mailto:hello@decyfogate.com?subject=Request%20a%20DecyfoGate%20demo"
          className="mt-8 inline-block rounded-lg bg-amber-400 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-300"
        >
          Request a demo
        </a>
      </section>

      <footer className="border-t border-slate-200 bg-white px-6 py-8 text-center text-xs text-slate-400">
        DecyfoGate for Schools — a DecyfoTech product.
      </footer>
    </div>
  );
}
