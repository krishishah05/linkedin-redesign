/* ============================================================
   COVERLETTERPAGE.JS - AI-powered cover letter generator
   ============================================================ */

// â”€â”€ LLM integration point â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Input:  prompt (string) - complete context built from the form
// Output: Promise<string> - the edited cover letter text
async function generateCoverLetterFromLLM(prompt) {
  const data = await API.coverLetterGenerate(prompt);
  return data.letter;
}

const MAX_EXTRACTED_CHARS = 20000;
function trimExtractedText(text) {
  if (!text || text.length <= MAX_EXTRACTED_CHARS) return text;
  return text.slice(0, MAX_EXTRACTED_CHARS) + '\n... [truncated]';
}

// â”€â”€ Pre-written templates â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Each template is real cover letter text with [bracketed] placeholders.
// The LLM fills in the placeholders and tailors the content to the specific job.
const COVER_LETTER_TEMPLATES = [
  {
    id: 'professional',
    label: 'Classic Professional',
    description: 'Formal and structured - works for most corporate roles',
    preview: 'Dear Hiring Manager, I am writing to express my strong interest in the [Job Title] position...',
    text: `Dear Hiring Manager,

I am writing to express my strong interest in the [Job Title] position at [Company]. As [Current Role/Headline], I have developed a skill set that closely aligns with the requirements of this role, and I am confident I would make a meaningful contribution to your team.

Throughout my career, I have consistently demonstrated the ability to deliver results in fast-paced, collaborative environments. My experience has equipped me with both the technical knowledge and the interpersonal skills needed to excel in this position.

I am particularly drawn to [Company] because of its reputation for innovation and its commitment to [relevant company value or mission]. I am excited about the opportunity to bring my background to an organization doing such impactful work, and I am eager to grow alongside a talented team.

I would welcome the chance to discuss how my experience aligns with your needs. Thank you sincerely for your time and consideration.

Sincerely,
[Your Name]`,
  },
  {
    id: 'creative',
    label: 'Creative & Modern',
    description: 'Engaging and personality-driven - great for startups or creative fields',
    preview: 'Dear Hiring Team, When I came across the [Job Title] opening at [Company], I knew immediately...',
    text: `Dear Hiring Team,

When I came across the [Job Title] opening at [Company], I knew immediately this was the kind of opportunity I had been looking for. My background as [Current Role/Headline] has given me a unique perspective, and I am ready to bring that energy somewhere it will truly matter.

What excites me most about [Company] is [relevant company quality or mission]. I have spent my career building expertise at the intersection of [relevant area] and [relevant area], and I am eager to apply that at an organization that values bold thinking. I do not just want to fill a role - I want to help build something.

My proudest professional moments have come from [relevant type of achievement], and I am confident that working with your team would give me more opportunities to do exactly that.

Let us connect. I would love to explore how I can contribute to what you are building at [Company].

Best,
[Your Name]`,
  },
  {
    id: 'career-changer',
    label: 'Career Changer',
    description: 'Highlights transferable skills - ideal when switching industries or roles',
    preview: 'Dear Hiring Manager, My path to applying for the [Job Title] role at [Company] may not be...',
    text: `Dear Hiring Manager,

My path to applying for the [Job Title] role at [Company] may not be the most conventional, but I believe it makes me a stronger candidate. My background as [Current Role/Headline] has equipped me with a set of transferable skills that directly apply to the challenges of this position.

Working in [previous field or role type], I developed [transferable skill 1] and [transferable skill 2] - capabilities that translate directly to what [Company] is looking for. I have spent considerable time studying the [target field] space, and I bring a fresh perspective that complements the experience of those who have worked in it their entire careers.

I am a fast learner, deeply motivated, and ready to invest in making this transition successful. [Company]'s mission resonates with me personally, and that drive will show in everything I do.

I would love the opportunity to show you how my background is an asset, not a gap. Thank you for your consideration.

Sincerely,
[Your Name]`,
  },
  {
    id: 'new-grad',
    label: 'Recent Graduate',
    description: 'Leads with education and potential - perfect for entry-level applications',
    preview: 'Dear Hiring Manager, As a recent graduate with a degree in [Field], I am excited to apply...',
    text: `Dear Hiring Manager,

As a recent graduate with a degree in [Field of Study], I am excited to apply for the [Job Title] position at [Company]. While I am early in my professional career, I have built a strong academic foundation and hands-on project experience that I am eager to bring to a real-world team.

During my studies, I had the opportunity to [relevant academic project, internship, or coursework], which gave me practical exposure to [relevant skills or tools]. I thrive in environments where I can learn quickly, ask hard questions, and contribute meaningfully from day one.

I have long admired [Company] for [specific reason], and I would be proud to start my career with an organization whose work aligns so closely with my own interests and values.

I am enthusiastic, coachable, and ready to grow. I would love the chance to discuss how I can contribute to your team.

Thank you for your time.

Sincerely,
[Your Name]`,
  },
  {
    id: 'technical',
    label: 'Technical / STEM',
    description: 'Leads with technical skills and measurable impact - for engineering and tech roles',
    preview: 'Dear Hiring Manager, I am applying for the [Job Title] position at [Company] with a strong...',
    text: `Dear Hiring Manager,

I am applying for the [Job Title] position at [Company] with a strong background in [primary technical domain] and a track record of building and shipping reliable systems. As [Current Role/Headline], I have worked across the full lifecycle of [relevant type of product or system], from design and implementation through deployment and maintenance.

My technical skills include [relevant skill 1], [relevant skill 2], and [relevant skill 3]. In my current role, I have [specific technical achievement with measurable impact]. I approach engineering problems with both precision and pragmatism - I care deeply about code quality, but never at the expense of shipping.

[Company]'s work on [relevant technical area or product] is particularly compelling to me. I am drawn to teams that move fast, write well-tested code, and are not afraid to challenge established approaches when something better exists.

I would welcome the opportunity to discuss the role in more detail. Thank you for considering my application.

Best regards,
[Your Name]`,
  },
  {
    id: 'executive',
    label: 'Concise / Executive',
    description: 'Short and direct - best for senior roles or when brevity is preferred',
    preview: 'Dear Hiring Manager, I am writing to apply for the [Job Title] role at [Company]. With [X]...',
    text: `Dear Hiring Manager,

I am writing to apply for the [Job Title] role at [Company]. With [X] years of experience as [Current Role/Headline], I have a proven ability to [core competency] and [core competency] - and I am looking for the right opportunity to bring that to a new challenge.

My key qualifications for this role:
â€¢ [Relevant experience or achievement]
â€¢ [Relevant experience or achievement]
â€¢ [Relevant experience or achievement]

I am confident in my fit for this position and would welcome a conversation to discuss next steps.

Thank you for your time.

Sincerely,
[Your Name]`,
  },
];

