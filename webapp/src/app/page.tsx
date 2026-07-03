import Link from "next/link";
import { SignInButton } from "@/components/SignInButton";
import { getSessionProfile } from "@/lib/access";
import { getTodaysSchedule } from "@/lib/schedule";
import { getCampusWeather } from "@/lib/weather";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [{ profile }, weather, schedule] = await Promise.all([
    getSessionProfile(),
    getCampusWeather(),
    getTodaysSchedule(),
  ]);

  const today = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date());

  return (
    <main className="flex min-h-screen flex-col bg-gradient-to-b from-slate-950 via-slate-900 to-blue-950 text-slate-100">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-10 px-6 py-16">
        <header className="text-center">
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-blue-300">
            Health Education Campus
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
            D1 Course Library
          </h1>
          <p className="mt-3 text-lg text-slate-400">{today}</p>
        </header>

        <section className="grid w-full gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-blue-300">
              Weather at HEC
            </h2>
            {weather ? (
              <div className="mt-3">
                <p className="text-4xl font-bold">
                  {weather.temperature}&deg;F
                  <span className="ml-2 align-middle text-base font-normal text-slate-300">
                    {weather.label}
                  </span>
                </p>
                <p className="mt-2 text-sm text-slate-400">
                  Feels like {weather.feelsLike}&deg; &middot; High{" "}
                  {weather.high}&deg; / Low {weather.low}&deg;
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  Wind {weather.windMph} mph &middot; Precip chance{" "}
                  {weather.precipChancePct}%
                </p>
              </div>
            ) : (
              <p className="mt-3 text-slate-400">
                Weather is unavailable right now.
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-blue-300">
              Today on campus
            </h2>
            {schedule === null ? (
              <p className="mt-3 text-slate-400">
                Campus schedule feed is not connected yet.
              </p>
            ) : schedule.length === 0 ? (
              <p className="mt-3 text-slate-400">
                Nothing on the calendar today.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {schedule.slice(0, 6).map((event, i) => (
                  <li key={i} className="flex gap-3 text-sm">
                    <span className="w-20 shrink-0 font-semibold text-blue-200">
                      {event.time}
                    </span>
                    <span className="text-slate-300">{event.title}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="flex flex-col items-center gap-4 text-center">
          {!profile ? (
            <>
              <SignInButton />
              <p className="max-w-sm text-sm text-slate-500">
                Course materials are available to approved members only. Sign
                in with your Google account to request access.
              </p>
            </>
          ) : profile.status === "approved" ? (
            <Link
              href="/library"
              className="inline-flex items-center rounded-full bg-blue-700 px-8 py-3 text-base font-semibold text-white shadow-lg shadow-blue-700/20 transition hover:bg-blue-800"
            >
              Enter the course library
            </Link>
          ) : (
            <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 px-6 py-4">
              <p className="font-semibold text-amber-200">
                Your access request is {profile.status === "revoked" ? "inactive" : "pending approval"}.
              </p>
              <p className="mt-1 text-sm text-amber-200/70">
                Signed in as {profile.email}. You will get in once the owner
                approves your account.
              </p>
              <form action="/auth/signout" method="post" className="mt-3">
                <button className="text-sm text-amber-200 underline underline-offset-4">
                  Sign out
                </button>
              </form>
            </div>
          )}
        </section>
      </div>

      <footer className="pb-8 text-center text-xs text-slate-600">
        Private study library. Not affiliated with the university.
      </footer>
    </main>
  );
}
