/* ============================================================
   LEARNINGPAGE.JS — Nexus Learning courses
   ============================================================ */
function LearningPage() {
  const { showToast } = React.useContext(AppContext);
  const { data: courses, loading, error } = useFetch(API.getCourses, []);
  const [tab, setTab] = React.useState('explore');
  const [searchQ, setSearchQ] = React.useState('');

  const tabs = ['My Learning', 'Completed', 'Saved', 'Explore'];

  if (loading) return <LoadingSpinner text="Loading courses..." />;
  if (error) return <ErrorMessage message={error} />;

  const allCourses = courses || [];
  const inProgress = allCourses.filter(c => c.isInProgress);
  const completed = allCourses.filter(c => c.isCompleted);
  const saved = allCourses.filter(c => c.isSaved);

  const tabCourses = {
    'my-learning': inProgress,
    'completed': completed,
    'saved': saved,
    'explore': allCourses,
  };
  const baseShown = tabCourses[tab] || allCourses;
  const shownCourses = (tab === 'explore' && searchQ.trim())
    ? baseShown.filter(c => {
        const q = searchQ.toLowerCase();
        return c.title?.toLowerCase().includes(q) || c.instructor?.toLowerCase().includes(q) || (Array.isArray(c.skills) && c.skills.some(s => s.toLowerCase().includes(q)));
      })
    : baseShown;

  return (
    <div className="li-page-inner" style={{ maxWidth: 900 }}>
      {/* Header */}
      <div className="li-card" style={{ padding: '20px 24px', marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Nexus Learning</h1>
        <p style={{ color: 'var(--text-2)', fontSize: 14, margin: 0 }}>
          Build the skills that matter for your career.
        </p>
      </div>

      {/* Tabs */}
      <div className="li-card" style={{ padding: 0, marginBottom: 16, overflow: 'hidden' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
          {tabs.map(t => (
            <button
              key={t}
              onClick={() => setTab(t.toLowerCase().replace(' ', '-'))}
              style={{
                padding: '14px 20px',
                fontSize: 14,
                fontWeight: 600,
                color: tab === t.toLowerCase().replace(' ', '-') ? 'var(--text)' : 'var(--text-2)',
                background: 'none',
                border: 'none',
                borderBottom: tab === t.toLowerCase().replace(' ', '-') ? '2px solid var(--text)' : '2px solid transparent',
                cursor: 'pointer',
                marginBottom: -1,
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div>
        {/* Search bar (only on explore) */}
        {tab === 'explore' && (
          <div style={{ marginBottom: 16, position: 'relative' }}>
            <input
              type="text"
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              placeholder="Search courses, skills, and more..."
              style={{
                width: '100%', padding: '12px 16px 12px 40px',
                border: '1px solid var(--border-2)', borderRadius: 4,
                fontSize: 14, outline: 'none', background: 'var(--white)',
                color: 'var(--text)', boxSizing: 'border-box',
              }}
            />
            <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}
              width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            </svg>
          </div>
        )}

        {shownCourses.length === 0 ? (
          <div className="li-card" style={{ padding: 40, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>Learn</div>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
              {tab === 'my-learning' && 'No courses in progress'}
              {tab === 'completed' && 'No completed courses yet'}
              {tab === 'saved' && 'No saved courses'}
            </h3>
            <p style={{ color: 'var(--text-2)', fontSize: 14, marginBottom: 16 }}>
              Explore our library and start learning today.
            </p>
            <button className="li-btn li-btn--primary li-btn--sm" onClick={() => setTab('explore')}>
              Browse courses
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
            {shownCourses.map(course => (
              <div key={course.id} className="li-card" style={{ padding: 0, overflow: 'hidden', cursor: 'pointer' }}
                onClick={() => showToast(`"${course.title}" — starting course...`)}>
                {/* Thumbnail */}
                <div style={{
                  height: 140,
                  background: course.thumbnail || course.coverGradient || `linear-gradient(135deg, #0a66c2, #004182)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 40,
                }}>
                  {!course.thumbnail && (course.emoji || '')}
                  {course.thumbnail && (
                    <img src={course.thumbnail} alt={course.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  )}
                </div>
                <div style={{ padding: 16 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, lineHeight: 1.3 }}>{course.title}</h3>
                  <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 8 }}>{course.instructor}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, color: '#b45309', fontWeight: 600 }}>
                      {'★'.repeat(Math.floor(course.rating || 4))} {course.rating}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text-2)' }}>({formatNumber(course.reviews || course.students || 0)})</span>
                    <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{course.duration}</span>
                  </div>
                  {course.level && (
                    <span style={{
                      fontSize: 11, padding: '2px 8px', borderRadius: 12,
                      background: 'var(--bg-2)', color: 'var(--text-2)', fontWeight: 600,
                    }}>
                      {course.level}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
