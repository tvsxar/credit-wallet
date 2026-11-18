import { useRef, useState, type FormEvent } from "react";
import { api, errorMessage } from "../api/client";
import type { Session } from "../types/api";

export function AuthForm({ onSession }: { onSession: (session: Session) => void }) {
  const [register, setRegister] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submitting = useRef(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    const fields = new FormData(event.currentTarget);
    const email = String(fields.get("email")).trim();
    const password = String(fields.get("password"));
    submitting.current = true;
    setBusy(true);
    setError("");
    try {
      if (register) await api.signUp(String(fields.get("name")).trim(), email, password);
      else await api.signIn(email, password);
      const session = await api.session();
      if (!session) throw new Error("No session was saved. Check that your browser allows session cookies for this app.");
      onSession(session);
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  return (
    <main className="grid grid-cols-2 p-4 max-[680px]:grid-cols-1 max-[680px]:grid-rows-[auto_1fr] max-[680px]:p-[.6rem]">
      <section className="flex flex-col items-start justify-between gap-10 rounded-3xl bg-[#10392d] bg-[radial-gradient(ellipse_at_bottom_right,#2b6248,transparent_72%)] p-[clamp(1.5rem,5vw,4.5rem)] text-white max-[680px]:gap-[1.35rem]">
        <div className="inline-flex items-center gap-[.65rem] font-[750] whitespace-nowrap"><span className="grid size-[34px] place-items-center rounded-[10px] bg-mint text-[1.3rem] text-[#10362a]" aria-hidden="true">↗</span> Credit Wallet</div>
        <div>
          <p className="mb-4 text-mint text-[.72rem] font-[750] uppercase tracking-[.15em]">Payment Lab</p>
          <h1 className="text-[clamp(2.8rem,6.5vw,6rem)] leading-[1.05] max-[680px]:text-[2.35rem]">Your credits.<br className="max-[680px]:hidden" /> One wallet.</h1>
          <p className="mt-4 max-w-[27ch] text-[#d2e3da]">Buy credit packs with Stripe and see every movement in your wallet.</p>
        </div>
        <div className="grid size-[94px] place-items-center rounded-full border border-white/25 text-[2.8rem] text-mint shadow-[inset_0_0_0_12px_#ffffff0a] max-[680px]:hidden" aria-hidden="true"><span>↗</span></div>
      </section>
      <section className="grid place-items-center p-[clamp(1.5rem,5vw,4rem)] max-[680px]:px-[.85rem] max-[680px]:py-8">
        <div className="w-full max-w-96">
          <h2 className="text-[clamp(1.9rem,4vw,2.6rem)]">{register ? "Create your account" : "Welcome back"}</h2>
          <p className="mt-[.4rem] mb-[1.8rem] text-muted">{register ? "Set up your Credit Wallet." : "Sign in to manage your credits."}</p>
          <form key={String(register)} onSubmit={submit}>
            <fieldset className="grid min-w-0 gap-4" disabled={busy}>
              {register && <label>Name<input name="name" autoComplete="name" required /></label>}
              <label>Email<input name="email" type="email" autoComplete="email" required /></label>
              <label>Password<input name="password" type="password" autoComplete={register ? "new-password" : "current-password"} minLength={register ? 8 : undefined} required /></label>
              {error && <p className="rounded-[10px] border border-[#f2d0cd] bg-[#fff0ef] px-4 py-3 text-[#8d262b]" role="alert">{error}</p>}
              <button className="min-h-[42px] rounded-[10px] border border-transparent bg-[#174c3a] px-4 py-[.65rem] text-[.88rem] font-[650] text-white enabled:hover:bg-[#103b2c]" type="submit">
                {busy ? "Please wait…" : register ? "Create account" : "Sign in"}
              </button>
            </fieldset>
          </form>
          <p className="mt-5 text-[.88rem] text-muted">{register ? "Already have an account?" : "New to Credit Wallet?"}{" "}
            <button type="button" className="bg-transparent p-1 font-[750] text-accent" disabled={busy} onClick={() => {
              setRegister(!register);
              setError("");
            }}>{register ? "Sign in" : "Create an account"}</button>
          </p>
        </div>
      </section>
    </main>
  );
}
