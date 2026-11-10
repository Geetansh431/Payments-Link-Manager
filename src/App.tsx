export function App() {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="app-header">
        <h1>Payment Links</h1>
      </header>
      <main id="main" className="app-main" tabIndex={-1}>
        <p>Create payment links and track whether they’ve been paid.</p>
      </main>
    </>
  );
}
