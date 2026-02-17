export default function Dashboard() {
  return (
    <main style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 20px' }}>
      <header style={{ marginBottom: 40 }}>
        <h1 style={{ fontSize: '2.5rem', margin: '0 0 10px' }}>Social Arbitrage</h1>
        <p style={{ color: '#888', margin: 0 }}>Find the edge in what people are actually talking about</p>
      </header>

      {/* Signal Feed */}
      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: '1.2rem', color: '#0d9488', marginBottom: 20 }}>
          🚨 Active Signals
        </h2>
        
        <div style={{ 
          background: '#111', 
          borderRadius: 12, 
          padding: 24,
          border: '1px solid #222'
        }}>
          <p style={{ color: '#666', margin: 0 }}>
            Signals will appear here once X API is connected.
            <br /><br />
            Run: <code style={{ background: '#222', padding: '2px 6px', borderRadius: 4 }}>npm run ingest</code>
          </p>
        </div>
      </section>

      {/* Watchlist */}
      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: '1.2rem', color: '#888', marginBottom: 20 }}>
          👁️ Watchlist
        </h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
          {[
            { cat: 'Energy Drinks', keywords: 'Celsius, Ghost, Prime', ticker: 'CELH' },
            { cat: 'Athleisure', keywords: 'Lululemon, Gymshark', ticker: 'LULU' },
            { cat: 'Gaming', keywords: 'Roblox, Fortnite', ticker: 'RBLX' },
            { cat: 'AI Tools', keywords: 'ChatGPT, Claude', ticker: 'MSFT' },
            { cat: 'Crypto', keywords: 'Bitcoin, Coinbase', ticker: 'COIN' },
            { cat: 'EVs', keywords: 'Tesla, Rivian', ticker: 'TSLA' },
          ].map((item) => (
            <div key={item.cat} style={{
              background: '#111',
              borderRadius: 8,
              padding: 16,
              border: '1px solid #222'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontWeight: 600 }}>{item.cat}</span>
                <span style={{ 
                  background: '#0d9488', 
                  color: '#fff', 
                  padding: '2px 8px', 
                  borderRadius: 4,
                  fontSize: '0.8rem'
                }}>
                  ${item.ticker}
                </span>
              </div>
              <p style={{ color: '#666', fontSize: '0.85rem', margin: 0 }}>
                {item.keywords}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Strategy */}
      <section>
        <h2 style={{ fontSize: '1.2rem', color: '#888', marginBottom: 20 }}>
          📊 Strategy
        </h2>
        
        <div style={{ 
          background: '#111', 
          borderRadius: 12, 
          padding: 24,
          border: '1px solid #222'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24 }}>
            <div>
              <h3 style={{ fontSize: '0.9rem', color: '#0d9488', marginBottom: 8 }}>Entry</h3>
              <p style={{ color: '#888', fontSize: '0.9rem', margin: 0 }}>
                Monday open based on weekend social accumulation
              </p>
            </div>
            <div>
              <h3 style={{ fontSize: '0.9rem', color: '#0d9488', marginBottom: 8 }}>Exit</h3>
              <p style={{ color: '#888', fontSize: '0.9rem', margin: 0 }}>
                Friday close or on signal decay
              </p>
            </div>
            <div>
              <h3 style={{ fontSize: '0.9rem', color: '#0d9488', marginBottom: 8 }}>Hold</h3>
              <p style={{ color: '#888', fontSize: '0.9rem', margin: 0 }}>
                Max 1-2 weeks for momentum plays
              </p>
            </div>
            <div>
              <h3 style={{ fontSize: '0.9rem', color: '#0d9488', marginBottom: 8 }}>Edge</h3>
              <p style={{ color: '#888', fontSize: '0.9rem', margin: 0 }}>
                Cultural signal detection ahead of earnings
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer style={{ marginTop: 60, paddingTop: 20, borderTop: '1px solid #222', color: '#444', fontSize: '0.85rem' }}>
        The Department of Quietly Getting Things Done
      </footer>
    </main>
  )
}
