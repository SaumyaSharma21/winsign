import PropTypes from 'prop-types'
import Versions from './Versions'

function LandingPage({ onLogin, onSignUp, onTryDashboard }) {
  return (
    <div className="relative flex h-screen w-full flex-col overflow-hidden bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-8%] top-[22%] h-56 w-56 rounded-full bg-indigo-500/25 blur-[110px] lg:h-64 lg:w-64 lg:blur-[120px]" />
        <div className="absolute bottom-[10%] right-[-6%] h-56 w-56 rounded-full bg-violet-500/20 blur-[110px] lg:h-64 lg:w-64 lg:blur-[120px]" />
      </div>
      <div className="relative flex h-full w-full flex-col gap-5 px-5 pb-4 pt-5 sm:px-6 md:gap-6 lg:gap-8 lg:px-12 xl:px-20 2xl:px-28">
        <header className="flex flex-none items-center justify-between rounded-3xl border border-slate-800/70 bg-slate-900/70 px-5 py-5 shadow-[0_22px_70px_-40px_rgba(15,23,42,0.9)] sm:px-6 sm:py-6">
          <div className="flex items-center gap-4">
            <div className="grid h-12 w-12 place-items-center rounded-2xl border border-slate-800 bg-slate-900">
              <span className="text-lg font-semibold text-indigo-300">W</span>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                WinSign
              </p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight">
                Digital signatures, reimagined
              </h1>
              <p className="mt-1 text-sm text-slate-400">
                Sign, manage, and move files with precision.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onLogin}
              className="rounded-xl border border-slate-800/70 px-5 py-2.5 text-sm font-medium text-slate-300 transition hover:border-indigo-400/70 hover:text-white"
              type="button"
            >
              Login
            </button>
            <button
              onClick={onSignUp}
              className="rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:from-indigo-400 hover:to-violet-400"
              type="button"
            >
              Sign Up
            </button>
          </div>
        </header>
        <main className="flex flex-1 flex-col gap-5 lg:grid lg:grid-cols-[1.3fr_1fr] lg:gap-6">
          <section className="flex flex-1 flex-col justify-between gap-7 rounded-3xl border border-slate-800/70 bg-slate-900/70 px-6 py-7 shadow-[0_20px_60px_-35px_rgba(15,23,42,0.9)] sm:px-8 sm:py-8 lg:gap-8 lg:px-9 lg:py-9">
            <div className="max-w-xl space-y-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-indigo-300">
                Stay focused
              </p>
              <h2 className="text-3xl font-semibold tracking-tight text-slate-50 sm:text-[2.2rem] lg:text-[2.6rem]">
                Desktop-native signing that keeps momentum.
              </h2>
              <p className="text-sm leading-relaxed text-slate-400 sm:text-base">
                {
                  'WinSign streamlines reviews, captures signatures, and syncs documents across your team so you never leave the workspace that keeps you in flow.'
                }
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 lg:gap-5">
              <button
                onClick={onTryDashboard}
                className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 px-7 py-3 text-sm font-semibold text-white shadow-lg transition hover:from-indigo-400 hover:to-violet-400 sm:px-8 sm:py-4 sm:text-base"
                type="button"
              >
                Try the dashboard
                <span className="transition-transform group-hover:translate-x-1">→</span>
              </button>
              <button
                onClick={onSignUp}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-800 px-7 py-3 text-sm font-semibold text-slate-200 transition hover:border-indigo-400/70 hover:text-white sm:px-8 sm:py-4 sm:text-base"
                type="button"
              >
                Create a free account
              </button>
            </div>
          </section>
          <section className="hidden h-full flex-col justify-between rounded-3xl border border-slate-800/60 bg-slate-900/70 p-5 sm:p-6 lg:flex">
            <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-5 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.4em] text-slate-500">
                    Preview
                  </p>
                  <p className="mt-2 text-lg font-semibold text-slate-100">Signature request</p>
                </div>
                <span className="rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-medium text-indigo-200">
                  Draft
                </span>
              </div>
              <div className="mt-6 space-y-4 text-sm text-slate-300">
                <div className="flex items-center justify-between rounded-xl border border-slate-800/60 bg-slate-900 px-4 py-3">
                  <span className="font-medium text-slate-200">Service Agreement.pdf</span>
                  <span className="text-xs text-slate-500">2.4 MB</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-slate-800/60 bg-slate-900 px-4 py-3">
                  <span className="font-medium text-slate-200">Signer</span>
                  <span className="text-xs text-slate-500">you@winsign.com</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-slate-800/60 bg-slate-900 px-4 py-3">
                  <span className="font-medium text-slate-200">Status</span>
                  <span className="text-xs text-emerald-300">Ready to send</span>
                </div>
              </div>
            </div>
            <button
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-400"
              type="button"
            >
              Prepare document
              <span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                  className="h-4 w-4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 4.5v15m0 0-6.75-6.75M12 19.5l6.75-6.75"
                  />
                </svg>
              </span>
            </button>
          </section>
        </main>
        <footer className="hidden flex-none grid-cols-1 gap-4 lg:grid lg:grid-cols-[2fr_1fr]">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-3xl border border-slate-800/60 bg-slate-900/70 p-5 sm:p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-slate-500">
                Teams onboarded
              </p>
              <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-50">2.4k+</p>
              <p className="mt-2 text-xs text-slate-500">Trusted across legal, finance, and ops.</p>
            </div>
            <div className="rounded-3xl border border-slate-800/60 bg-slate-900/70 p-5 sm:p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-slate-500">
                Avg. send time
              </p>
              <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-50">42 sec</p>
              <p className="mt-2 text-xs text-slate-500">Upload to signature request.</p>
            </div>
            <div className="rounded-3xl border border-slate-800/60 bg-slate-900/70 p-5 sm:p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-slate-500">
                Satisfaction
              </p>
              <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-50">97%</p>
              <p className="mt-2 text-xs text-slate-500">Measured quarterly.</p>
            </div>
          </div>
          <div className="flex items-center justify-center rounded-3xl border border-slate-800/60 bg-slate-900/70 px-4 py-4 sm:py-5">
            <Versions />
          </div>
        </footer>
        <div className="mt-auto flex flex-none items-center justify-center rounded-3xl border border-slate-800/60 bg-slate-900/70 px-4 py-3 lg:hidden">
          <Versions />
        </div>
      </div>
    </div>
  )
}

LandingPage.propTypes = {
  onLogin: PropTypes.func,
  onSignUp: PropTypes.func,
  onTryDashboard: PropTypes.func
}

export default LandingPage
