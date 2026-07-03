import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  Briefcase,
  Building2,
  HelpCircle,
  ChevronDown,
  BookOpen,
  Mail,
  ArrowRight,
  UserCheck,
  CheckCircle,
  HelpCircle as FaqIcon
} from 'lucide-react';

const Help = () => {
  const navigate = useNavigate();
  const [openSections, setOpenSections] = useState({
    started: true,
    students: false,
    hr: false,
    tpo: false,
    faq: false,
    support: false
  });

  const toggleSection = (section) => {
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const accordionStyle = (isOpen) => ({
    backgroundColor: 'var(--card-bg)',
    borderRadius: '8px',
    border: '1px solid var(--slate-light)',
    marginBottom: '16px',
    overflow: 'hidden',
    boxShadow: isOpen ? '0 10px 15px -3px rgba(0, 0, 0, 0.05)' : 'none',
    transition: 'all 0.3s ease'
  });

  const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '18px 24px',
    cursor: 'pointer',
    userSelect: 'none',
    backgroundColor: 'var(--white)',
    borderBottom: '1px solid transparent'
  };

  const contentStyle = (isOpen) => ({
    padding: isOpen ? '24px' : '0px',
    maxHeight: isOpen ? '2000px' : '0px',
    opacity: isOpen ? 1 : 0,
    transition: 'all 0.3s ease-in-out',
    borderTop: isOpen ? '1px solid var(--slate-light)' : 'none',
    overflow: 'hidden',
    textAlign: 'left'
  });

  const stepBadgeStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    backgroundColor: 'var(--navy-deep)',
    color: 'white',
    borderRadius: '50%',
    fontSize: '13px',
    fontWeight: 'bold',
    flexShrink: 0
  };

  return (
    <div className="app-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-page)', color: 'var(--text-primary)' }}>
      {/* Simplified Help Navbar */}
      <header style={{
        backgroundColor: 'var(--bg-navbar)',
        color: 'var(--text-on-dark)',
        padding: '16px 40px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '24px', fontWeight: 'bold', fontFamily: 'var(--font-display)', color: 'var(--accent-gold)' }}>HireLoop</span>
        </div>
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'none',
            border: '1px solid rgba(255,255,255,0.4)',
            color: 'var(--text-on-dark)',
            cursor: 'pointer',
            padding: '8px 16px',
            borderRadius: '4px',
            fontSize: '14px',
            fontWeight: '600',
            transition: 'all 0.2s'
          }}
        >
          ← Go Back
        </button>
      </header>

      <main style={{ flex: 1, maxWidth: '900px', width: '100%', margin: '40px auto', padding: '0 20px', boxSizing: 'border-box' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', color: 'var(--navy-deep)', fontSize: '32px', margin: '0 0 10px 0' }}>Help & Instructions Center</h1>
          <p style={{ color: 'var(--slate)', fontSize: '16px', margin: 0 }}>Understand how to use HireLoop platform and find answers to common queries</p>
        </div>

        {/* Section 1 - Getting Started */}
        <div style={accordionStyle(openSections.started)}>
          <div style={headerStyle} onClick={() => toggleSection('started')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <BookOpen size={22} style={{ color: 'var(--navy-deep)' }} />
              <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', color: 'var(--navy-deep)', fontSize: '18px' }}>Getting Started</h3>
            </div>
            <ChevronDown size={20} style={{ transform: openSections.started ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', color: 'var(--slate)' }} />
          </div>
          <div style={contentStyle(openSections.started)}>
            <h4 style={{ margin: '0 0 8px 0', color: 'var(--navy-deep)', fontSize: '15px' }}>What is HireLoop?</h4>
            <p style={{ margin: '0 0 20px 0', color: 'var(--slate)', fontSize: '14.5px', lineHeight: 1.6 }}>
              HireLoop is a smart campus placement system designed to streamline job applications, screening processes, and credentials validation. The platform enables direct communication between students looking for placements, recruiters seeking talent, and college admin (TPO) monitoring the campus campaigns.
            </p>

            <h4 style={{ margin: '0 0 12px 0', color: 'var(--navy-deep)', fontSize: '15px' }}>Who can use HireLoop?</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              <div style={{ padding: '16px', backgroundColor: 'var(--slate-bg)', borderRadius: '6px' }}>
                <strong style={{ color: 'var(--navy-mid)' }}>🎓 Students</strong>
                <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: 'var(--slate)', lineHeight: 1.5 }}>Browse opportunities, practice with AI mock interviews, clear assessments, and track eligibility states.</p>
              </div>
              <div style={{ padding: '16px', backgroundColor: 'var(--slate-bg)', borderRadius: '6px' }}>
                <strong style={{ color: 'var(--navy-mid)' }}>💼 Recruiters (HR)</strong>
                <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: 'var(--slate)', lineHeight: 1.5 }}>Post job roles (JDs), configure MCQ assessments and screening questions, and select eligible student applicants.</p>
              </div>
              <div style={{ padding: '16px', backgroundColor: 'var(--slate-bg)', borderRadius: '6px' }}>
                <strong style={{ color: 'var(--navy-mid)' }}>🏛️ TPO Admin</strong>
                <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: 'var(--slate)', lineHeight: 1.5 }}>Verify HR profiles and JDs, oversee global application history, and trace campus placement stats.</p>
              </div>
            </div>

            <h4 style={{ margin: '0 0 16px 0', color: 'var(--navy-deep)', fontSize: '15px' }}>How to create an account</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { title: '1. Register', text: 'Navigate to Register tab, input basic details, and select your appropriate Role.' },
                { title: '2. Verify Email', text: 'Confirm your registered email account by completing the OTP verification process.' },
                { title: '3. Complete Profile', text: 'Fill academic info, resume documents, or corporate profile tags.' },
                { title: '4. Start Using', text: 'Apply to jobs, evaluate profiles, or approve pending listings immediately.' }
              ].map((step, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <span style={{ ...stepBadgeStyle, backgroundColor: 'var(--accent-gold)', color: 'var(--navy-deep)' }}>{idx + 1}</span>
                  <div style={{ textAlign: 'left' }}>
                    <strong style={{ fontSize: '14px', color: 'var(--navy-deep)' }}>{step.title}</strong>
                    <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: 'var(--slate)' }}>{step.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Section 2 - For Students */}
        <div style={accordionStyle(openSections.students)}>
          <div style={headerStyle} onClick={() => toggleSection('students')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <GraduationCap size={22} style={{ color: 'var(--navy-deep)' }} />
              <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', color: 'var(--navy-deep)', fontSize: '18px' }}>For Students 🎓</h3>
            </div>
            <ChevronDown size={20} style={{ transform: openSections.students ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', color: 'var(--slate)' }} />
          </div>
          <div style={contentStyle(openSections.students)}>
            <p style={{ margin: '0 0 20px 0', color: 'var(--slate)', fontSize: '14.5px', lineHeight: 1.6 }}>
              Follow this timeline process to apply for job postings and practice mock interviews:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', borderLeft: '2px solid var(--slate-light)', paddingLeft: '20px', marginLeft: '12px' }}>
              {[
                { title: 'Register as Student', text: 'Provide accurate degree details, current CGPA, active backlogs, and branch options.' },
                { title: 'Complete your profile', text: 'Upload your primary resume file (.pdf/.doc), add core skills tags, and add a brief bio summary.' },
                { title: 'Browse eligible job opportunities', text: 'Only jobs where your CGPA, branch, and backlogs match requirements will show as Eligible.' },
                { title: 'Download company documents', text: 'Access brochures, test papers, or guides posted by recruiters directly from the JD cards.' },
                { title: 'Apply to opportunities', text: 'Submit your saved profile resume (or upload a custom one for the job) and answer custom screening questions.' },
                { title: 'Take the screening assessment', text: 'If configured by HR, take the online MCQ screening test. Be careful: you only get a single attempt!' },
                { title: 'Attend AI mock interview', text: 'Practice with a real-time mock interview tailored to the job description to receive detailed feedback.' },
                { title: 'Track your application status', text: 'Monitor status changes in real-time as your profile progresses from Applied to Shortlisted, Selected, or Rejected.' },
                { title: 'Review feedback to improve', text: 'Click "View Feedback" to analyze strengths, improvements, and tips generated by the AI model.' }
              ].map((step, idx) => (
                <div key={idx} style={{ position: 'relative' }}>
                  <span style={{
                    ...stepBadgeStyle,
                    position: 'absolute',
                    left: '-35px',
                    top: '2px',
                    width: '24px',
                    height: '24px',
                    fontSize: '11px'
                  }}>{idx + 1}</span>
                  <div style={{ textAlign: 'left' }}>
                    <strong style={{ fontSize: '14px', color: 'var(--navy-deep)' }}>{step.title}</strong>
                    <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: 'var(--slate)', lineHeight: 1.5 }}>{step.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Section 3 - For HR / Companies */}
        <div style={accordionStyle(openSections.hr)}>
          <div style={headerStyle} onClick={() => toggleSection('hr')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Briefcase size={22} style={{ color: 'var(--navy-deep)' }} />
              <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', color: 'var(--navy-deep)', fontSize: '18px' }}>For HR / Companies 💼</h3>
            </div>
            <ChevronDown size={20} style={{ transform: openSections.hr ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', color: 'var(--slate)' }} />
          </div>
          <div style={contentStyle(openSections.hr)}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', borderLeft: '2px solid var(--slate-light)', paddingLeft: '20px', marginLeft: '12px' }}>
              {[
                { title: 'Register as HR Representative', text: 'Enter corporate credentials, your company name, and official designation.' },
                { title: 'Await TPO approval', text: 'The Training & Placement Officer will review and authorize your recruiter profile.' },
                { title: 'Post job descriptions', text: 'Set parameters like packages, locations, allowed branches, min CGPA, and max backlogs.' },
                { title: 'Add custom screening questions', text: 'Add up to 5 optional open-ended questions that candidates answer upon applying.' },
                { title: 'Enable AI screening assessment', text: 'Generate a 10-question technical MCQ assessment automatically with Gemini AI, then review and edit it.' },
                { title: 'Upload role documents', text: 'Provide company brochures or job details (JDs) as attachments up to 10MB.' },
                { title: 'Await JD approval', text: 'The TPO checks your posted JD requirements before publishing it to eligible students.' },
                { title: 'Evaluate candidate applicants', text: 'Inspect student profile fields, academic performance metrics, assessment scores, and resumes.' },
                { title: 'Manage application statuses', text: 'Shortlist students, mark interview slots, and declare final selects or rejects.' }
              ].map((step, idx) => (
                <div key={idx} style={{ position: 'relative' }}>
                  <span style={{
                    ...stepBadgeStyle,
                    position: 'absolute',
                    left: '-35px',
                    top: '2px',
                    width: '24px',
                    height: '24px',
                    fontSize: '11px'
                  }}>{idx + 1}</span>
                  <div style={{ textAlign: 'left' }}>
                    <strong style={{ fontSize: '14px', color: 'var(--navy-deep)' }}>{step.title}</strong>
                    <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: 'var(--slate)', lineHeight: 1.5 }}>{step.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Section 4 - For TPO / College Admin */}
        <div style={accordionStyle(openSections.tpo)}>
          <div style={headerStyle} onClick={() => toggleSection('tpo')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Building2 size={22} style={{ color: 'var(--navy-deep)' }} />
              <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', color: 'var(--navy-deep)', fontSize: '18px' }}>For TPO / College Admin 🏛️</h3>
            </div>
            <ChevronDown size={20} style={{ transform: openSections.tpo ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', color: 'var(--slate)' }} />
          </div>
          <div style={contentStyle(openSections.tpo)}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', borderLeft: '2px solid var(--slate-light)', paddingLeft: '20px', marginLeft: '12px' }}>
              {[
                { title: 'Register as TPO Officer', text: 'Create an admin profile using college-allocated credentials.' },
                { title: 'Approve HR company profiles', text: 'Check recruiter verification requests to keep the portal safe.' },
                { title: 'Approve job details', text: 'Verify branch cutoffs and JD descriptions. Student notifications are sent automatically upon TPO approval.' },
                { title: 'Oversee system applications', text: 'Access the "All Applications" tab to search and filter application records globally.' },
                { title: 'Verify individual profile drawers', text: 'Click "View Profile" in any table row to see academic scores, uploaded resumes, and history.' },
                { title: 'Monitor college placement metrics', text: 'Track statistics including total students, registered HR companies, and submitted applications.' }
              ].map((step, idx) => (
                <div key={idx} style={{ position: 'relative' }}>
                  <span style={{
                    ...stepBadgeStyle,
                    position: 'absolute',
                    left: '-35px',
                    top: '2px',
                    width: '24px',
                    height: '24px',
                    fontSize: '11px'
                  }}>{idx + 1}</span>
                  <div style={{ textAlign: 'left' }}>
                    <strong style={{ fontSize: '14px', color: 'var(--navy-deep)' }}>{step.title}</strong>
                    <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: 'var(--slate)', lineHeight: 1.5 }}>{step.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Section 5 - FAQ */}
        <div style={accordionStyle(openSections.faq)}>
          <div style={headerStyle} onClick={() => toggleSection('faq')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <HelpCircle size={22} style={{ color: 'var(--navy-deep)' }} />
              <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', color: 'var(--navy-deep)', fontSize: '18px' }}>Frequently Asked Questions</h3>
            </div>
            <ChevronDown size={20} style={{ transform: openSections.faq ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', color: 'var(--slate)' }} />
          </div>
          <div style={contentStyle(openSections.faq)}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {[
                { q: 'Can I apply to multiple companies?', a: 'Yes, students can apply to all job openings for which they satisfy academic thresholds (branch, CGPA, backlogs).' },
                { q: 'What is the screening assessment?', a: 'Some recruiters set an AI-generated MCQ screening test. You only get one attempt. Your score is visible to the recruiter and is factored into shortlisting decisions.' },
                { q: 'How many mock interview attempts do I get?', a: 'You get up to 3 attempts per job description. Retakes help you practice different AI-generated scenarios and improve your score.' },
                { q: 'My application status shows "Not Eligible" - why?', a: 'Your academic profile (degree CGPA, allowed branch, or active backlogs count) does not satisfy the requirements specified in the JD. Double-check your profile details or apply to other positions.' },
                { q: 'How do I reset my password?', a: 'Click the "Forgot Password?" link on the Login screen and follow the secure OTP-based recovery process to choose a new password.' }
              ].map((faq, idx) => (
                <div key={idx} style={{ paddingBottom: idx < 4 ? '16px' : '0px', borderBottom: idx < 4 ? '1px dashed var(--slate-light)' : 'none' }}>
                  <strong style={{ fontSize: '14.5px', color: 'var(--navy-deep)', display: 'block', marginBottom: '6px' }}>Q: {faq.q}</strong>
                  <span style={{ fontSize: '13.5px', color: 'var(--slate)', lineHeight: 1.5, display: 'block' }}>A: {faq.a}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Section 6 - Contact Support */}
        <div style={accordionStyle(openSections.support)}>
          <div style={headerStyle} onClick={() => toggleSection('support')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Mail size={22} style={{ color: 'var(--navy-deep)' }} />
              <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', color: 'var(--navy-deep)', fontSize: '18px' }}>Contact Support</h3>
            </div>
            <ChevronDown size={20} style={{ transform: openSections.support ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', color: 'var(--slate)' }} />
          </div>
          <div style={contentStyle(openSections.support)}>
            <p style={{ margin: '0 0 12px 0', fontSize: '14.5px', color: 'var(--navy-deep)', fontWeight: '600' }}>Need additional assistance?</p>
            <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: 'var(--slate)', lineHeight: 1.5 }}>
              For placement details, recruitment schedule issues, or platform bugs, please reach out to your college placement cell.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--navy-mid)', fontSize: '14px', fontWeight: 'bold' }}>
              <Mail size={16} /> placement@yourcollege.edu
            </div>
          </div>
        </div>

        {/* Big CTA Navigation Button */}
        <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              backgroundColor: 'var(--navy-deep)',
              color: 'white',
              border: 'none',
              padding: '16px 32px',
              fontSize: '16px',
              fontWeight: '700',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              transition: 'background-color 0.2s'
            }}
            className="btn-save"
          >
            ← Go Back
          </button>
        </div>
      </main>

      <footer style={{
        marginTop: 'auto',
        backgroundColor: 'var(--white)',
        borderTop: '1px solid var(--slate-light)',
        padding: '20px',
        color: 'var(--slate)',
        fontSize: '13px',
        textAlign: 'center'
      }}>
        &copy; {new Date().getFullYear()} HireLoop placement automation. All rights reserved.
      </footer>
    </div>
  );
};

export default Help;
