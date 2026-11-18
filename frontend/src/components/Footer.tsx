export function Footer() {
  return (
    <footer className="border-t border-line bg-white">
      <div className="mx-auto flex w-[min(1060px,calc(100%_-_2.5rem))] items-center justify-between gap-5 py-7 max-[680px]:flex-col max-[680px]:text-center">
        <div>
          <p className="text-[1.1rem] font-[750]">Credit <span className="text-accent text-shadow-[0_0_8px_#17614935]">Wallet</span></p>
          <p className="mt-[.2rem] text-xs text-muted">© {new Date().getFullYear()} All Rights Reserved</p>
        </div>
        <nav className="flex gap-6 text-[.88rem] text-muted [&>a]:transition-[color,text-shadow] [&>a:hover]:text-accent [&>a:hover]:text-shadow-[0_0_8px_#17614940]" aria-label="Social links">
          <a href="https://github.com/tvsxar" target="_blank" rel="noopener noreferrer">GitHub</a>
          <a href="https://www.linkedin.com/in/poiatsyka/" target="_blank" rel="noopener noreferrer">LinkedIn</a>
        </nav>
      </div>
    </footer>
  );
}
