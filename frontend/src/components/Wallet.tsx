import { useEffect, useRef, useState } from "react";
import { ApiError, api, errorMessage } from "../api/client";
import type { Product, Transaction } from "../types/api";

const PAGE_SIZE = 20;
const REFRESH_DELAY_MS = 2500;
const MAX_RETURN_REFRESHES = 8;
const numberFormat = new Intl.NumberFormat();
const euro = new Intl.NumberFormat(undefined, { style: "currency", currency: "EUR" });
const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

interface WalletData {
  credits: string | number;
  products: Product[];
  transactions: Transaction[];
  page: number;
}

function formatCredits(credits: string | number) {
  return numberFormat.format(typeof credits === "string" ? BigInt(credits) : credits);
}

interface WalletProps {
  paymentReturn: "success" | "cancel" | null;
  onUnauthorized: () => void;
}

export function Wallet({ paymentReturn, onUnauthorized }: WalletProps) {
  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [data, setData] = useState<WalletData>();
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [checkoutError, setCheckoutError] = useState("");
  const [buying, setBuying] = useState<number | null>(null);
  const checkoutInProgress = useRef(false);

  useEffect(() => {
    let active = true;
    let timer: number | undefined;
    let remaining = paymentReturn === "success" && page === 1 ? MAX_RETURN_REFRESHES : 0;
    setLoading(true);
    setPolling(remaining > 0);

    async function load() {
      try {
        const [balance, catalog, history] = await Promise.all([
          api.balance(), api.products(), api.transactions(page),
        ]);
        if (!active) return;
        setData({ ...balance, ...catalog, ...history, page });
        setLoadError("");
        if (remaining > 0) {
          remaining -= 1;
          timer = window.setTimeout(load, REFRESH_DELAY_MS);
        } else {
          setPolling(false);
        }
      } catch (error) {
        if (!active) return;
        if (error instanceof ApiError && error.status === 401) onUnauthorized();
        else setLoadError(errorMessage(error));
        setPolling(false);
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [page, refresh, paymentReturn, onUnauthorized]);

  useEffect(() => {
    function restoreFromCheckout(event: PageTransitionEvent) {
      if (!event.persisted) return;
      checkoutInProgress.current = false;
      setBuying(null);
      setRefresh((value) => value + 1);
    }

    window.addEventListener("pageshow", restoreFromCheckout);
    return () => window.removeEventListener("pageshow", restoreFromCheckout);
  }, []);

  async function buy(productId: number) {
    if (checkoutInProgress.current) return;
    checkoutInProgress.current = true;
    setBuying(productId);
    setCheckoutError("");
    try {
      const { checkoutUrl } = await api.order(productId);
      if (!checkoutUrl) throw new Error("Checkout is unavailable for this order. No payment page was opened.");
      const url = new URL(checkoutUrl);
      if (url.protocol !== "https:") throw new Error("The server returned an invalid checkout link.");
      window.location.assign(url.href);
      return;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) onUnauthorized();
      else setCheckoutError(errorMessage(error));
      if (error instanceof ApiError && [404, 409].includes(error.status)) setRefresh((value) => value + 1);
      checkoutInProgress.current = false;
      setBuying(null);
    }
  }

  const transactions = data?.page === page ? data.transactions : undefined;

  return (
    <main className="mx-auto w-[min(1060px,calc(100%_-_2.5rem))] py-[clamp(1.75rem,6vw,4rem)] max-[680px]:w-[calc(100%_-_1.5rem)]">
      <p className="mb-[.6rem] text-accent text-[.72rem] font-[750] uppercase tracking-[.15em]">Payment Lab</p>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-[.85rem]">
        <h1>Your wallet</h1>
        <button className="button-secondary" disabled={loading} onClick={() => setRefresh((value) => value + 1)}>Refresh wallet</button>
      </div>
      {paymentReturn && <section className="mb-4 flex flex-wrap items-center justify-between gap-[.85rem] rounded-[14px] border border-[#cce1c7] bg-[#e8f3e5] px-[1.2rem] py-4" aria-labelledby="return-title">
        <div>
          <h2 id="return-title" className="text-[1.1rem]">{paymentReturn === "success" ? "Returned from Stripe Checkout" : "Checkout canceled"}</h2>
          <p>{paymentReturn === "success"
            ? "Credits appear in your activity once the server processes the payment."
            : "You can start another checkout from the catalog."}</p>
          {polling && <p className="text-muted" role="status">Refreshing wallet activity…</p>}
        </div>
        <a className="text-[.88rem] font-[650] text-accent underline" href="/">Back to wallet</a>
      </section>}
      {loadError && <p className="mb-4 rounded-[10px] border border-[#f2d0cd] bg-[#fff0ef] px-4 py-3 text-[#8d262b]" role="alert">{loadError} Use Refresh wallet to retry.</p>}
      <section className="flex min-h-[180px] items-center justify-between gap-4 rounded-[20px] bg-[linear-gradient(115deg,#10392d,#205945)] p-[clamp(1.15rem,4vw,2.2rem)] text-white" aria-labelledby="balance-title">
        <div className="min-w-0">
          <h2 id="balance-title" className="text-[.92rem] tracking-normal text-[#ccdfd5]">Available balance</h2>
          {data ? <p className="mt-[.55rem] text-[clamp(2.25rem,6vw,4.25rem)] leading-[1.1] font-bold tracking-[-.05em] wrap-anywhere">{formatCredits(data.credits)} <span className="text-base tracking-normal text-mint">credits</span></p>
            : <p role="status">{loading ? "Loading balance…" : "Balance unavailable"}</p>}
        </div>
        <span className="grid aspect-square basis-16 shrink-0 place-items-center rounded-full border border-white/25 text-[2rem] text-mint max-[680px]:basis-[42px] max-[680px]:text-[1.3rem]" aria-hidden="true">↗</span>
      </section>
      <section className="mt-8" aria-labelledby="catalog-title">
        <h2 id="catalog-title" className="mb-[.85rem]">Credit packs</h2>
        {checkoutError && <p className="mb-[.85rem] rounded-[10px] border border-[#f2d0cd] bg-[#fff0ef] px-4 py-3 text-[#8d262b]" role="alert">{checkoutError}</p>}
        {!data ? <p className="text-muted">{loading ? "Loading credit packs…" : "Credit packs unavailable."}</p>
          : data.products.length ? <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,14rem),1fr))] gap-[.85rem]">
            {data.products.map((product) => <article className="grid content-start gap-3 rounded-[14px] border border-line bg-white p-[1.15rem]" key={product.id}>
              <h3 className="text-base">{product.name}</h3>
              <p className="text-[1.7rem] leading-[1.2] font-[720]">{formatCredits(product.credits)} <span className="text-[.85rem] font-medium text-muted">credits</span></p>
              <button className="button-secondary justify-self-start" onClick={() => buy(product.id)} disabled={buying !== null}>
                {buying === product.id ? "Opening checkout…" : `Buy for ${euro.format(product.price_cents / 100)}`}
              </button>
            </article>)}
          </div> : <p className="p-[1.15rem] text-muted rounded-[14px] border border-line bg-white">No credit packs are available yet.</p>}
      </section>
      <section className="mt-8" aria-labelledby="activity-title">
        <h2 id="activity-title" className="mb-[.85rem]">Activity</h2>
        <div className="rounded-[14px] border border-line bg-white" aria-busy={loading}>
          {!transactions ? <p className="p-[1.15rem] text-muted">{loading ? "Loading activity…" : "Activity unavailable."}</p>
            : transactions.length ? <div className="overflow-x-auto">
              <table className="w-full text-left text-[.88rem]">
                <thead><tr><th scope="col">Transaction</th><th scope="col">Date</th><th scope="col">Credits</th></tr></thead>
                <tbody>{transactions.map((transaction) => <tr key={transaction.id}>
                  <td>{transaction.order_id === null ? "Credits used" : `Order #${transaction.order_id}`}</td>
                  <td><time dateTime={transaction.occurred_at}>{dateFormat.format(new Date(transaction.occurred_at))}</time></td>
                  <td className={transaction.type === "IN" ? "font-bold text-accent" : undefined}>
                    {transaction.type === "IN" ? "+" : "−"}{formatCredits(transaction.credits)}
                  </td>
                </tr>)}</tbody>
              </table>
            </div> : <p className="p-[1.15rem] text-muted">{page === 1 ? "Your transactions will appear here." : "No transactions on this page."}</p>}
          <nav className="flex items-center justify-between gap-[.85rem] px-4 py-3 text-[.85rem]" aria-label="Activity pages">
            <button className="button-secondary" disabled={page === 1 || loading} onClick={() => setPage(page - 1)}>Previous</button>
            <span aria-live="polite">Page {page}</span>
            <button className="button-secondary" disabled={loading || transactions?.length !== PAGE_SIZE} onClick={() => setPage(page + 1)}>Next</button>
          </nav>
        </div>
      </section>
    </main>
  );
}
