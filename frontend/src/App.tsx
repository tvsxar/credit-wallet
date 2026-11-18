import { useCallback, useEffect, useState } from "react";
import { ApiError, api, errorMessage } from "./api/client";
import type { Session } from "./types/api";
import { AuthForm } from "./components/AuthForm";
import { Wallet } from "./components/Wallet";

const paymentReturn = window.location.pathname === "/payment/success"
  ? "success"
  : window.location.pathname === "/payment/cancel" ? "cancel" : null;

export function App() {
  const [session, setSession] = useState<Session | null>();
  const [sessionError, setSessionError] = useState("");
  const [notice, setNotice] = useState("");
  const [signingOut, setSigningOut] = useState(false);

  const expireSession = useCallback(() => {
    setNotice("Your session ended. Sign in again to open your wallet.");
    setSession(null);
  }, []);

  const restoreSession = useCallback(async () => {
    setSessionError("");
    try {
      setSession(await api.session());
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) setSession(null);
      else setSessionError(errorMessage(error));
    }
  }, []);

  useEffect(() => { void restoreSession(); }, [restoreSession]);

  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    setNotice("");
    try {
      await api.signOut();
      setSession(null);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) setSession(null);
      else setNotice(errorMessage(error));
    } finally {
      setSigningOut(false);
    }
  }

  if (session === undefined) {
    return <main className="mx-auto my-[12vh] w-full max-w-[38rem] space-y-4 p-6 text-center">
      {sessionError ? <>
        <h1>Could not open your wallet</h1>
        <p role="alert">{sessionError}</p>
        <button className="button-secondary" onClick={restoreSession}>Try again</button>
      </> : <p role="status">Checking your session…</p>}
    </main>;
  }

  if (!session) {
    return <>
      {notice && <div className="bg-[#eaf2e7] px-4 py-[.8rem] text-center" role="status">{notice}</div>}
      <AuthForm onSession={(session) => { setNotice(""); setSession(session); }} />
    </>;
  }

  return (
    <>
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex min-h-[70px] w-[min(1060px,calc(100%_-_2.5rem))] items-center justify-between gap-[.85rem] max-[680px]:w-[calc(100%_-_1.5rem)]">
          <a className="inline-flex items-center gap-[.65rem] font-[750] whitespace-nowrap" href="/"><span className="grid size-[34px] place-items-center rounded-[10px] bg-mint text-[1.3rem] text-[#10362a]" aria-hidden="true">↗</span> Credit Wallet</a>
          <div className="flex items-center justify-between gap-[.85rem]">
            <span className="max-w-[20ch] truncate text-[.88rem] text-muted max-[680px]:hidden" title={session.user.email}>{session.user.name}</span>
            <button className="button-secondary" onClick={signOut} disabled={signingOut}>
              {signingOut ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </div>
      </header>
      {notice && <div className="bg-[#eaf2e7] px-4 py-[.8rem] text-center" role="alert">{notice}</div>}
      <Wallet paymentReturn={paymentReturn} onUnauthorized={expireSession} />
    </>
  );
}