// â”€â”€ Page component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function CoverLetterPage() {
  const { currentUser, showToast, savedJobs } = React.useContext(AppContext);
  const { data: jobs, loading: jobsLoading } = useFetch(API.getJobs, []);

  // Only show jobs the user has saved
  const savedJobsList = React.useMemo(
    () => (jobs || []).filter(j => savedJobs.has(String(j.id))),
    [jobs, savedJobs]
  );

  // Job form state
  const [jobTitle, setJobTitle]               = React.useState('');
  const [company, setCompany]                 = React.useState('');
  const [jobDescription, setJobDescription]   = React.useState('');
  const [selectedJobId, setSelectedJobId]     = React.useState('');
  const latestJobFetchId = React.useRef(0);

  // Source state
  const [inputMode, setInputMode]             = React.useState('template'); // 'template' | 'upload'
  const [selectedTemplateId, setSelectedTemplateId] = React.useState('professional');
  const [uploadedText, setUploadedText]       = React.useState('');
  const [uploadedFileName, setUploadedFileName] = React.useState('');

  // Output state
  const [generatedLetter, setGeneratedLetter] = React.useState('');
  const [isGenerating, setIsGenerating]       = React.useState(false);
  const [generationError, setGenerationError] = React.useState('');
  const [savedDrafts, setSavedDrafts] = React.useState(() => {
    try {
      const raw = localStorage.getItem('li-cover-letter-drafts');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [selectedDraftId, setSelectedDraftId] = React.useState('');

  function loadFromJob(job) {
    setJobTitle(job.title || '');
    setCompany(job.company || '');
    setJobDescription(job.description || job.summary || '');
  }

  async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast('File too large - please upload under 5 MB.', 'error');
      return;
    }
    const ext = file.name.split('.').pop().toLowerCase();
    try {
      let text = '';
      if (ext === 'txt') {
        text = await file.text();
      } else if (ext === 'pdf') {
        if (!window.pdfjsLib) throw new Error('PDF reader not loaded');
        const buf = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
        for (let p = 1; p <= pdf.numPages; p++) {
          const page = await pdf.getPage(p);
          const content = await page.getTextContent();
          text += content.items.map(i => i.str).join(' ') + '\n';
        }
      } else if (ext === 'docx') {
        if (!window.mammoth) throw new Error('DOCX reader not loaded');
        const buf = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer: buf });
        text = result.value;
      } else if (ext === 'doc') {
        showToast('DOC format is not supported - please save as DOCX and re-upload.', 'error');
        return;
      } else {
        showToast('Unsupported file type.', 'error');
        return;
      }
      if (!text.trim()) {
        showToast('Could not extract text from this file.', 'error');
        return;
      }
      setUploadedText(trimExtractedText(text));
      setUploadedFileName(file.name);
    } catch (err) {
      showToast('Could not read the file: ' + (err.message || 'unknown error'), 'error');
    }
    e.target.value = '';
  }

  function buildProfileSection() {
    const user = currentUser || {};
    const lines = [];

    if (user.about) {
      lines.push(`About: ${user.about}`);
    }

    const exp = user.experience || [];
    if (exp.length > 0) {
      lines.push('Work Experience:');
      exp.slice(0, 5).forEach(e => {
        const dates = `${e.startDate || ''}${e.endDate ? ` - ${e.endDate}` : ''}`;
        lines.push(`  â€¢ ${e.title} at ${e.company}${e.type ? ` (${e.type})` : ''}${dates ? `, ${dates}` : ''}`);
        if (e.description) lines.push(`    ${e.description}`);
      });
    }

    const edu = user.education || [];
    if (edu.length > 0) {
      lines.push('Education:');
      edu.slice(0, 3).forEach(e => {
        lines.push(`  â€¢ ${e.degree || ''}${e.field ? ` in ${e.field}` : ''} - ${e.school}${e.startDate || e.startYear ? ` (${e.startDate || e.startYear} - ${e.endDate || e.endYear || 'Present'})` : ''}`);
      });
    }

    const proj = user.projects || [];
    if (proj.length > 0) {
      lines.push('Projects:');
      proj.slice(0, 4).forEach(p => {
        lines.push(`  â€¢ ${p.name}${p.description ? `: ${p.description}` : ''}`);
      });
    }

    const skills = (user.skills || []).map(s => typeof s === 'object' ? s.name : s);
    if (skills.length > 0) {
      lines.push(`Skills: ${skills.slice(0, 20).join(', ')}`);
    }

    const vol = user.volunteering || [];
    if (vol.length > 0) {
      lines.push('Volunteering:');
      vol.slice(0, 2).forEach(v => {
        lines.push(`  â€¢ ${v.role} at ${v.organization}${v.cause ? ` (${v.cause})` : ''}`);
      });
    }

    const honors = user.honors || [];
    if (honors.length > 0) {
      lines.push('Honors & Awards:');
      honors.slice(0, 3).forEach(h => {
        lines.push(`  â€¢ ${h.title}${h.issuer ? ` - ${h.issuer}` : ''}`);
      });
    }

    return lines.join('\n');
  }

  function buildPrompt() {
    const user = currentUser || {};
    const title    = jobTitle.trim()  || 'the position';
    const co       = company.trim()   || 'the company';
    const jobDesc  = jobDescription.trim();
    const name     = user.name        || 'the applicant';
    const headline = user.headline    || '';
    const profile  = buildProfileSection();

    const profileBlock = [
      `Applicant: ${name}`,
      headline ? `Headline: ${headline}` : '',
      `Applying for: ${title} at ${co}`,
      jobDesc ? `\nJob Description:\n${jobDesc}` : '',
      profile ? `\nApplicant Profile:\n${profile}` : '',
    ].filter(Boolean).join('\n');

    if (inputMode === 'upload') {
      return [
        'Edit the following cover letter for a new job application.',
        'Tailor it specifically for the role and company listed below.',
        'Preserve the applicant\'s original voice and writing style throughout.',
        'Reference specific experiences, projects, and skills from the applicant profile to make the letter concrete and personal.',
        'Update the content to highlight the most relevant experience for this position.',
        '',
        profileBlock,
        '',
        'Cover letter to edit:',
        trimExtractedText(uploadedText),
        '',
        'Return only the updated cover letter. Do not include any explanation or commentary.',
      ].join('\n');
    }

    const template = COVER_LETTER_TEMPLATES.find(t => t.id === selectedTemplateId);
    return [
      'Edit the following cover letter template for a specific job application.',
      'Fill in all placeholder text shown in [brackets] using the applicant\'s real information from the profile below.',
      'Reference specific job titles, companies, projects, and skills from the profile to make the letter concrete - do not use generic placeholder language.',
      'Tailor the letter to highlight why this applicant is a strong fit for the specific position.',
      'Keep the overall structure and tone of the template.',
      '',
      profileBlock,
      '',
      'Template to edit:',
      template ? template.text : '',
      '',
      'Return only the completed cover letter. Do not include any explanation or commentary.',
    ].join('\n');
  }

  async function handleGenerate() {
    if (!jobTitle.trim() && !company.trim()) {
      showToast('Enter at least a job title or company name.', 'error');
      return;
    }
    if (inputMode === 'upload' && !uploadedText) {
      showToast('Please upload a cover letter file, or switch to Choose a Template.', 'error');
      return;
    }
    setIsGenerating(true);
    setGenerationError('');
    setGeneratedLetter('');
    try {
      const result = await generateCoverLetterFromLLM(buildPrompt());
      setGeneratedLetter(result);
    } catch (err) {
      setGenerationError(err.message || 'Generation failed.');
    } finally {
      setIsGenerating(false);
    }
  }

  function handleCopy() {
    if (!generatedLetter) return;
    function execCopyText() {
      let ta;
      try {
        ta = document.createElement('textarea');
        ta.value = generatedLetter;
        ta.style.cssText = 'position:fixed;opacity:0';
        document.body.appendChild(ta);
        ta.focus(); ta.select();
        if (document.execCommand('copy')) showToast('Copied to clipboard!');
        else showToast('Could not copy to clipboard.', 'error');
      } catch (_) { showToast('Could not copy to clipboard.', 'error'); }
      finally { if (ta && ta.parentNode) ta.parentNode.removeChild(ta); }
    }
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(generatedLetter)
        .then(() => showToast('Copied to clipboard!'))
        .catch(() => execCopyText());
    } else {
      execCopyText();
    }
  }

  function handleDownload() {
    if (!generatedLetter) return;
    if (!window.jspdf?.jsPDF) { showToast('PDF library not loaded - try refreshing.', 'error'); return; }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const margin     = 20;
    const pageWidth  = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const maxWidth   = pageWidth - margin * 2;
    const lineHeight = 7;
    let y = margin;

    doc.setFont('times', 'normal');
    doc.setFontSize(12);

    const lines = doc.splitTextToSize(generatedLetter, maxWidth);
    lines.forEach(line => {
      if (y + lineHeight > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += lineHeight;
    });

    doc.save(`cover-letter-${(company || 'draft').toLowerCase().replace(/\s+/g, '-')}.pdf`);
  }

  function saveCurrentDraft() {
    if (!generatedLetter.trim()) {
      showToast('Generate or write a cover letter before saving.', 'error');
      return;
    }
    const draft = {
      id: String(Date.now()),
      title: `${jobTitle.trim() || 'Cover letter'} at ${company.trim() || 'Company'}`,
      jobTitle: jobTitle.trim(),
      company: company.trim(),
      jobDescription,
      letter: generatedLetter,
      savedAt: new Date().toISOString(),
    };
    const next = [draft, ...savedDrafts].slice(0, 12);
    setSavedDrafts(next);
    localStorage.setItem('li-cover-letter-drafts', JSON.stringify(next));
    setSelectedDraftId(draft.id);
    showToast('Draft saved.', 'success');
  }

  function loadDraft(id) {
    const draft = savedDrafts.find(d => d.id === id);
    if (!draft) return;
    setSelectedDraftId(id);
    setJobTitle(draft.jobTitle || '');
    setCompany(draft.company || '');
    setJobDescription(draft.jobDescription || '');
    setGeneratedLetter(draft.letter || '');
    setGenerationError('');
  }

  function deleteDraft(id) {
    const next = savedDrafts.filter(d => d.id !== id);
    setSavedDrafts(next);
    localStorage.setItem('li-cover-letter-drafts', JSON.stringify(next));
    if (selectedDraftId === id) setSelectedDraftId('');
    showToast('Draft deleted.', 'success');
  }

  const inputStyle = {
    width: '100%', padding: '8px 10px', boxSizing: 'border-box',
    border: '1px solid var(--border-2)', borderRadius: 4,
    fontSize: 14, color: 'var(--text)', background: 'var(--white)',
    outline: 'none', fontFamily: 'inherit',
  };

  const labelStyle = {
    fontSize: 12, fontWeight: 600, color: 'var(--text-2)',
    display: 'block', marginBottom: 4,
  };

  return (
    <div className="li-page-inner">
      <div style={{ flex: 1, minWidth: 0 }}>

      {/* Page header */}
      <div className="li-card" style={{ padding: '20px 24px', marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>Cover Letter Generator</h1>
        <p style={{ color: 'var(--text-2)', fontSize: 14, margin: 0 }}>
          Pick a template or upload your own cover letter - the AI will tailor it to the job.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>

        {/* â”€â”€ Left panel: inputs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div style={{ flex: '0 0 460px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Job details card */}
          <div className="li-card" style={{ padding: 20 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 16px' }}>Job Details</h2>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Saved jobs</label>
              {jobsLoading ? (
                <div style={{ fontSize: 13, color: 'var(--text-3)' }}>Loading...</div>
              ) : savedJobsList.length === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--text-3)' }}>
                  No saved jobs yet - save jobs from the Jobs page to load them here.
                </div>
              ) : (
                <select
                  value={selectedJobId}
                  onChange={e => {
                    const val = e.target.value;
                    setSelectedJobId(val);
                    const job = savedJobsList.find(j => String(j.id) === val);
                    if (job) {
                      loadFromJob(job);
                      const requestId = ++latestJobFetchId.current;
                      API.getJob(job.id)
                        .then(full => {
                          if (full && requestId === latestJobFetchId.current) loadFromJob(full);
                        })
                        .catch(() => {
                          if (requestId === latestJobFetchId.current) {
                            showToast('Could not load full job details. Using saved summary.', 'error');
                          }
                        });
                    }
                  }}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                >
                  <option value="" disabled>Select a saved job...</option>
                  {savedJobsList.map(j => (
                    <option key={j.id} value={String(j.id)}>
                      {j.title} - {j.company}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Job Title</label>
              <input
                type="text"
                value={jobTitle}
                onChange={e => setJobTitle(e.target.value)}
                placeholder="e.g. Software Engineer"
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Company</label>
              <input
                type="text"
                value={company}
                onChange={e => setCompany(e.target.value)}
                placeholder="e.g. Acme Corp"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>
                Job Description{' '}
                <span style={{ fontWeight: 400 }}>(optional but recommended)</span>
              </label>
              <textarea
                value={jobDescription}
                onChange={e => setJobDescription(e.target.value)}
                placeholder="Paste the job description here for a more tailored letter..."
                rows={5}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </div>
          </div>

          <div className="li-card" style={{ padding: 20 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px' }}>Saved Drafts</h2>
            {savedDrafts.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--text-3)', margin: 0 }}>
                Saved cover letter drafts will appear here.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <select
                  value={selectedDraftId}
                  onChange={e => loadDraft(e.target.value)}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                >
                  <option value="" disabled>Select a saved draft</option>
                  {savedDrafts.map(d => (
                    <option key={d.id} value={d.id}>{d.title}</option>
                  ))}
                </select>
                {selectedDraftId && (
                  <button type="button" className="li-btn li-btn--ghost li-btn--sm" onClick={() => deleteDraft(selectedDraftId)}>
                    Delete selected draft
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Starting point card */}
          <div className="li-card" style={{ padding: 20 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 4px' }}>Starting Point</h2>
            <p style={{ fontSize: 13, color: 'var(--text-2)', margin: '0 0 16px' }}>
              The AI will edit whichever you choose and tailor it to the job.
            </p>

            {/* Mode toggle */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {[
                { id: 'template', label: 'Choose a Template' },
                { id: 'upload',   label: 'Upload My Letter' },
              ].map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setInputMode(m.id)}
                  style={{
                    flex: 1, padding: '8px 0', fontSize: 13, fontWeight: 600,
                    border: '1px solid var(--border-2)', borderRadius: 4, cursor: 'pointer',
                    background: inputMode === m.id ? 'var(--blue)' : 'var(--white)',
                    color: inputMode === m.id ? '#fff' : 'var(--text)',
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* Template picker */}
            {inputMode === 'template' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {COVER_LETTER_TEMPLATES.map(t => {
                  const isSelected = selectedTemplateId === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSelectedTemplateId(t.id)}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                        gap: 4, padding: '12px 14px', borderRadius: 6,
                        cursor: 'pointer', textAlign: 'left', width: '100%',
                        border: isSelected ? '2px solid var(--blue)' : '1px solid var(--border-2)',
                        background: isSelected ? 'rgba(10,102,194,0.06)' : 'var(--white)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
                        <div style={{
                          width: 14, height: 14, borderRadius: '50%', flexShrink: 0,
                          border: `2px solid ${isSelected ? 'var(--blue)' : 'var(--border-2)'}`,
                          background: isSelected ? 'var(--blue)' : 'transparent',
                        }} />
                        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                          {t.label}
                        </span>
                      </div>
                      <span style={{ fontSize: 12, color: 'var(--text-2)', paddingLeft: 22 }}>
                        {t.description}
                      </span>
                      {isSelected && (
                        <span style={{
                          fontSize: 11, color: 'var(--text-3)', paddingLeft: 22,
                          fontStyle: 'italic', lineHeight: 1.4, marginTop: 2,
                        }}>
                          "{t.preview}"
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Upload picker */}
            {inputMode === 'upload' && (
              <div>
                <label
                  htmlFor="cl-file-upload"
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', padding: '28px 20px', gap: 8,
                    border: `2px dashed ${uploadedText ? '#057642' : 'var(--border-2)'}`,
                    borderRadius: 8, cursor: 'pointer',
                    background: uploadedText ? 'rgba(5,118,66,0.04)' : 'var(--bg-2)',
                    color: 'var(--text-2)', fontSize: 13,
                  }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" style={{ opacity: 0.5 }}>
                    <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                  </svg>
                  {uploadedText
                    ? <span style={{ color: '#057642', fontWeight: 600 }}>{uploadedFileName}</span>
                    : <span>Click to upload your cover letter</span>
                  }
                  {!uploadedText && <span style={{ fontSize: 11 }}>Max 5 MB Â· PDF, DOCX, TXT</span>}
                </label>
                <input
                  id="cl-file-upload"
                  type="file"
                  accept=".txt,.pdf,.docx,.doc"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
                {uploadedText && (
                  <button
                    type="button"
                    className="li-btn li-btn--ghost li-btn--sm"
                    onClick={() => { setUploadedText(''); setUploadedFileName(''); }}
                    style={{ marginTop: 8, width: '100%' }}
                  >
                    Remove file
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Generate button */}
          <button
            type="button"
            className="li-btn li-btn--primary"
            onClick={handleGenerate}
            disabled={isGenerating}
            style={{ width: '100%', padding: '12px 0', fontSize: 15, fontWeight: 700 }}
          >
            {isGenerating ? 'Generating...' : 'Generate Cover Letter'}
          </button>
        </div>

        {/* â”€â”€ Right panel: output â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div style={{ flex: 1, minWidth: 280 }}>
          <div className="li-card" style={{ padding: 20, minHeight: 400 }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Your Cover Letter</h2>
              {generatedLetter && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" className="li-btn li-btn--ghost li-btn--sm" onClick={handleCopy}>
                    Copy
                  </button>
                  <button type="button" className="li-btn li-btn--ghost li-btn--sm" onClick={saveCurrentDraft}>
                    Save draft
                  </button>
                  <button type="button" className="li-btn li-btn--ghost li-btn--sm" onClick={handleDownload}>
                    Download
                  </button>
                </div>
              )}
            </div>

            {isGenerating && <LoadingSpinner text="Tailoring your cover letter..." />}

            {generationError && !isGenerating && (
              <div style={{
                padding: 16, borderRadius: 6,
                background: 'rgba(204,16,22,0.06)', border: '1px solid rgba(204,16,22,0.2)',
              }}>
                <p style={{ color: '#CC1016', fontSize: 14, fontWeight: 600, margin: '0 0 4px' }}>
                  Generation failed
                </p>
                <p style={{ color: 'var(--text-2)', fontSize: 13, margin: 0 }}>
                  {generationError}
                </p>
              </div>
            )}

            {!isGenerating && !generatedLetter && !generationError && (
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', padding: '60px 24px',
                color: 'var(--text-2)', textAlign: 'center',
              }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor"
                  style={{ opacity: 0.2, marginBottom: 12 }}>
                  <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                </svg>
                <p style={{ fontSize: 15, fontWeight: 600, margin: '0 0 6px' }}>No letter yet</p>
                <p style={{ fontSize: 13, margin: 0 }}>
                  Fill in the job details, pick a starting point, and click Generate.
                </p>
              </div>
            )}

            {/* Editable output - user can tweak before copying/downloading */}
            {generatedLetter && !isGenerating && (
              <textarea
                value={generatedLetter}
                onChange={e => setGeneratedLetter(e.target.value)}
                style={{
                  width: '100%', minHeight: 520, boxSizing: 'border-box',
                  border: '1px solid var(--border-2)', borderRadius: 4,
                  padding: 16, fontSize: 14, lineHeight: 1.8,
                  color: 'var(--text)', background: 'var(--white)',
                  resize: 'vertical', fontFamily: 'Georgia, "Times New Roman", serif',
                  outline: 'none',
                }}
              />
            )}
          </div>
        </div>

      </div>

      </div>
    </div>
  );
}
