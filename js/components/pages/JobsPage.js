/* ============================================================
   JOBSPAGE.JS - Jobs search with readable job details
   ============================================================ */

function JobsPage({ selectedJobId }) {
  const { savedJobs, toggleSaveJob, openModal, showToast, appliedJobs, applyJob } = React.useContext(AppContext);
  const { data: jobs, loading, error } = useFetch(API.getJobs, []);
  const [selectedId, setSelectedId] = React.useState(selectedJobId ? Number(selectedJobId) : null);
  const [searchQ, setSearchQ] = React.useState('');
  const [viewMode, setViewMode] = React.useState('all');
  const [detailCache, setDetailCache] = React.useState({});
  const [fetchingDetail, setFetchingDetail] = React.useState(null);

  React.useEffect(() => {
    if (jobs && jobs.length && !selectedId) setSelectedId(jobs[0].id);
  }, [jobs, selectedId]);

  React.useEffect(() => {
    if (!selectedId || detailCache[selectedId]) return;
    let cancelled = false;
    const requestId = selectedId;
    setFetchingDetail(requestId);
    API.getJob(requestId)
      .then(full => { if (!cancelled) setDetailCache(prev => ({ ...prev, [requestId]: full })); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setFetchingDetail(prev => (prev === requestId ? null : prev)); });
    return () => { cancelled = true; };
  }, [selectedId, detailCache]);

  // Derived state computed before the third useEffect so the effect closure can
  // reference `filtered` — all hooks must run unconditionally before any early return.
  const allJobs = jobs || [];
  const savedOnly = allJobs.filter(j => savedJobs.has(String(j.id)));
  const visibleSource = viewMode === 'saved' ? savedOnly : allJobs;
  const filtered = visibleSource.filter(j => {
    if (!searchQ.trim()) return true;
    const q = searchQ.toLowerCase();
    return [j.title, j.company, j.location, j.type, j.level, ...(j.skills || [])]
      .filter(Boolean)
      .some(v => String(v).toLowerCase().includes(q));
  });

  // Must be declared BEFORE the early returns below — Rules of Hooks.
  React.useEffect(() => {
    if (!jobs) return;
    if (!filtered.length) {
      setSelectedId(null);
      return;
    }
    if (!filtered.some(j => j.id === selectedId)) setSelectedId(filtered[0].id);
  }, [viewMode, searchQ, jobs, selectedId, savedJobs]);

  // Early returns are safe here: all hooks have already been called above.
  if (loading) return <LoadingSpinner text="Loading jobs..." />;
  if (error) return <ErrorMessage message={error} />;

  const isApplied = (jobId) => appliedJobs.has(String(jobId));
  const baseJob = allJobs.find(j => j.id === selectedId) || filtered[0];
  const selectedJob = baseJob ? (detailCache[baseJob.id] || baseJob) : null;

  return (
    <div className="li-page-inner">
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="li-card" style={{ padding: '14px 16px', marginBottom: 16, overflow: 'visible' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: '1 1 280px' }}>
              <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', opacity: 0.45 }}
                width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
              </svg>
              <input
                type="text"
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                placeholder="Search by title, company, skill, or location"
                style={{
                  width: '100%', padding: '9px 12px 9px 34px',
                  border: '1px solid var(--border-2)', borderRadius: 6,
                  fontSize: 14, outline: 'none', background: 'var(--white)', color: 'var(--text)',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
              {[
                { id: 'all', label: `All jobs (${allJobs.length})` },
                { id: 'saved', label: `Saved jobs (${savedOnly.length})` },
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setViewMode(tab.id)}
                  style={{
                    padding: '8px 12px', border: 'none', borderRight: tab.id === 'all' ? '1px solid var(--border)' : 'none',
                    background: viewMode === tab.id ? 'var(--blue)' : 'var(--white)',
                    color: viewMode === tab.id ? '#fff' : 'var(--text-2)',
                    fontSize: 13, fontWeight: 700,
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <div style={{ width: 350, flexShrink: 0 }}>
            <div style={{ marginBottom: 8, fontSize: 13, color: 'var(--text-2)' }}>
              {filtered.length} result{filtered.length !== 1 ? 's' : ''}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
              {filtered.length === 0 && (
                <div style={{ padding: 20, background: 'var(--white)', color: 'var(--text-2)', fontSize: 14 }}>
                  No jobs match this view.
                </div>
              )}
              {filtered.map((job, i) => (
                <JobListItem
                  key={job.id}
                  job={job}
                  active={selectedJob && job.id === selectedJob.id}
                  isSaved={savedJobs.has(String(job.id))}
                  isApplied={isApplied(job.id)}
                  isLast={i === filtered.length - 1}
                  onSelect={() => setSelectedId(job.id)}
                  onSave={() => {
                    const wasSaved = savedJobs.has(String(job.id));
                    toggleSaveJob(job.id);
                    showToast(wasSaved ? 'Job removed from saved jobs' : 'Job saved');
                  }}
                />
              ))}
            </div>
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            {!selectedJob ? (
              <div className="li-card li-job-detail-empty">
                <p>Select a job to view details.</p>
              </div>
            ) : (
              <JobDetailPanel
                job={selectedJob}
                descLoading={fetchingDetail === selectedJob.id}
                savedJobs={savedJobs}
                toggleSaveJob={toggleSaveJob}
                openModal={openModal}
                showToast={showToast}
                isApplied={isApplied}
                applyJob={applyJob}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function JobListItem({ job, active, isSaved, isApplied, isLast, onSelect, onSave }) {
  return (
    <div style={{
      background: active ? '#EAF4FF' : 'var(--white)',
      borderBottom: isLast ? 'none' : '1px solid var(--border)',
      borderLeft: active ? '3px solid var(--blue)' : '3px solid transparent',
      transition: 'background 0.1s',
    }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '16px 16px 0' }}>
        <button
          type="button"
          onClick={onSelect}
          style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flex: 1, minWidth: 0, background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}
        >
          <div style={{
            width: 40, height: 40, borderRadius: 6, background: 'var(--bg-2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0, fontWeight: 800, color: 'var(--text-2)',
          }}>{(job.company || 'J')[0].toUpperCase()}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2, color: active ? 'var(--blue)' : 'var(--text)', lineHeight: 1.3 }}>
              {job.title}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-2)' }}>{job.company}</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{[job.location, job.type].filter(Boolean).join(' | ')}</div>
            {job.salary && <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 4 }}>{job.salary}</div>}
          </div>
        </button>
        <button
          type="button"
          onClick={onSave}
          aria-label={isSaved ? 'Remove saved job' : 'Save job'}
          title={isSaved ? 'Remove saved job' : 'Save job'}
          style={{
            background: isSaved ? 'var(--blue-light)' : 'var(--white)',
            border: '1px solid var(--border)',
            borderRadius: 6,
            cursor: 'pointer',
            padding: '4px 8px',
            fontSize: 12,
            fontWeight: 700,
            color: isSaved ? 'var(--blue)' : 'var(--text-2)',
            flexShrink: 0,
          }}
        >
          {isSaved ? 'Saved' : 'Save'}
        </button>
      </div>
      <div style={{ padding: '8px 16px 16px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {isApplied && (
          <span style={{ fontSize: 11, fontWeight: 700, color: '#1e7e34', background: '#E6F4EA', padding: '2px 6px', borderRadius: 4 }}>
            Applied
          </span>
        )}
        {job.easyApply && !isApplied && (
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--blue)', background: '#EAF4FF', padding: '2px 6px', borderRadius: 4 }}>
            Easy Apply
          </span>
        )}
      </div>
    </div>
  );
}

function JobDetailPanel({ job, descLoading, savedJobs, toggleSaveJob, openModal, showToast, isApplied, applyJob }) {
  const [pendingApply, setPendingApply] = React.useState(false);
  React.useEffect(() => { setPendingApply(false); }, [job.id]);

  const sections = parseJobDescription(job.description || job.summary || '');

  return (
    <div className="li-card" style={{ padding: 24 }}>
      <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
        <div style={{
          width: 56, height: 56, borderRadius: 8, background: 'var(--bg-2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0, fontWeight: 800, color: 'var(--text-2)',
        }}>{((job.company || '').trim() || 'J')[0].toUpperCase()}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ fontSize: 21, fontWeight: 750, margin: '0 0 4px', lineHeight: 1.25 }}>{job.title}</h2>
          <div style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 3 }}>
            <span style={{ color: 'var(--blue)', fontWeight: 650 }}>{job.company}</span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-2)' }}>
            {[job.location, job.type, job.posted].filter(Boolean).join(' | ')}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {[job.salary, job.type, job.level].filter(Boolean).map(item => (
          <span key={item} style={{ fontSize: 13, background: 'var(--bg-2)', color: 'var(--text-2)', padding: '5px 10px', borderRadius: 12, border: '1px solid var(--border)' }}>
            {item}
          </span>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: pendingApply ? 8 : 24 }}>
        <button
          className="li-btn li-btn--primary"
          onClick={() => {
            if (isApplied(job.id)) return;
            let urlValid = false;
            try {
              const parsed = new URL(job.url || '');
              urlValid = parsed.protocol === 'http:' || parsed.protocol === 'https:';
            } catch (_) {}
            if (urlValid) {
              const win = window.open(job.url, '_blank', 'noopener,noreferrer');
              if (win && !win.closed) setPendingApply(true);
              else openModal('apply', { jobTitle: job.title, job, onApply: () => applyJob(job.id) });
            } else {
              openModal('apply', { jobTitle: job.title, job, onApply: () => applyJob(job.id) });
            }
          }}
          style={{ flex: 1, opacity: isApplied(job.id) ? 0.7 : 1 }}
          disabled={isApplied(job.id)}
        >
          {isApplied(job.id) ? 'Applied' : 'Apply now'}
        </button>
        <button
          className="li-btn li-btn--ghost"
          onClick={() => {
            const wasSaved = savedJobs.has(String(job.id));
            toggleSaveJob(job.id);
            showToast(wasSaved ? 'Job removed from saved jobs' : 'Job saved');
          }}
        >
          {savedJobs.has(String(job.id)) ? 'Saved' : 'Save job'}
        </button>
      </div>

      {pendingApply && (
        <div style={{
          background: '#EAF4FF', border: '1px solid var(--blue)', borderRadius: 6,
          padding: '10px 14px', marginBottom: 20,
          display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: 13, flex: 1 }}>Did you complete your application?</span>
          <button className="li-btn li-btn--primary li-btn--sm" onClick={() => { applyJob(job.id); setPendingApply(false); showToast('Marked as applied', 'success'); }}>
            Yes, I applied
          </button>
          <button className="li-btn li-btn--ghost li-btn--sm" onClick={() => setPendingApply(false)}>
            Not yet
          </button>
        </div>
      )}

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 750, marginBottom: 12 }}>About the job</h3>
        {descLoading ? (
          <p style={{ fontSize: 14, color: 'var(--text-3)' }}>Loading description...</p>
        ) : sections.length ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {sections.map((section, idx) => (
              <section key={`${section.title}-${idx}`}>
                {section.title && (
                  <h4 style={{ fontSize: 14, fontWeight: 750, margin: '0 0 7px', color: 'var(--text)' }}>{section.title}</h4>
                )}
                {section.paragraphs.map((p, i) => (
                  <p key={i} style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.65, margin: i ? '8px 0 0' : 0 }}>{p}</p>
                ))}
                {section.items.length > 0 && (
                  <ul style={{ listStyle: 'disc', paddingLeft: 20, margin: section.paragraphs.length ? '10px 0 0' : 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {section.items.map((item, i) => (
                      <li key={i} style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.5 }}>{item}</li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        ) : (
          <p style={{ fontSize: 14, color: 'var(--text-2)' }}>No description provided.</p>
        )}
      </div>

      {job.skills && job.skills.length > 0 && (
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 750, marginBottom: 10 }}>Skills</h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {job.skills.map(skill => (
              <span key={skill} style={{
                fontSize: 13, background: 'var(--bg-2)', color: 'var(--text)',
                padding: '4px 12px', borderRadius: 16, border: '1px solid var(--border)',
              }}>
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function parseJobDescription(raw) {
  const text = htmlToText(raw)
    .replace(/\u00a0/g, ' ')
    .replace(/\s*[-]\s*(Health benefits|Financial benefits|Paid time off benefits|Other benefits)/g, '\n$1')
    .replace(/\s*(You will sweep us off our feet if:|You will make an impact by:|What you.ll do...|Minimum Qualifications...|Preferred Qualifications...|Primary Location...)/g, '\n$1\n')
    .replace(/\s*(Be a Team Member:|Be an Expert:|Be a Techie:|Be an Owner:|Be a Talent Ambassador:)/g, '\n$1 ')
    .replace(/\s*[•]\s*/g, '\n- ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  if (!text) return [];

  const headings = new Set([
    'About the job',
    'Position Summary',
    'You will sweep us off our feet if:',
    'You will make an impact by:',
    "What you'll do...",
    'Minimum Qualifications...',
    'Preferred Qualifications...',
    'Primary Location...',
  ]);

  const normalized = text
    .replace(/^Position Summary\.\.\./, 'Position Summary')
    .replace(/What you.ll do\.\.\./g, "What you'll do...")
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);

  const sections = [];
  let current = { title: 'Summary', paragraphs: [], items: [] };

  function pushCurrent() {
    if (current.paragraphs.length || current.items.length) sections.push(current);
  }

  normalized.forEach(line => {
    const clean = line.replace(/\s+/g, ' ').trim();
    if (headings.has(clean) || clean.endsWith('Qualifications...') || clean === 'Position Summary') {
      pushCurrent();
      current = { title: clean.replace(/\.\.\.$/, ''), paragraphs: [], items: [] };
    } else if (clean.startsWith('- ')) {
      current.items.push(clean.slice(2).trim());
    } else if (/^(Be a Team Member:|Be an Expert:|Be a Techie:|Be an Owner:|Be a Talent Ambassador:)/.test(clean)) {
      const parts = clean.split(':');
      pushCurrent();
      current = { title: parts[0], paragraphs: [parts.slice(1).join(':').trim()], items: [] };
    } else {
      splitLongParagraph(clean).forEach(p => current.paragraphs.push(p));
    }
  });
  pushCurrent();

  return sections.filter(section => section.title || section.paragraphs.length || section.items.length);
}

function splitLongParagraph(text) {
  if (text.length <= 420) return [text];
  return text
    .replace(/([.!?])\s+(?=[A-Z])/g, '$1\n')
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean);
}

function htmlToText(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(String(html || ''), 'text/html');
  doc.querySelectorAll('script,style').forEach(e => e.remove());
  return doc.body ? (doc.body.textContent || '') : '';
}
