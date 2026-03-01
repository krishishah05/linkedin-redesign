/* ============================================================
   PREMIUMPAGE.JS — LinkedIn Premium upsell page
   ============================================================ */
function PremiumPage() {
  const { showToast } = React.useContext(AppContext);

  const plans = [
    {
      name: 'Career',
      price: 39.99,
      color: '#F5A623',
      icon: '🎯',
      features: [
        '5 InMail messages per month',
        'See who viewed your profile',
        'LinkedIn Learning access',
        'Top Applicant insights',
        'Salary insights',
        'Interview preparation tools',
      ],
    },
    {
      name: 'Business',
      price: 59.99,
      color: '#0A66C2',
      icon: '💼',
      popular: true,
      features: [
        '15 InMail messages per month',
        'Unlimited profile searches',
        'Business insights',
        'Company growth trends',
        'LinkedIn Learning access',
        'Who viewed your profile (90 days)',
      ],
    },
    {
      name: 'Sales Navigator',
      price: 99.99,
      color: '#057642',
      icon: '📊',
      features: [
        '50 InMail messages per month',
        'Advanced lead search filters',
        'CRM integrations',
        'Real-time sales insights',
        'Custom lists and tags',
        'TeamLink — see team connections',
      ],
    },
  ];

  return (
    <div className="li-page-inner" style={{ maxWidth: 900 }}>
      {/* Hero */}
      <div className="li-card" style={{ textAlign: 'center', padding: '40px 24px', marginBottom: 24, background: 'linear-gradient(135deg,#f9f3e8 0%,#fff8ec 100%)' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>⭐</div>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>LinkedIn Premium</h1>
        <p style={{ color: 'var(--text-2)', fontSize: 16, maxWidth: 500, margin: '0 auto 20px' }}>
          Get the tools and insights you need to land your next job faster, grow your business, or find top talent.
        </p>
        <div style={{ display: 'inline-block', background: '#FFF3CD', color: '#856404', padding: '6px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600 }}>
          🎁 Try free for 1 month
        </div>
      </div>

      {/* Plans */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 24 }}>
        {plans.map(plan => (
          <div
            key={plan.name}
            className="li-card"
            style={{
              padding: 24,
              position: 'relative',
              border: plan.popular ? '2px solid var(--blue)' : '1px solid var(--border)',
            }}
          >
            {plan.popular && (
              <div style={{
                position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                background: 'var(--blue)', color: '#fff', fontSize: 11, fontWeight: 700,
                padding: '3px 12px', borderRadius: 20,
              }}>
                MOST POPULAR
              </div>
            )}
            <div style={{ fontSize: 28, marginBottom: 8 }}>{plan.icon}</div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: plan.color, marginBottom: 4 }}>{plan.name}</h2>
            <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>
              ${plan.price}<span style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-2)' }}>/mo</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 20 }}>Billed annually</div>
            <button
              className={plan.popular ? 'li-btn li-btn--primary' : 'li-btn li-btn--outline'}
              style={{ width: '100%', marginBottom: 20 }}
              onClick={() => showToast(`${plan.name} plan selected — free trial started!`)}
            >
              Start free trial
            </button>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {plan.features.map(f => (
                <li key={f} style={{ display: 'flex', gap: 8, fontSize: 13 }}>
                  <span style={{ color: '#057642', flexShrink: 0 }}>✓</span>
                  {f}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Comparison note */}
      <div className="li-card" style={{ padding: 20, textAlign: 'center' }}>
        <p style={{ color: 'var(--text-2)', fontSize: 13, margin: 0 }}>
          Cancel anytime. No commitment required.{' '}
          <a href="#" style={{ color: 'var(--blue)' }} onClick={e => { e.preventDefault(); showToast('Comparison chart — coming soon'); }}>
            Compare all plans →
          </a>
        </p>
      </div>
    </div>
  );
}
