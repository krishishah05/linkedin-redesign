/* ============================================================
   JOBSPAGE.JS — Jobs search (split panel)
   ============================================================ */
function JobsPage({ selectedJobId }) {
  const { savedJobs, toggleSaveJob, openModal, showToast, appliedJobs, applyJob } = React.useContext(AppContext);
  const { data: jobs, loading, error } = useFetch(API.getJobs, []);
  const [selectedId, setSelectedId] = React.useState(selectedJobId ? Number(selectedJobId) : null);
  const [searchQ, setSearchQ] = React.useState('');

  React.useEffect(() => {
    if (jobs && jobs.length && !selectedId) setSelectedId(jobs[0].id);
  }, [jobs]);

  if (loading) return <LoadingSpinner text="Loading jobs..." />;
  if (error) return <ErrorMessage message={error} />;

  const allJobs = jobs || [];
  const filtered = allJobs.filter(j => {
    if (!searchQ.trim()) return true;
    const q = searchQ.toLowerCase();
    return j.title?.toLowerCase().includes(q) || j.company?.toLowerCase().includes(q) || j.location?.toLowerCase().includes(q);
  });
  const isApplied = (jobId) => appliedJobs.has(String(jobId));

  const selectedJob = allJobs.find(j => j.id === selectedId);

  return (
    <div className="li-page-inner">
      {/* Top search */}
      <div className="li-card" style={{ padding: '12px 16px', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}
              width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            </svg>
            <input
              type="text"
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              placeholder="Title, company, or keyword"
              style={{
                width: '100%', padding: '8px 12px 8px 34px',
                border: '1px solid var(--border-2)', borderRadius: 4,
                fontSize: 14, outline: 'none', background: 'var(--white)', color: 'var(--text)',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <button className="li-btn li-btn--primary li-btn--sm" onClick={() => setSearchQ(searchQ.trim())}>Search</button>
        </div>
      </div>


      {/* Split pane */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        {/* Job list */}
        <div style={{ width: 340, flexShrink: 0 }}>
          <div style={{ marginBottom: 8, fontSize: 13, color: 'var(--text-2)' }}>
            {filtered.length} results
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
            {filtered.map((job, i) => (
              <div
                key={job.id}
                onClick={() => setSelectedId(job.id)}
                style={{
                  padding: '16px',
                  background: job.id === selectedId ? '#EAF4FF' : 'var(--white)',
                  borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none',
                  cursor: 'pointer',
                  borderLeft: job.id === selectedId ? '3px solid var(--blue)' : '3px solid transparent',
                  transition: 'background 0.1s',
                }}
              >
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 4, background: 'var(--bg-2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0,
                  }}>Job</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2, color: job.id === selectedId ? 'var(--blue)' : 'var(--text)' }}>
                      {job.title}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-2)' }}>{job.company}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{job.location} · {job.type}</div>
                    {job.salary && <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 4 }}>{job.salary}</div>}
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); toggleSaveJob(job.id); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, fontSize: 16, color: savedJobs.has(String(job.id)) ? '#b45309' : 'var(--text-3)' }}
                    title={savedJobs.has(String(job.id)) ? 'Unsave' : 'Save'}
                  >
                    {savedJobs.has(String(job.id)) ? '★' : '☆'}
                  </button>
                </div>
                <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {isApplied(job.id) && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#1e7e34', background: '#E6F4EA', padding: '2px 6px', borderRadius: 4 }}>
                      ✓ Applied
                    </span>
                  )}
                  {job.easyApply && !isApplied(job.id) && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--blue)', background: '#EAF4FF', padding: '2px 6px', borderRadius: 4 }}>
                      Easy Apply
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Job detail */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {!selectedJob ? (
            <div className="li-card li-job-detail-empty">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 6h-2.18c.07-.44.18-.88.18-1.36C18 2.51 15.49 0 12.36 0c-1.4 0-2.72.56-3.71 1.56L12 4.91l3.35-3.35C15.69 2.65 16 3.32 16 4.07c0 .9-.66 1.65-1.5 1.8L14.18 6H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2z"/>
              </svg>
              <p>Select a job to view details</p>
            </div>
          ) : (
            <JobDetailPanel job={selectedJob} savedJobs={savedJobs} toggleSaveJob={toggleSaveJob} openModal={openModal} showToast={showToast} isApplied={isApplied} applyJob={applyJob} />
          )}
        </div>
      </div>
    </div>
  );
}

function JobDetailPanel({ job, savedJobs, toggleSaveJob, openModal, showToast, isApplied, applyJob }) {
  return (
    <div className="li-card" style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
        <div style={{
          width: 56, height: 56, borderRadius: 8, background: 'var(--bg-2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, flexShrink: 0,
        }}>Job</div>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{job.title}</h2>
          <div style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 2 }}>
            <span
              style={{ color: 'var(--blue)', cursor: 'pointer', fontWeight: 600 }}
              onClick={() => navigate(`company?id=${job.companyId || 1}`)}
            >
              {job.company}
            </span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-2)' }}>
            {job.location}{job.type && ` · ${job.type}`}{job.postedDate && ` · Posted ${formatTime(job.postedDate)}`}
          </div>
        </div>
      </div>

      {/* Badges */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {job.salary && (
          <span style={{ fontSize: 13, background: '#E6F4EA', color: '#1e7e34', padding: '4px 10px', borderRadius: 12, fontWeight: 600 }}>
            {job.salary}
          </span>
        )}
        {job.type && (
          <span style={{ fontSize: 13, background: 'var(--bg-2)', color: 'var(--text-2)', padding: '4px 10px', borderRadius: 12 }}>
            {job.type}
          </span>
        )}
        {job.level && (
          <span style={{ fontSize: 13, background: 'var(--bg-2)', color: 'var(--text-2)', padding: '4px 10px', borderRadius: 12 }}>
            {job.level}
          </span>
        )}
        {job.easyApply && (
          <span style={{ fontSize: 13, background: '#EAF4FF', color: 'var(--blue)', padding: '4px 10px', borderRadius: 12, fontWeight: 700 }}>
            Easy Apply
          </span>
        )}
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <button
          className="li-btn li-btn--primary"
          onClick={() => { if (!isApplied(job.id)) { applyJob(job.id); openModal('apply', { jobTitle: job.title, job }); } }}
          style={{ flex: 1, opacity: isApplied(job.id) ? 0.7 : 1 }}
          disabled={isApplied(job.id)}
        >
          {isApplied(job.id) ? '✓ Applied' : (job.easyApply ? 'Easy Apply' : 'Apply now')}
        </button>
        <button
          className="li-btn li-btn--ghost"
          onClick={() => { toggleSaveJob(job.id); showToast(savedJobs.has(String(job.id)) ? 'Job unsaved' : 'Job saved!'); }}
        >
          {savedJobs.has(String(job.id)) ? '★ Saved' : '☆ Save'}
        </button>
      </div>

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>About the job</h3>
        {job.description ? (
          <div
            style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.7 }}
            dangerouslySetInnerHTML={{ __html: job.description }}
          />
        ) : (
          <p style={{ fontSize: 14, color: 'var(--text-2)' }}>No description provided.</p>
        )}
      </div>

      {job.skills && job.skills.length > 0 && (
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Skills</h3>
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
