import React, { useState } from 'react';
import { ChevronRight, ChevronLeft, Home, Users, Server, AlertTriangle, CheckCircle, XCircle, TrendingUp, Building2, Workflow, GitBranch, Clock, Zap, Shield, Settings, Database, Code } from 'lucide-react';

const slides = {
  welcome: {
    type: 'intro',
    title: 'IT Departments Overview',
    subtitle: 'Understanding ITS and Central IT',
    visual: 'intro',
    next: 'intro-departments'
  },
  
  'intro-departments': {
    type: 'visual',
    title: 'Two IT Departments',
    visual: 'two-departments',
    next: 'its-origin'
  },

  'its-origin': {
    type: 'timeline',
    title: 'ITS Department - Origins',
    subtitle: '20 Years Ago',
    visual: 'its-timeline',
    points: [
      { icon: 'target', text: 'Create Unique Identity Number for each Mumin' },
      { icon: 'id', text: 'Develop Digital ID system' },
      { icon: 'database', text: 'Build IT infrastructure and database' },
      { icon: 'web', text: 'ITS52.com created as frontend' },
      { icon: 'team', text: 'In-house development team hired' }
    ],
    next: 'its-core'
  },

  'its-core': {
    type: 'diagram',
    title: 'ITS Department - 4 Core Elements',
    visual: 'four-pillars',
    elements: [
      { name: 'ITS52.com', desc: 'Mumin Frontend', icon: 'users' },
      { name: 'ITS52.org', desc: 'Admin End for Jamaat', icon: 'shield' },
      { name: 'Admin Links', desc: 'Central Departments', icon: 'link' },
      { name: 'ITS App', desc: 'Utilities & Tools', icon: 'mobile' }
    ],
    next: 'its-transformation'
  },

  'its-transformation': {
    type: 'transformation',
    title: 'ITS Evolution',
    visual: 'transformation',
    from: 'Unique Identity Department',
    to: 'IT Service Provider for All Departments',
    impacts: [
      'Miqaat digitalization',
      'Event management systems',
      'Infrastructure services',
      'Multiple department modules'
    ],
    next: 'its-miqaat'
  },

  'its-miqaat': {
    type: 'flow',
    title: 'Miqaat Development Flow',
    visual: 'miqaat-flow',
    steps: [
      { title: 'Miqaat Team', desc: '10-15 volunteers', icon: 'users' },
      { title: 'Requirements', desc: 'Identify needs', icon: 'clipboard' },
      { title: 'ITS Dev Team', desc: 'Build software', icon: 'code' },
      { title: 'Deployment', desc: 'Miqaat.org + VMS', icon: 'rocket' },
      { title: 'Operations', desc: 'Team operates', icon: 'settings' }
    ],
    leader: 'Taikhoom bs',
    next: 'its-scope'
  },

  'its-scope': {
    type: 'scope',
    title: 'ITS Expanding Scope',
    visual: 'scope-expansion',
    categories: [
      { name: 'Miqaat', items: ['Waaz passes', 'VMS', 'Registration'] },
      { name: 'Events', items: ['Nikah', 'Misaaq', 'Bethak'] },
      { name: 'Safar', items: ['Management', 'Itinerary'] },
      { name: 'Others', items: ['Istifada Ilmiyah', 'Various modules'] }
    ],
    next: 'dept-it-chaos'
  },

  'dept-it-chaos': {
    type: 'chaos',
    title: 'IT Across Departments - The Chaos',
    visual: 'chaos-diagram',
    options: [
      { num: '1', text: 'ITS Development', color: 'blue' },
      { num: '2', text: 'Sigatul Amalat (Murtaza bhai)', color: 'purple' },
      { num: '3', text: 'Own Portals', color: 'green' },
      { num: '4', text: 'Fully Independent', color: 'orange' }
    ],
    portals: ['amalat.com', 'alvazarat.com', 'mamureen.net', 'ITS52.com', 'ITS52.org', 'Various others'],
    next: 'problems-visual'
  },

  'problems-visual': {
    type: 'problems',
    title: 'Critical Problems Identified',
    visual: 'problems-chart',
    issues: [
      { icon: 'alert', text: 'No Central Control', severity: 'high' },
      { icon: 'money', text: 'Rising Finance Costs', severity: 'high' },
      { icon: 'x', text: 'No Development Protocols', severity: 'critical' },
      { icon: 'scatter', text: 'No Standardization', severity: 'high' },
      { icon: 'shield-off', text: 'Lack of Governance', severity: 'critical' }
    ],
    next: 'central-it-formed'
  },

  'central-it-formed': {
    type: 'org',
    title: 'Central IT Department',
    visual: 'central-it-org',
    leadership: { name: 'Moiz bs', role: 'Head' },
    cto: { name: 'Taher Bhai Baghdadi', role: 'CTO' },
    role: 'Compliance & Governance',
    challenges: [
      'Very small team',
      'No service provision yet',
      'Cannot enforce policies',
      'Department resistance'
    ],
    next: 'crisis-timeline'
  },

  'crisis-timeline': {
    type: 'crisis-timeline',
    title: 'The Ashara Crisis - 4 Years',
    visual: 'crisis-timeline',
    events: [
      { year: 'Year 1-3', event: 'System Crashes', status: 'fail' },
      { year: '1445H Dubai', event: 'Crash + Audit', status: 'critical' },
      { year: 'Post-Audit', event: 'TekMindz Contract', status: 'action' },
      { year: '1446H Karachi', event: 'Rushed Dev + Fail', status: 'fail' }
    ],
    next: 'crisis-impact'
  },

  'crisis-impact': {
    type: 'impact',
    title: 'Impact of System Failures',
    visual: 'impact-diagram',
    impacts: [
      { area: 'Mumineen', effect: 'Frustration & Long waits', level: 'high' },
      { area: 'Team', effect: 'Stress & Blame', level: 'high' },
      { area: 'Trust', effect: 'ITS ↔ TekMindz rifts', level: 'critical' },
      { area: 'Process', effect: 'Protocols lowered', level: 'critical' }
    ],
    next: 'tekmindz-contract'
  },

  'tekmindz-contract': {
    type: 'contract',
    title: 'TekMindz Contract Details',
    visual: 'contract-visual',
    contract: {
      type: 'Time & Material',
      company: 'TekMindz (Samina ben)',
      purpose: 'Quality Assurance & Protocols',
      rule: 'Nothing to production without approval'
    },
    timeline: [
      { phase: 'Initial', status: 'Strict protocols', color: 'green' },
      { phase: 'Post-Karachi', status: 'Protocols lowered', color: 'orange' },
      { phase: 'Current', status: 'Ongoing with tension', color: 'red' }
    ],
    next: 'decisions-team'
  },

  'decisions-team': {
    type: 'team',
    title: 'This Year - New CRT Team',
    visual: 'crt-team',
    year: '1447H',
    team: [
      { name: 'Mohammed bs', role: 'Member' },
      { name: 'Abdulqadir bs', role: 'Member + SPOC' },
      { name: 'Shabbir bs', role: 'Member' },
      { name: 'Shabbir Vaziri', role: 'Member + SPOC' }
    ],
    mission: 'Gather requirements for all Miqaats',
    next: 'decisions-proposals'
  },

  'decisions-proposals': {
    type: 'comparison',
    title: 'Two Proposals',
    visual: 'proposals-comparison',
    proposals: [
      {
        from: 'CRT Team',
        points: ['RMS 80% complete', 'Complete at priority', 'Use this year', 'Continue TekMindz']
      },
      {
        from: 'Taikhoom bs',
        points: ['New software needed', 'RMS priority first', 'TekMindz contract', 'Use this year']
      }
    ],
    agreement: 'Both agree: Complete RMS with TekMindz at priority',
    next: 'timeline-shock'
  },

  'timeline-shock': {
    type: 'shock',
    title: 'Timeline Reality',
    visual: 'timeline-shock',
    assumption: {
      text: 'RMS is 80% complete',
      timeline: 'Ready for Ashara this year',
      confidence: 'High'
    },
    reality: {
      text: 'Requirements changed significantly',
      timeline: '14 MONTHS needed',
      confidence: 'Cannot deliver this year'
    },
    next: 'solution-thisyear'
  },

  'solution-thisyear': {
    type: 'decision',
    title: 'Solution for This Year',
    visual: 'decision-box',
    decision: 'Use OLD SYSTEM',
    systems: ['Old Miqaat', 'Old VMS'],
    reasoning: 'New software not ready - No choice',
    future: 'Revisit requirements for broader scope',
    next: 'scope-expansion'
  },

  'scope-expansion': {
    type: 'scope-change',
    title: 'Scope Rethinking',
    visual: 'scope-comparison',
    old: {
      title: 'Original Scope',
      items: ['Raza for Ashara only', 'Single event type', 'Limited functionality']
    },
    new: {
      title: 'Expanded Scope',
      items: ['All Miqaat aspects', 'Multiple event types', 'Comprehensive system', 'Long-term vision']
    },
    next: 'structure-miqaat'
  },

  'structure-miqaat': {
    type: 'structure',
    title: 'New Central Miqaat Department',
    visual: 'miqaat-structure',
    department: 'Central Miqaat',
    teams: [
      { name: 'Requirements & Policies', focus: 'Define needs' },
      { name: 'IT Team', focus: 'Technical delivery' }
    ],
    scope: ['Pass allocation', 'Events', 'Nikah', 'Safar', 'All portfolios'],
    note: 'RMS currently excluded',
    next: 'structure-centralit'
  },

  'structure-centralit': {
    type: 'three-sector',
    title: 'Central IT - 3 Sector Structure',
    visual: 'three-sectors',
    sectors: [
      { 
        name: 'Central IT A',
        title: 'Compliance Sector',
        role: 'Approvals & Governance',
        icon: 'shield'
      },
      { 
        name: 'Central IT B',
        title: 'Service Sector',
        role: 'IT Company - Service Provider',
        icon: 'server',
        note: 'Departments are clients'
      },
      { 
        name: 'Central IT C',
        title: 'R&D Sector',
        role: 'Innovation & Research',
        icon: 'zap'
      }
    ],
    functions: '12 Core Functions',
    next: 'discussion-intro'
  },

  'discussion-intro': {
    type: 'summary',
    title: 'Ready for Discussion',
    visual: 'summary',
    covered: [
      '✓ ITS 20-year evolution',
      '✓ Department IT chaos',
      '✓ 4 years of Ashara failures',
      '✓ TekMindz contract journey',
      '✓ This year\'s decisions',
      '✓ New structure proposals'
    ],
    next: 'key-takeaways'
  },

  'key-takeaways': {
    type: 'takeaways',
    title: 'Key Takeaways',
    visual: 'takeaways',
    points: [
      {
        title: 'ITS Transformation',
        text: 'From Unique Identity Department to Full IT Service Provider',
        icon: 'transform'
      },
      {
        title: 'Uncontrolled Growth',
        text: '4 different IT approaches across departments with no governance',
        icon: 'alert'
      },
      {
        title: 'Recurring Crisis',
        text: '4 consecutive years of Ashara system failures',
        icon: 'crisis'
      },
      {
        title: 'Timeline Challenge',
        text: 'RMS completion now 14 months - old system for this year',
        icon: 'clock'
      },
      {
        title: 'Structure Proposal',
        text: 'Central Miqaat + 3-Sector Central IT structure proposed',
        icon: 'structure'
      }
    ],
    next: 'current-state'
  },

  'current-state': {
    type: 'current-state',
    title: 'Current State Summary',
    visual: 'current-state',
    status: [
      {
        area: 'This Year\'s Ashara',
        decision: 'Use old VMS system',
        status: 'decided',
        concern: 'Same system that has failed 4 years'
      },
      {
        area: 'RMS Development',
        decision: '14 months timeline with TekMindz',
        status: 'in-progress',
        concern: 'Expanded scope being defined'
      },
      {
        area: 'Central Miqaat Dept',
        decision: 'Two teams formed',
        status: 'starting',
        concern: 'RMS scope excluded for now'
      },
      {
        area: 'Central IT Structure',
        decision: '3-Sector model proposed',
        status: 'proposed',
        concern: 'Implementation details unclear'
      }
    ],
    next: 'critical-questions'
  },

  'critical-questions': {
    type: 'questions',
    title: 'Critical Questions for Discussion',
    visual: 'questions',
    categories: [
      {
        category: 'Immediate (This Year)',
        questions: [
          'How do we ensure old VMS doesn\'t fail again?',
          'What contingency plans for Ashara?',
          'Who monitors system during Ashara?'
        ]
      },
      {
        category: 'RMS Project',
        questions: [
          'How to prevent scope creep this time?',
          'Who approves requirements changes?',
          'What are the quality gates?',
          'Testing strategy for next year?'
        ]
      },
      {
        category: 'Central Miqaat',
        questions: [
          'When does RMS come under this dept?',
          'How do both teams coordinate?',
          'What\'s the roadmap?',
          'Resource allocation?'
        ]
      },
      {
        category: 'Central IT Structure',
        questions: [
          'Timeline for 3-sector implementation?',
          'How to staff Service Sector?',
          'Department resistance - how to handle?',
          'What about existing ITS team division?'
        ]
      }
    ],
    next: 'decision-points'
  },

  'decision-points': {
    type: 'decisions',
    title: 'Key Decision Points',
    visual: 'decision-points',
    decisions: [
      {
        title: 'ITS Staff Division',
        question: 'How to split ITS team between Miqaat and Central IT?',
        urgency: 'high',
        options: ['Clear criteria needed', 'Skills assessment', 'Voluntary vs assigned']
      },
      {
        title: 'Department IT Migration',
        question: 'Which departments move to Central IT Service Sector first?',
        urgency: 'high',
        options: ['Pilot departments', 'Migration timeline', 'Support during transition']
      },
      {
        title: 'Financial Approval Process',
        question: 'How does new approval process work?',
        urgency: 'medium',
        options: ['Approval authority', 'Budget limits', 'Exception handling']
      },
      {
        title: 'TekMindz Relationship',
        question: 'How to improve working relationship and processes?',
        urgency: 'high',
        options: ['Communication protocol', 'Change management', 'Quality standards']
      }
    ],
    next: 'risks'
  },

  'risks': {
    type: 'risks',
    title: 'Risks & Mitigation',
    visual: 'risks',
    risks: [
      {
        risk: 'Ashara Failure This Year',
        probability: 'high',
        impact: 'critical',
        mitigation: 'Load testing, backup plans, dedicated monitoring team'
      },
      {
        risk: 'RMS Delays Again',
        probability: 'medium',
        impact: 'high',
        mitigation: 'Strict change control, milestone reviews, buffer time'
      },
      {
        risk: 'Department Resistance',
        probability: 'high',
        impact: 'high',
        mitigation: 'Clear communication, pilot success stories, gradual rollout'
      },
      {
        risk: 'Resource Shortage',
        probability: 'high',
        impact: 'high',
        mitigation: 'Hiring plan, training programs, strategic outsourcing'
      },
      {
        risk: 'Knowledge Loss',
        probability: 'medium',
        impact: 'critical',
        mitigation: 'Documentation, knowledge transfer, overlap period'
      }
    ],
    next: 'next-steps'
  },

  'next-steps': {
    type: 'roadmap',
    title: 'Proposed Next Steps',
    visual: 'roadmap',
    phases: [
      {
        phase: 'Immediate (This Month)',
        items: [
          'Finalize Ashara contingency plan',
          'Begin ITS staff assessment',
          'Define RMS scope freeze date',
          'Approve Central IT structure'
        ]
      },
      {
        phase: 'Short Term (3 Months)',
        items: [
          'Complete staff division',
          'Pilot Service Sector with 2-3 departments',
          'RMS requirements finalization',
          'Central Miqaat team operations begin'
        ]
      },
      {
        phase: 'Medium Term (6 Months)',
        items: [
          'Service Sector fully operational',
          'All departments onboarded to Compliance',
          'RMS development milestone 1',
          'Process documentation complete'
        ]
      },
      {
        phase: 'Long Term (12 Months)',
        items: [
          'RMS ready for testing',
          'Full 3-sector structure operational',
          'R&D sector innovation projects',
          'Department IT fully transitioned'
        ]
      }
    ],
    next: 'decision-intro'
  },

  'decision-intro': {
    type: 'section-break',
    title: 'Critical Decisions Required',
    visual: 'decision-intro',
    subtitle: 'Strategic questions that must be answered today',
    next: 'q1-entities'
  },

  'q1-entities': {
    type: 'question',
    section: '1. Organizational Structure',
    title: 'Q1: Current Entities',
    context: 'After all restructuring discussions, we need clarity on what organizational entities exist.',
    question: 'How many distinct IT entities exist today?',
    options: [
      'ITS + Central IT (2 entities)',
      'ITS + Central IT + Central Miqaat (3 entities)',
      'ITS + Central IT + Central Miqaat + CRT (4 entities)',
      'Central IT + Central Miqaat only (ITS dissolved)'
    ],
    visual: 'question-card',
    next: 'q2-leadership'
  },

  'q2-leadership': {
    type: 'question',
    section: '1. Organizational Structure',
    title: 'Q2: Leadership Accountability',
    context: 'Clear leadership is essential for accountability and decision-making.',
    question: 'Who is the single accountable head for each entity?',
    subQuestions: [
      'ITS (if exists): _______',
      'Central IT: _______',
      'Central Miqaat (if exists): _______',
      'CRT Team: _______',
      'Miqaat Volunteer Team: _______'
    ],
    visual: 'question-card',
    note: 'Please specify one name for each entity that exists',
    next: 'q3-its-status'
  },

  'q3-its-status': {
    type: 'question',
    section: '1. Organizational Structure',
    title: 'Q3: ITS Entity Status',
    context: 'ITS started as Unique Identity department but evolved into IT service provider. With Central IT now created, clarity is needed.',
    question: 'Should ITS continue as a separate entity?',
    options: [
      'Yes - ITS remains independent entity',
      'No - ITS functions absorbed into other departments',
      'Partial - ITS becomes sub-department under Central IT'
    ],
    visual: 'question-card',
    next: 'q4-registry-ownership'
  },

  'q4-registry-ownership': {
    type: 'question',
    section: '2. ITS Core Functions',
    title: 'Q4: Mumin Registry Ownership',
    context: 'The Unique Identity Number and Mumin Registry is the ORIGINAL mission of ITS. This is critical infrastructure that must have a clear owner.',
    question: 'If ITS is dissolved or restructured, which department owns Mumin Registry?',
    options: [
      'Central IT takes ownership',
      'New dedicated Identity Management department',
      'ITS continues only for this core function',
      'Sigatul Amalat takes ownership'
    ],
    visual: 'question-card',
    next: 'q5-its-dev-team'
  },

  'q5-its-dev-team': {
    type: 'question',
    section: '2. ITS Core Functions',
    title: 'Q5: ITS Development Team Fate',
    context: 'ITS has an in-house development team. If ITS exists but software development moves to Central IT, what happens to this team?',
    question: 'What should happen to ITS in-house development team?',
    options: [
      'Move entirely to Central IT Service Sector',
      'Move entirely to Central Miqaat IT',
      'Split between Central IT and Miqaat IT',
      'Stay with ITS for registry maintenance only',
      'Dissolve - all projects move to vendors'
    ],
    visual: 'question-card',
    next: 'q6-software-dev'
  },

  'q6-software-dev': {
    type: 'question',
    section: '2. ITS Core Functions',
    title: 'Q6: Software Development Authority',
    context: 'ITS currently develops software for multiple departments. With Central IT created for governance, who should actually build software?',
    question: 'If ITS continues to exist, should it continue doing software development?',
    options: [
      'Yes - ITS continues all software development',
      'No - All software development moves to Central IT',
      'No - Development distributed (Miqaat→Miqaat IT, Others→Central IT)',
      'Hybrid - ITS does only registry-related development'
    ],
    visual: 'question-card',
    next: 'q7-mumin-frontend'
  },

  'q7-mumin-frontend': {
    type: 'question',
    section: '2. ITS Core Functions',
    title: 'Q7: Mumin Frontend Ownership',
    context: 'ITS52.com is the primary mumin-facing portal. It needs continuous development and maintenance.',
    question: 'Which department should own mumin frontend (ITS52.com) development?',
    options: [
      'ITS (if it continues)',
      'Central IT Service Sector',
      'Shared: ITS manages, Central IT develops',
      'Each relevant department owns their modules'
    ],
    visual: 'question-card',
    next: 'q8-miqaat-dept'
  },

  'q8-miqaat-dept': {
    type: 'question',
    section: '3. Central Miqaat Department',
    title: 'Q8: Central Miqaat Department Creation',
    context: 'Currently Miqaat activities are scattered - volunteer team, ITS development, CRT for requirements. A unified department was proposed.',
    question: 'Should a formal "Central Miqaat Department" be created?',
    options: [
      'Yes - Create new Central Miqaat Department',
      'No - Keep current structure (volunteer team + support)',
      'Partial - Formalize under existing department'
    ],
    visual: 'question-card',
    next: 'q9-miqaat-scope-in'
  },

  'q9-miqaat-scope-in': {
    type: 'question',
    section: '3. Central Miqaat Department',
    title: 'Q9: Miqaat Department Scope - Inclusions',
    context: 'If Central Miqaat Department is created, its scope must be clearly defined. Currently Miqaat involves: Waaz passes, Ashara, Nikah, Misaaq, Safar, and more.',
    question: 'What should be INCLUDED in Central Miqaat scope?',
    options: [
      'All Miqaat events (Waaz, Nikah, Misaaq, Safar, etc.) including Ashara',
      'All Miqaat events EXCEPT Ashara',
      'Only pass allocation for all events',
      'Comprehensive - All Miqaat + Event management + Logistics'
    ],
    visual: 'question-card',
    next: 'q10-miqaat-scope-out'
  },

  'q10-miqaat-scope-out': {
    type: 'question',
    section: '3. Central Miqaat Department',
    title: 'Q10: Miqaat Department Scope - Exclusions',
    context: 'Equally important is defining what is NOT part of Miqaat department to avoid overlap.',
    question: 'What should be EXCLUDED from Central Miqaat scope?',
    options: [
      'Ashara Raza process (too critical, separate ownership)',
      'IT infrastructure (handled by Central IT)',
      'Financial approvals (handled by relevant department)',
      'Software development (handled by IT departments)',
      'Mumin registry access (owned by ITS/Central IT)'
    ],
    visual: 'question-card',
    multiSelect: true,
    next: 'q11-miqaat-it-team'
  },

  'q11-miqaat-it-team': {
    type: 'question',
    section: '3. Central Miqaat Department',
    title: 'Q11: Dedicated Miqaat IT Team',
    context: 'Decision was made to create Miqaat IT team to study existing systems and identify gaps. This is separate from CRT which handles requirements.',
    question: 'Should Central Miqaat have its own dedicated IT team?',
    options: [
      'Yes - Dedicated Miqaat IT team',
      'No - Use Central IT Service Sector instead',
      'Hybrid - Small Miqaat IT for operations, Central IT for development',
      'No - Continue with ITS support'
    ],
    visual: 'question-card',
    next: 'q12-its-to-miqaat'
  },

  'q12-its-to-miqaat': {
    type: 'question',
    section: '3. Central Miqaat Department',
    title: 'Q12: ITS Developers to Miqaat',
    context: 'ITS in-house developers have been building Miqaat software for years. They have domain knowledge and experience.',
    question: 'Should ITS in-house developers move to Miqaat IT team?',
    options: [
      'Yes - All Miqaat-experienced ITS developers move to Miqaat IT',
      'No - They stay with ITS or move to Central IT',
      'Partial - Only some developers based on skills/preference',
      'Not applicable - Miqaat IT will not have in-house developers'
    ],
    visual: 'question-card',
    next: 'q13-centralit-miqaat-role'
  },

  'q13-centralit-miqaat-role': {
    type: 'question',
    section: '3. Central Miqaat Department',
    title: 'Q13: Central IT Role in Miqaat',
    context: 'Even if Miqaat has its own IT team, Central IT was created for governance, standards, and compliance.',
    question: 'What should be Central IT\'s role in Miqaat IT?',
    options: [
      'Full governance - All Miqaat IT decisions go through Central IT',
      'Compliance only - Central IT approves financials and standards',
      'Service provider - Miqaat IT requests, Central IT delivers',
      'Advisory only - Central IT provides guidance, Miqaat decides',
      'No role - Miqaat IT completely independent'
    ],
    visual: 'question-card',
    next: 'q14-rms-placement'
  },

  'q14-rms-placement': {
    type: 'question',
    section: '4. RMS Project Placement',
    title: 'Q14: RMS Organizational Placement',
    context: 'RMS is currently under CRT with 2 SPOCs (Abdulqadir bs, Shabbir Vaziri). If Ashara is excluded from Miqaat Department scope, where does RMS belong?',
    question: 'Which department should own the RMS project?',
    options: [
      'Central Miqaat Department (if created)',
      'ITS Department (if it continues)',
      'Central IT directly',
      'Separate Ashara Department',
      'CRT remains as independent project team'
    ],
    visual: 'question-card',
    next: 'q15-rms-scope-limit'
  },

  'q15-rms-scope-limit': {
    type: 'question',
    section: '4. RMS Project Placement',
    title: 'Q15: RMS Scope Limitation',
    context: 'RMS was originally designed for Ashara Raza. But discussion arose that since timeline is 14 months, why not expand scope to cover all Miqaat needs?',
    question: 'Should RMS scope remain limited to Ashara only?',
    options: [
      'Yes - RMS is Ashara-only, separate systems for other events',
      'No - RMS should be comprehensive Miqaat solution',
      'Phased - Start with Ashara, expand later',
      'Reconside - Maybe RMS is wrong approach entirely'
    ],
    visual: 'question-card',
    next: 'q16-rms-unified'
  },

  'q16-rms-unified': {
    type: 'question',
    section: '4. RMS Project Placement',
    title: 'Q16: RMS as Unified Platform',
    context: 'If RMS is not limited to Ashara and expands to comprehensive Miqaat solution, it becomes the unified platform.',
    question: 'Is RMS intended to be the single unified Miqaat software?',
    options: [
      'Yes - RMS will eventually replace all Miqaat systems',
      'No - RMS is one of multiple Miqaat systems',
      'Unclear - This needs to be decided first'
    ],
    visual: 'question-card',
    next: 'q17-rms-requirements'
  },

  'q17-rms-requirements': {
    type: 'question',
    section: '4. RMS Project Placement',
    title: 'Q17: RMS Requirements Ownership',
    context: 'Currently CRT gathers requirements. TekMindz develops. But if RMS is comprehensive Miqaat solution, requirements ownership is strategic.',
    question: 'Who should own RMS requirements and development direction?',
    options: [
      'CRT Team (current structure)',
      'Central Miqaat Department (if created)',
      'Central IT Service Sector',
      'Joint: Miqaat defines needs, Central IT manages execution',
      'TekMindz (vendor-led based on best practices)'
    ],
    visual: 'question-card',
    next: 'q18-centralit-in-rms'
  },

  'q18-centralit-in-rms': {
    type: 'question',
    section: '4. RMS Project Placement',
    title: 'Q18: Central IT in RMS Structure',
    context: 'Currently: CRT → Requirements, Abdulqadir bs & Shabbir Vaziri → SPOC with TekMindz. Central IT is not in this structure despite being governance body.',
    question: 'Where should Central IT fit in RMS project structure?',
    options: [
      'Project owner - RMS reports to Central IT',
      'Governance - Approves scope, budget, milestones',
      'Advisor - Consulted but CRT/SPOC run project',
      'Service provider - Manages vendor on behalf of Miqaat',
      'Not involved - RMS is outside Central IT scope'
    ],
    visual: 'question-card',
    next: 'q19-rms-always-outside'
  },

  'q19-rms-always-outside': {
    type: 'question',
    section: '4. RMS Project Placement',
    title: 'Q19: RMS Long-term Governance',
    context: 'Central IT was created to bring all IT under governance. But RMS is proceeding outside this structure.',
    question: 'Should RMS permanently remain outside Central IT scope?',
    options: [
      'Yes - RMS is special case, always separate',
      'No - RMS should come under Central IT governance',
      'Temporary - Outside for now, transfer to Central IT later',
      'Partial - Central IT governs but doesn\'t operate'
    ],
    visual: 'question-card',
    next: 'q20-rms-outsource'
  },

  'q20-rms-outsource': {
    type: 'question',
    section: '5. Outsourcing Strategy',
    title: 'Q20: RMS Outsourcing Decision',
    context: 'RMS is mission-critical with complex scope. Outsourcing brings quality but creates dependency. In-house gives control but requires capability.',
    question: 'Given criticality and future scope, should RMS be outsourced?',
    options: [
      'Yes - Outsource to professional vendor (TekMindz or other)',
      'No - Build in-house with ITS or Central IT team',
      'Hybrid - Vendor builds, in-house team shadows to learn',
      'Recondsider - Maybe simpler in-house solution is better'
    ],
    visual: 'question-card',
    next: 'q21-vendor-dependency'
  },

  'q21-vendor-dependency': {
    type: 'question',
    section: '5. Outsourcing Strategy',
    title: 'Q21: Accept Vendor Dependency?',
    context: 'If we outsource RMS and it becomes the unified Miqaat platform, we will depend on vendor for all future changes, support, and enhancements.',
    question: 'Are we comfortable with permanent vendor dependency for critical Miqaat systems?',
    options: [
      'Yes - Professional vendors are better long-term',
      'No - We must maintain in-house capability',
      'Conditional - Depends on handover and documentation quality',
      'Mitigated - Multiple vendors prevents single dependency'
    ],
    visual: 'question-card',
    next: 'q22-project-revisit'
  },

  'q22-project-revisit': {
    type: 'question',
    section: '5. Outsourcing Strategy',
    title: 'Q22: Revisit RMS Project Approval',
    context: 'RMS was approved because "80% complete - just finish it". Now TekMindz says requirements changed, 14 months needed, not ready this year.',
    question: 'Should RMS project approval be revisited given changed circumstances?',
    options: [
      'Yes - Re-evaluate if RMS is still right approach',
      'No - Continue as approved, just update timeline',
      'Partial - Revisit scope but continue project',
      'Yes - Cancel RMS, explore alternatives'
    ],
    visual: 'question-card',
    next: 'q23-continue-rms'
  },

  'q23-continue-rms': {
    type: 'question',
    section: '5. Outsourcing Strategy',
    title: 'Q23: Continue RMS Project?',
    context: 'Given the issues: not 80% complete, 14 month timeline, vendor relationship challenges, scope questions, cost implications.',
    question: 'Should we continue the RMS project with TekMindz?',
    options: [
      'Yes - Continue with TekMindz',
      'Yes - But re-negotiate terms and timeline',
      'Pause - Resolve organizational questions first',
      'No - Cancel and explore alternatives',
      'Switch - Continue project but change vendor'
    ],
    visual: 'question-card',
    next: 'q24-financial-owner'
  },

  'q24-financial-owner': {
    type: 'question',
    section: '5. Outsourcing Strategy',
    title: 'Q24: Financial Negotiations Owner',
    context: 'RMS financial discussions were kept separate. With 14-month timeline and expanded scope, significant budget is needed.',
    question: 'Which department should conduct financial negotiations for RMS?',
    options: [
      'Central IT (as IT governance body)',
      'Central Miqaat (if project owner)',
      'Sigatul Amalat (as central administration)',
      'CRT Team (current project leaders)',
      'Joint committee from relevant departments'
    ],
    visual: 'question-card',
    next: 'q25-handover-reality'
  },

  'q25-handover-reality': {
    type: 'question',
    section: '5. Outsourcing Strategy',
    title: 'Q25: Accept Handover Limitations?',
    context: 'TekMindz is building high-end, complex solution. Our in-house team realistically cannot take over maintenance or continue development after handover.',
    question: 'Are we accepting that in-house team cannot maintain TekMindz-built solution?',
    options: [
      'Yes - Accept permanent vendor relationship',
      'No - This is unacceptable, build simpler in-house',
      'No - Train in-house team to take over (requires investment)',
      'Conditional - Vendor provides intensive knowledge transfer'
    ],
    visual: 'question-card',
    next: 'q26-service-sector-timing'
  },

  'q26-service-sector-timing': {
    type: 'question',
    section: '6. Central IT Service Sector',
    title: 'Q26: Service Sector Creation Timing',
    context: 'Central IT currently has no Service Sector - cannot provide services, only compliance. Meanwhile outsourced products are being built. Timing question: when to build capability?',
    question: 'When should Central IT Service Sector be created?',
    options: [
      'Before outsourcing - Build capability first, then decide',
      'Simultaneously - Build sector while vendor builds RMS',
      'After handover - Once vendor delivers, build team to maintain',
      'Not needed - Continue with vendors permanently'
    ],
    visual: 'question-card',
    next: 'q27-service-sector-lead'
  },

  'q27-service-sector-lead': {
    type: 'question',
    section: '6. Central IT Service Sector',
    title: 'Q27: Service Sector Leadership',
    context: 'Service Sector will be a full IT company serving all departments. Requires technical expertise, management skills, and strategic vision.',
    question: 'Who should lead the Central IT Service Sector?',
    options: [
      'Taikhoom bs (has ITS experience)',
      'Taher Bhai Baghdadi (current CTO)',
      'Murtaza bhai Badri (has department IT experience)',
      'External hire (professional IT leader)',
      'To be decided based on structure finalization'
    ],
    visual: 'question-card',
    next: 'q28-service-sector-scope'
  },

  'q28-service-sector-scope': {
    type: 'question',
    section: '6. Central IT Service Sector',
    title: 'Q28: Service Sector Capabilities',
    context: 'Service Sector needs to provide complete IT services. What should be included?',
    question: 'What capabilities should Service Sector provide?',
    options: [
      'Software development only',
      'Development + Infrastructure + Support',
      'Development + Support + Requirements gathering',
      'Full service: Requirements + Development + Infrastructure + Support + Training',
      'Vendor management (outsource but manage vendors)'
    ],
    visual: 'question-card',
    multiSelect: true,
    next: 'q29-tekmindz-support'
  },

  'q29-tekmindz-support': {
    type: 'question',
    section: '6. Central IT Service Sector',
    title: 'Q29: TekMindz Support Contract',
    context: 'TekMindz currently provides ongoing IT support to Miqaat beyond RMS development. This is operational support work.',
    question: 'Should TekMindz support contract continue or move to Central IT?',
    options: [
      'Continue - TekMindz provides better support',
      'Move to Central IT - Part of Service Sector scope',
      'Transition - TekMindz now, Central IT gradually takes over',
      'Depends - Wait for Service Sector to be operational first'
    ],
    visual: 'question-card',
    next: 'q30-requirements-owner'
  },

  'q30-requirements-owner': {
    type: 'question',
    section: '6. Central IT Service Sector',
    title: 'Q30: Requirements Creation Responsibility',
    context: 'Proper requirements are critical. Past issues partly due to changing requirements. Creating good requirements requires skill and domain knowledge.',
    question: 'Should requirements creation be part of Service Sector or department responsibility?',
    options: [
      'Department responsibility - They know their needs',
      'Service Sector - They have technical expertise to translate needs',
      'Joint - Departments define needs, Service Sector formalizes',
      'Specialist team - Separate business analysts in Central IT',
      'Vendor-led - Vendors help define best practices'
    ],
    visual: 'question-card',
    next: 'q31-future-direction'
  },

  'q31-future-direction': {
    type: 'question',
    section: '7. Strategic Direction',
    title: 'Q31: In-house vs Outsourcing Philosophy',
    context: 'PAST: Miqaat software built in-house (ITS team). We had flexibility, control, quick changes, no vendor dependency.\n\nFUTURE: Moving to outsourced vendors. Professional quality but vendor dependency, costs for changes, less control.',
    question: 'Is outsourcing the strategic direction we want long-term?',
    options: [
      'Yes - Outsourcing is better for quality and scale',
      'No - We should build in-house capability',
      'Hybrid - Critical systems in-house, others outsourced',
      'Transitional - Outsource now, build capability for future',
      'Case-by-case - Different approach for different systems'
    ],
    visual: 'question-card',
    next: 'q32-requirements-bandwidth'
  },

  'q32-requirements-bandwidth': {
    type: 'question',
    section: '7. Strategic Direction',
    title: 'Q32: Requirements Management Capability',
    context: 'With outsourcing, changes cost money and time. Requires upfront thorough requirements. Past showed requirements kept changing during development.',
    question: 'Do we have bandwidth and capability to create stable, complete requirements?',
    options: [
      'Yes - We can create proper requirements with training',
      'No - This is why requirements keep changing',
      'Partially - Need to hire specialists or train people',
      'Unclear - Need to assess current capability first'
    ],
    visual: 'question-card',
    next: 'q33-gcc-exploration'
  },

  'q33-gcc-exploration': {
    type: 'question',
    section: '7. Strategic Direction',
    title: 'Q33: GCC vs Service Sector',
    context: 'GCC (Global Capability Center) concept was proposed earlier. GCC is similar to Service Sector but potentially larger scale, serving global needs, possibly revenue-generating.',
    question: 'Should GCC be explored further as alternative to Service Sector?',
    options: [
      'Yes - GCC is better strategic vision',
      'No - Service Sector is sufficient',
      'Yes - Explore both, compare before deciding',
      'Sequential - Start with Service Sector, evolve to GCC',
      'Not now - Resolve current issues first'
    ],
    visual: 'question-card',
    next: 'q34-ideal-structure'
  },

  'q34-ideal-structure': {
    type: 'question',
    section: '7. Strategic Direction',
    title: 'Q34: Ideal Long-term Structure',
    context: 'We have discussed many options: ITS, Central IT (3 sectors), Central Miqaat, CRT, vendors, GCC. What is the ideal end-state?',
    question: 'What should the ideal IT organizational structure be?',
    subQuestions: [
      'How many departments?',
      'What are clear responsibilities of each?',
      'Who leads what?',
      'In-house vs outsourcing balance?',
      'Timeline to achieve ideal state?'
    ],
    visual: 'question-card',
    note: 'This requires comprehensive discussion and agreement',
    next: 'decision-summary'
  },

  'decision-summary': {
    type: 'decision-summary',
    title: 'Decision Framework Summary',
    visual: 'decision-summary',
    categories: [
      { name: 'Organizational Structure', count: 7, urgency: 'Critical' },
      { name: 'ITS Future', count: 4, urgency: 'High' },
      { name: 'Central Miqaat', count: 6, urgency: 'High' },
      { name: 'RMS Placement', count: 6, urgency: 'Critical' },
      { name: 'Outsourcing Strategy', count: 6, urgency: 'Critical' },
      { name: 'Service Sector', count: 5, urgency: 'High' },
      { name: 'Strategic Direction', count: 4, urgency: 'Medium' }
    ],
    total: 34,
    next: 'end'
  },

  end: {
    type: 'end',
    title: 'Ready for Decisions',
    visual: 'end'
  }
};

const VisualComponent = ({ slide }) => {
  const visual = slide.visual;
  
  if (visual === 'intro') {
    return (
      <div className="text-center py-12">
        <div className="grid grid-cols-3 gap-8 max-w-3xl mx-auto mb-8">
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-3">
              <Database className="w-10 h-10 text-blue-600" />
            </div>
            <span className="text-sm font-semibold text-slate-700">20 Years History</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mb-3">
              <Workflow className="w-10 h-10 text-purple-600" />
            </div>
            <span className="text-sm font-semibold text-slate-700">Evolution</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-3">
              <TrendingUp className="w-10 h-10 text-green-600" />
            </div>
            <span className="text-sm font-semibold text-slate-700">Future Structure</span>
          </div>
        </div>
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-8">
          <p className="text-lg text-slate-700 leading-relaxed">
            Understanding the complete journey of IT development,<br/>
            current challenges, and proposed solutions
          </p>
        </div>
      </div>
    );
  }

  if (visual === 'two-departments') {
    return (
      <div className="py-8">
        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-8 text-white shadow-xl">
            <div className="flex items-center gap-3 mb-6">
              <Building2 className="w-12 h-12" />
              <div>
                <h3 className="text-2xl font-bold">ITS</h3>
                <p className="text-blue-100 text-sm">IT Services</p>
              </div>
            </div>
            <div className="space-y-3 text-sm">
              <div className="bg-white/20 rounded-lg p-3">
                <strong>Department:</strong> Idarat ul Tareef al Shakhsi
              </div>
              <div className="bg-white/20 rounded-lg p-3">
                <strong>Leader:</strong> Taikhoom bs
              </div>
              <div className="bg-white/20 rounded-lg p-3">
                <strong>Started:</strong> 20 years ago
              </div>
              <div className="bg-white/20 rounded-lg p-3">
                <strong>Role:</strong> Identity + Service Provider
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-8 text-white shadow-xl">
            <div className="flex items-center gap-3 mb-6">
              <Shield className="w-12 h-12" />
              <div>
                <h3 className="text-2xl font-bold">Central IT</h3>
                <p className="text-purple-100 text-sm">IT Governance</p>
              </div>
            </div>
            <div className="space-y-3 text-sm">
              <div className="bg-white/20 rounded-lg p-3">
                <strong>Leader:</strong> Moiz bs
              </div>
              <div className="bg-white/20 rounded-lg p-3">
                <strong>CTO:</strong> Taher Bhai Baghdadi
              </div>
              <div className="bg-white/20 rounded-lg p-3">
                <strong>Started:</strong> Recently
              </div>
              <div className="bg-white/20 rounded-lg p-3">
                <strong>Role:</strong> Compliance & Governance
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (visual === 'its-timeline') {
    return (
      <div className="py-8">
        <div className="relative">
          <div className="absolute left-8 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 to-blue-300"></div>
          <div className="space-y-6">
            {slide.points.map((point, idx) => (
              <div key={idx} className="flex items-start gap-6 relative">
                <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg z-10">
                  {idx + 1}
                </div>
                <div className="flex-1 bg-white border-2 border-blue-200 rounded-xl p-5 shadow-md">
                  <p className="text-lg font-semibold text-slate-800">{point.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (visual === 'four-pillars') {
    return (
      <div className="py-8">
        <div className="grid md:grid-cols-2 gap-6">
          {slide.elements.map((el, idx) => {
            const colors = [
              { bg: 'bg-blue-500', light: 'bg-blue-50', text: 'text-blue-600' },
              { bg: 'bg-purple-500', light: 'bg-purple-50', text: 'text-purple-600' },
              { bg: 'bg-green-500', light: 'bg-green-50', text: 'text-green-600' },
              { bg: 'bg-orange-500', light: 'bg-orange-50', text: 'text-orange-600' }
            ];
            const color = colors[idx];
            return (
              <div key={idx} className={`${color.light} rounded-2xl p-6 border-2 border-${color.bg.replace('bg-', '')}/20`}>
                <div className={`w-16 h-16 ${color.bg} rounded-xl flex items-center justify-center text-white mb-4 shadow-lg`}>
                  <span className="text-2xl font-bold">{idx + 1}</span>
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">{el.name}</h3>
                <p className={`text-sm font-medium ${color.text}`}>{el.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (visual === 'transformation') {
    return (
      <div className="py-8">
        <div className="flex items-center justify-center gap-8 mb-8">
          <div className="bg-blue-100 rounded-2xl p-8 text-center max-w-xs">
            <div className="w-16 h-16 bg-blue-500 rounded-full mx-auto mb-4 flex items-center justify-center">
              <Database className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">Started As</h3>
            <p className="text-slate-700">{slide.from}</p>
          </div>
          
          <div className="flex flex-col items-center">
            <ChevronRight className="w-12 h-12 text-blue-500 mb-2" />
            <span className="text-sm font-semibold text-slate-500">Evolution</span>
          </div>
          
          <div className="bg-purple-100 rounded-2xl p-8 text-center max-w-xs">
            <div className="w-16 h-16 bg-purple-500 rounded-full mx-auto mb-4 flex items-center justify-center">
              <Server className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">Became</h3>
            <p className="text-slate-700">{slide.to}</p>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6">
          <h4 className="font-bold text-slate-800 mb-4 text-center">Key Impacts:</h4>
          <div className="grid md:grid-cols-2 gap-3">
            {slide.impacts.map((impact, idx) => (
              <div key={idx} className="flex items-center gap-3 bg-white rounded-lg p-3">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                <span className="text-slate-700">{impact}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (visual === 'miqaat-flow') {
    return (
      <div className="py-8">
        <div className="bg-blue-50 rounded-xl p-4 mb-6 text-center">
          <span className="font-bold text-slate-700">Led by: </span>
          <span className="text-blue-600 font-bold text-lg">{slide.leader}</span>
        </div>
        
        <div className="relative">
          {slide.steps.map((step, idx) => (
            <div key={idx}>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg flex-shrink-0">
                  <span className="text-2xl font-bold">{idx + 1}</span>
                </div>
                <div className="flex-1 bg-white border-2 border-blue-200 rounded-xl p-4">
                  <h4 className="font-bold text-slate-800 mb-1">{step.title}</h4>
                  <p className="text-sm text-slate-600">{step.desc}</p>
                </div>
              </div>
              {idx < slide.steps.length - 1 && (
                <div className="flex justify-center my-3">
                  <ChevronRight className="w-8 h-8 text-blue-400 rotate-90" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (visual === 'scope-expansion') {
    return (
      <div className="py-8">
        <div className="grid md:grid-cols-2 gap-6">
          {slide.categories.map((cat, idx) => {
            const colors = ['blue', 'purple', 'green', 'orange'];
            const color = colors[idx];
            return (
              <div key={idx} className={`bg-${color}-50 rounded-2xl p-6 border-2 border-${color}-200`}>
                <h3 className={`text-xl font-bold text-${color}-700 mb-4`}>{cat.name}</h3>
                <div className="space-y-2">
                  {cat.items.map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full bg-${color}-500`}></div>
                      <span className="text-slate-700">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (visual === 'chaos-diagram') {
    return (
      <div className="py-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-red-100 text-red-700 px-6 py-3 rounded-full font-bold">
            <AlertTriangle className="w-5 h-5" />
            No Central Control
          </div>
        </div>
        
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {slide.options.map((opt, idx) => {
            const colorMap = {
              blue: 'bg-blue-500',
              purple: 'bg-purple-500',
              green: 'bg-green-500',
              orange: 'bg-orange-500'
            };
            return (
              <div key={idx} className={`${colorMap[opt.color]} rounded-xl p-5 text-white shadow-lg`}>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/30 rounded-full flex items-center justify-center text-2xl font-bold">
                    {opt.num}
                  </div>
                  <div className="text-lg font-semibold">{opt.text}</div>
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="bg-slate-100 rounded-2xl p-6">
          <h4 className="font-bold text-slate-800 mb-4 text-center">Multiple Portals Created:</h4>
          <div className="flex flex-wrap justify-center gap-3">
            {slide.portals.map((portal, idx) => (
              <span key={idx} className="bg-white px-4 py-2 rounded-lg text-slate-700 font-medium text-sm shadow">
                {portal}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (visual === 'problems-chart') {
    return (
      <div className="py-8">
        <div className="space-y-4">
          {slide.issues.map((issue, idx) => {
            const severityColors = {
              high: 'bg-orange-500',
              critical: 'bg-red-600'
            };
            return (
              <div key={idx} className="flex items-center gap-4 bg-white border-2 border-red-200 rounded-xl p-5">
                <div className={`w-16 h-16 ${severityColors[issue.severity]} rounded-full flex items-center justify-center flex-shrink-0`}>
                  <XCircle className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-lg font-bold text-slate-800">{issue.text}</p>
                  <span className={`text-sm font-semibold ${issue.severity === 'critical' ? 'text-red-600' : 'text-orange-600'} uppercase`}>
                    {issue.severity}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (visual === 'central-it-org') {
    return (
      <div className="py-8">
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-8 text-white mb-6 text-center">
          <Shield className="w-16 h-16 mx-auto mb-4" />
          <h3 className="text-2xl font-bold mb-2">{slide.leadership.name}</h3>
          <p className="text-purple-100">{slide.leadership.role}</p>
          <div className="mt-4 pt-4 border-t border-white/30">
            <p className="text-sm font-semibold mb-1">CTO</p>
            <p className="text-lg">{slide.cto.name}</p>
          </div>
        </div>
        
        <div className="bg-purple-50 rounded-2xl p-6 mb-6">
          <h4 className="font-bold text-purple-900 text-center mb-2">Current Role</h4>
          <p className="text-center text-lg text-purple-700 font-semibold">{slide.role}</p>
        </div>
        
        <div className="bg-red-50 rounded-2xl p-6">
          <h4 className="font-bold text-red-900 mb-4">Challenges:</h4>
          <div className="space-y-2">
            {slide.challenges.map((challenge, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <span className="text-slate-700">{challenge}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (visual === 'crisis-timeline') {
    return (
      <div className="py-8">
        <div className="relative">
          <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-gradient-to-b from-red-500 to-red-300 -ml-0.5"></div>
          <div className="space-y-8">
            {slide.events.map((event, idx) => {
              const statusColors = {
                fail: 'bg-red-500',
                critical: 'bg-red-700',
                action: 'bg-blue-500'
              };
              const statusIcons = {
                fail: <XCircle className="w-8 h-8" />,
                critical: <AlertTriangle className="w-8 h-8" />,
                action: <Settings className="w-8 h-8" />
              };
              return (
                <div key={idx} className={`flex items-center gap-6 ${idx % 2 === 0 ? 'flex-row' : 'flex-row-reverse'}`}>
                  <div className={`flex-1 ${idx % 2 === 0 ? 'text-right' : 'text-left'}`}>
                    <div className="bg-white border-2 border-red-200 rounded-xl p-5 shadow-md inline-block">
                      <h4 className="font-bold text-slate-800 mb-2">{event.year}</h4>
                      <p className="text-slate-700">{event.event}</p>
                    </div>
                  </div>
                  <div className={`${statusColors[event.status]} w-16 h-16 rounded-full flex items-center justify-center text-white shadow-lg z-10`}>
                    {statusIcons[event.status]}
                  </div>
                  <div className="flex-1"></div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (visual === 'impact-diagram') {
    return (
      <div className="py-8">
        <div className="grid md:grid-cols-2 gap-6">
          {slide.impacts.map((impact, idx) => {
            const levelColors = {
              high: { bg: 'bg-orange-500', light: 'bg-orange-50', border: 'border-orange-300' },
              critical: { bg: 'bg-red-600', light: 'bg-red-50', border: 'border-red-300' }
            };
            const colors = levelColors[impact.level];
            return (
              <div key={idx} className={`${colors.light} border-2 ${colors.border} rounded-xl p-6`}>
                <div className="flex items-start gap-4">
                  <div className={`${colors.bg} w-12 h-12 rounded-full flex items-center justify-center text-white flex-shrink-0`}>
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 mb-2">{impact.area}</h4>
                    <p className="text-slate-700 mb-2">{impact.effect}</p>
                    <span className={`text-xs font-bold uppercase px-3 py-1 rounded-full ${colors.bg} text-white`}>
                      {impact.level}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (visual === 'contract-visual') {
    return (
      <div className="py-8">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-8 text-white mb-6">
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-white/20 rounded-full mx-auto flex items-center justify-center mb-4">
              <Code className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-bold mb-2">{slide.contract.company}</h3>
            <p className="text-blue-100">{slide.contract.type}</p>
          </div>
          <div className="bg-white/10 rounded-xl p-4 mb-4">
            <p className="font-semibold mb-1">Purpose:</p>
            <p className="text-blue-50">{slide.contract.purpose}</p>
          </div>
          <div className="bg-white/10 rounded-xl p-4">
            <p className="font-semibold mb-1">Critical Rule:</p>
            <p className="text-blue-50">{slide.contract.rule}</p>
          </div>
        </div>
        
        <div className="space-y-4">
          {slide.timeline.map((phase, idx) => {
            const colorMap = {
              green: 'bg-green-500',
              orange: 'bg-orange-500',
              red: 'bg-red-500'
            };
            return (
              <div key={idx} className="flex items-center gap-4">
                <div className={`${colorMap[phase.color]} w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl flex-shrink-0`}>
                  {idx + 1}
                </div>
                <div className="flex-1 bg-white border-2 border-slate-200 rounded-xl p-4">
                  <h4 className="font-bold text-slate-800">{phase.phase}</h4>
                  <p className="text-slate-600 text-sm">{phase.status}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (visual === 'crt-team') {
    return (
      <div className="py-8">
        <div className="bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl p-6 text-white text-center mb-8">
          <h3 className="text-3xl font-bold mb-2">Year {slide.year}</h3>
          <p className="text-lg">{slide.mission}</p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-6">
          {slide.team.map((member, idx) => (
            <div key={idx} className="bg-white border-2 border-blue-200 rounded-xl p-6 shadow-md">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white">
                  <Users className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-lg">{member.name}</h4>
                  <p className="text-slate-600 text-sm">{member.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (visual === 'proposals-comparison') {
    return (
      <div className="py-8">
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {slide.proposals.map((proposal, idx) => {
            const colors = idx === 0 ? 
              { bg: 'bg-blue-500', light: 'bg-blue-50', border: 'border-blue-300' } :
              { bg: 'bg-purple-500', light: 'bg-purple-50', border: 'border-purple-300' };
            return (
              <div key={idx} className={`${colors.light} border-2 ${colors.border} rounded-2xl p-6`}>
                <div className={`${colors.bg} text-white rounded-xl p-4 mb-4 text-center`}>
                  <h4 className="font-bold text-lg">{proposal.from}</h4>
                </div>
                <div className="space-y-3">
                  {proposal.points.map((point, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <CheckCircle className={`w-5 h-5 ${colors.bg.replace('bg-', 'text-')} flex-shrink-0 mt-0.5`} />
                      <span className="text-slate-700">{point}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-2xl p-6 text-white text-center">
          <CheckCircle className="w-12 h-12 mx-auto mb-4" />
          <h4 className="text-xl font-bold mb-2">Agreement Reached</h4>
          <p className="text-lg">{slide.agreement}</p>
        </div>
      </div>
    );
  }

  if (visual === 'timeline-shock') {
    return (
      <div className="py-8">
        <div className="space-y-8">
          <div className="bg-gradient-to-r from-blue-100 to-blue-50 border-2 border-blue-300 rounded-2xl p-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center text-white">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800">Assumption</h3>
            </div>
            <p className="text-xl text-slate-700 mb-3">{slide.assumption.text}</p>
            <div className="bg-white rounded-xl p-4">
              <p className="text-lg font-semibold text-blue-700">Timeline: {slide.assumption.timeline}</p>
            </div>
          </div>
          
          <div className="flex justify-center">
            <div className="text-center">
              <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-2 animate-pulse" />
              <p className="text-xl font-bold text-red-600">REALITY CHECK</p>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-red-100 to-red-50 border-2 border-red-300 rounded-2xl p-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center text-white">
                <XCircle className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800">Reality</h3>
            </div>
            <p className="text-xl text-slate-700 mb-3">{slide.reality.text}</p>
            <div className="bg-white rounded-xl p-4">
              <p className="text-lg font-semibold text-red-700">Timeline: {slide.reality.timeline}</p>
              <p className="text-slate-600 mt-2">{slide.reality.confidence}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (visual === 'decision-box') {
    return (
      <div className="py-8">
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-8 text-white text-center mb-8">
          <AlertTriangle className="w-20 h-20 mx-auto mb-4" />
          <h3 className="text-3xl font-bold mb-4">Decision Made</h3>
          <div className="bg-white/20 rounded-xl p-6 text-2xl font-bold">
            {slide.decision}
          </div>
        </div>
        
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {slide.systems.map((system, idx) => (
            <div key={idx} className="bg-orange-50 border-2 border-orange-200 rounded-xl p-6 text-center">
              <Server className="w-12 h-12 text-orange-600 mx-auto mb-3" />
              <p className="font-bold text-slate-800 text-lg">{system}</p>
            </div>
          ))}
        </div>
        
        <div className="bg-slate-100 rounded-xl p-6">
          <p className="text-slate-600 text-center mb-4">{slide.reasoning}</p>
          <div className="bg-blue-500 text-white rounded-xl p-4 text-center">
            <strong>Future:</strong> {slide.future}
          </div>
        </div>
      </div>
    );
  }

  if (visual === 'scope-comparison') {
    return (
      <div className="py-8">
        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-slate-100 border-2 border-slate-300 rounded-2xl p-6">
            <div className="bg-slate-500 text-white rounded-xl p-4 text-center mb-6">
              <h3 className="text-xl font-bold">{slide.old.title}</h3>
            </div>
            <div className="space-y-3">
              {slide.old.items.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-600">{item}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-green-50 border-2 border-green-300 rounded-2xl p-6">
            <div className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl p-4 text-center mb-6">
              <h3 className="text-xl font-bold">{slide.new.title}</h3>
            </div>
            <div className="space-y-3">
              {slide.new.items.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700 font-medium">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="mt-6 text-center">
          <ArrowRight className="w-12 h-12 text-green-500 mx-auto" />
        </div>
      </div>
    );
  }

  if (visual === 'miqaat-structure') {
    return (
      <div className="py-8">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white text-center mb-8">
          <Building2 className="w-16 h-16 mx-auto mb-4" />
          <h3 className="text-3xl font-bold">{slide.department}</h3>
        </div>
        
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {slide.teams.map((team, idx) => (
            <div key={idx} className="bg-white border-2 border-blue-300 rounded-xl p-6 shadow-lg">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white mb-4 mx-auto">
                {idx + 1}
              </div>
              <h4 className="text-xl font-bold text-slate-800 text-center mb-2">{team.name}</h4>
              <p className="text-center text-slate-600">{team.focus}</p>
            </div>
          ))}
        </div>
        
        <div className="bg-blue-50 rounded-xl p-6">
          <h4 className="font-bold text-slate-800 text-center mb-4">Comprehensive Scope:</h4>
          <div className="flex flex-wrap justify-center gap-3">
            {slide.scope.map((item, idx) => (
              <span key={idx} className="bg-blue-500 text-white px-4 py-2 rounded-lg font-medium">
                {item}
              </span>
            ))}
          </div>
          <p className="text-center text-slate-600 mt-4 text-sm italic">{slide.note}</p>
        </div>
      </div>
    );
  }

  if (visual === 'three-sectors') {
    return (
      <div className="py-8">
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-6 text-white text-center mb-8">
          <h3 className="text-2xl font-bold mb-2">3 Sector Structure</h3>
          <p className="text-purple-100">{slide.functions}</p>
        </div>
        
        <div className="space-y-6">
          {slide.sectors.map((sector, idx) => {
            const colors = [
              { bg: 'from-red-500 to-red-600', light: 'bg-red-50', border: 'border-red-300' },
              { bg: 'from-blue-500 to-blue-600', light: 'bg-blue-50', border: 'border-blue-300' },
              { bg: 'from-green-500 to-green-600', light: 'bg-green-50', border: 'border-green-300' }
            ];
            const color = colors[idx];
            const icons = {
              shield: Shield,
              server: Server,
              zap: Zap
            };
            const Icon = icons[sector.icon];
            
            return (
              <div key={idx} className={`${color.light} border-2 ${color.border} rounded-2xl p-6`}>
                <div className="flex items-start gap-6">
                  <div className={`bg-gradient-to-br ${color.bg} w-20 h-20 rounded-xl flex items-center justify-center text-white shadow-lg flex-shrink-0`}>
                    <Icon className="w-10 h-10" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-xl font-bold text-slate-800 mb-1">{sector.name}</h4>
                    <p className="text-lg font-semibold text-slate-700 mb-2">{sector.title}</p>
                    <p className="text-slate-600 mb-2">{sector.role}</p>
                    {sector.note && (
                      <div className="bg-white rounded-lg p-3 mt-3">
                        <p className="text-sm font-medium text-slate-700">{sector.note}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (visual === 'summary') {
    return (
      <div className="py-8">
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-8 text-white mb-8 text-center">
          <CheckCircle className="w-20 h-20 mx-auto mb-4" />
          <h3 className="text-3xl font-bold">Presentation Complete</h3>
        </div>
        
        <div className="grid md:grid-cols-2 gap-4">
          {slide.covered.map((item, idx) => (
            <div key={idx} className="bg-white border-2 border-green-200 rounded-xl p-4 flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0" />
              <span className="text-slate-700">{item}</span>
            </div>
          ))}
        </div>
        
        <div className="mt-8 bg-blue-50 rounded-2xl p-6 text-center">
          <p className="text-lg text-slate-700 font-semibold">Ready to begin discussion</p>
        </div>
      </div>
    );
  }

  if (visual === 'takeaways') {
    return (
      <div className="py-8">
        <div className="space-y-5">
          {slide.points.map((point, idx) => {
            const colors = ['blue', 'orange', 'red', 'purple', 'green'];
            const color = colors[idx];
            return (
              <div key={idx} className={`bg-${color}-50 border-l-4 border-${color}-500 rounded-xl p-6 shadow-md`}>
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 bg-${color}-500 rounded-full flex items-center justify-center text-white font-bold text-xl flex-shrink-0`}>
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-xl font-bold text-slate-800 mb-2">{point.title}</h4>
                    <p className="text-slate-700">{point.text}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (visual === 'current-state') {
    return (
      <div className="py-8">
        <div className="space-y-5">
          {slide.status.map((item, idx) => {
            const statusColors = {
              decided: { bg: 'bg-green-500', light: 'bg-green-50', border: 'border-green-300' },
              'in-progress': { bg: 'bg-blue-500', light: 'bg-blue-50', border: 'border-blue-300' },
              starting: { bg: 'bg-purple-500', light: 'bg-purple-50', border: 'border-purple-300' },
              proposed: { bg: 'bg-orange-500', light: 'bg-orange-50', border: 'border-orange-300' }
            };
            const colors = statusColors[item.status];
            return (
              <div key={idx} className={`${colors.light} border-2 ${colors.border} rounded-xl p-6`}>
                <div className="flex items-start justify-between mb-3">
                  <h4 className="text-lg font-bold text-slate-800">{item.area}</h4>
                  <span className={`${colors.bg} text-white px-3 py-1 rounded-full text-xs font-bold uppercase`}>
                    {item.status}
                  </span>
                </div>
                <div className="bg-white rounded-lg p-4 mb-3">
                  <p className="text-slate-700 font-medium">{item.decision}</p>
                </div>
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-slate-600">{item.concern}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (visual === 'questions') {
    return (
      <div className="py-8">
        <div className="grid md:grid-cols-2 gap-6">
          {slide.categories.map((cat, idx) => {
            const colors = [
              { bg: 'bg-red-500', light: 'bg-red-50' },
              { bg: 'bg-blue-500', light: 'bg-blue-50' },
              { bg: 'bg-purple-500', light: 'bg-purple-50' },
              { bg: 'bg-green-500', light: 'bg-green-50' }
            ];
            const color = colors[idx];
            return (
              <div key={idx} className={`${color.light} rounded-xl p-6 border-2 border-slate-200`}>
                <div className={`${color.bg} text-white rounded-lg p-3 mb-4 text-center font-bold`}>
                  {cat.category}
                </div>
                <div className="space-y-3">
                  {cat.questions.map((q, i) => (
                    <div key={i} className="bg-white rounded-lg p-3 flex items-start gap-2 shadow-sm">
                      <span className={`${color.bg} text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0`}>
                        {i + 1}
                      </span>
                      <p className="text-sm text-slate-700 flex-1">{q}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (visual === 'decision-points') {
    return (
      <div className="py-8">
        <div className="space-y-6">
          {slide.decisions.map((decision, idx) => {
            const urgencyColors = {
              high: { bg: 'bg-red-500', light: 'bg-red-50', border: 'border-red-300' },
              medium: { bg: 'bg-orange-500', light: 'bg-orange-50', border: 'border-orange-300' }
            };
            const colors = urgencyColors[decision.urgency];
            return (
              <div key={idx} className={`${colors.light} border-2 ${colors.border} rounded-xl p-6`}>
                <div className="flex items-start justify-between mb-4">
                  <h4 className="text-xl font-bold text-slate-800 flex-1">{decision.title}</h4>
                  <span className={`${colors.bg} text-white px-3 py-1 rounded-full text-xs font-bold uppercase ml-4`}>
                    {decision.urgency}
                  </span>
                </div>
                <div className="bg-white rounded-lg p-4 mb-4">
                  <p className="text-slate-700 font-medium">{decision.question}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-slate-700 mb-2">Consider:</p>
                  {decision.options.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
                      <span className="text-sm text-slate-600">{opt}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (visual === 'risks') {
    return (
      <div className="py-8">
        <div className="space-y-5">
          {slide.risks.map((risk, idx) => {
            const probColors = {
              high: 'bg-red-500',
              medium: 'bg-orange-500',
              low: 'bg-yellow-500'
            };
            const impactColors = {
              critical: 'bg-red-700',
              high: 'bg-orange-600',
              medium: 'bg-yellow-600'
            };
            return (
              <div key={idx} className="bg-white border-2 border-slate-200 rounded-xl p-6 shadow-md">
                <div className="flex items-start justify-between mb-4">
                  <h4 className="text-lg font-bold text-slate-800 flex-1">{risk.risk}</h4>
                  <div className="flex gap-2 ml-4">
                    <span className={`${probColors[risk.probability]} text-white px-3 py-1 rounded-full text-xs font-bold uppercase`}>
                      P: {risk.probability}
                    </span>
                    <span className={`${impactColors[risk.impact]} text-white px-3 py-1 rounded-full text-xs font-bold uppercase`}>
                      I: {risk.impact}
                    </span>
                  </div>
                </div>
                <div className="bg-green-50 border-l-4 border-green-500 rounded-lg p-4">
                  <p className="text-sm font-semibold text-green-900 mb-1">Mitigation:</p>
                  <p className="text-sm text-green-800">{risk.mitigation}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (visual === 'roadmap') {
    return (
      <div className="py-8">
        <div className="space-y-6">
          {slide.phases.map((phase, idx) => {
            const colors = [
              { bg: 'from-red-500 to-red-600', badge: 'bg-red-500' },
              { bg: 'from-orange-500 to-orange-600', badge: 'bg-orange-500' },
              { bg: 'from-blue-500 to-blue-600', badge: 'bg-blue-500' },
              { bg: 'from-green-500 to-green-600', badge: 'bg-green-500' }
            ];
            const color = colors[idx];
            return (
              <div key={idx} className="bg-white border-2 border-slate-200 rounded-xl p-6 shadow-md">
                <div className={`bg-gradient-to-r ${color.bg} text-white rounded-lg p-4 mb-4 flex items-center gap-3`}>
                  <div className="w-10 h-10 bg-white/30 rounded-full flex items-center justify-center font-bold text-xl">
                    {idx + 1}
                  </div>
                  <h4 className="text-xl font-bold">{phase.phase}</h4>
                </div>
                <div className="space-y-2">
                  {phase.items.map((item, i) => (
                    <div key={i} className="flex items-start gap-3 bg-slate-50 rounded-lg p-3">
                      <CheckCircle className={`w-5 h-5 ${color.badge.replace('bg-', 'text-')} flex-shrink-0 mt-0.5`} />
                      <span className="text-slate-700">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (visual === 'decision-intro') {
    return (
      <div className="py-12 text-center">
        <div className="bg-gradient-to-r from-red-500 to-orange-500 w-32 h-32 rounded-full flex items-center justify-center text-white mx-auto mb-8 shadow-2xl">
          <AlertTriangle className="w-16 h-16 animate-pulse" />
        </div>
        <h3 className="text-3xl font-bold text-slate-800 mb-4">34 Critical Decisions Required</h3>
        <p className="text-xl text-slate-600 mb-8">Strategic questions organized into 7 categories</p>
        <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-2xl p-8 max-w-3xl mx-auto">
          <p className="text-lg text-slate-700 leading-relaxed mb-6">
            These questions must be answered to move forward with clarity and alignment
          </p>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-xl p-4 shadow">
              <div className="text-3xl font-bold text-red-600 mb-1">7</div>
              <div className="text-sm text-slate-600">Categories</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow">
              <div className="text-3xl font-bold text-orange-600 mb-1">34</div>
              <div className="text-sm text-slate-600">Questions</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow">
              <div className="text-3xl font-bold text-blue-600 mb-1">10+</div>
              <div className="text-sm text-slate-600">Critical</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (visual === 'question-card') {
    return (
      <div className="py-6">
        {/* Context */}
        {slide.context && (
          <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-6 mb-6">
            <h4 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
              <Database className="w-5 h-5" />
              Context
            </h4>
            <p className="text-blue-800 leading-relaxed">{slide.context}</p>
          </div>
        )}
        
        {/* Main Question */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-8 mb-6 text-white shadow-xl">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-2xl">❓</span>
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-bold leading-tight">{slide.question}</h3>
            </div>
          </div>
        </div>

        {/* Options */}
        {slide.options && (
          <div className="space-y-3 mb-6">
            {slide.options.map((option, idx) => (
              <div key={idx} className="bg-white border-2 border-slate-200 hover:border-purple-400 rounded-xl p-5 transition-all cursor-pointer group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-slate-100 group-hover:bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 transition-all">
                    <span className="font-bold text-slate-700 group-hover:text-purple-700">{String.fromCharCode(65 + idx)}</span>
                  </div>
                  <p className="text-slate-700 group-hover:text-slate-900 font-medium flex-1">{option}</p>
                </div>
              </div>
            ))}
            {slide.multiSelect && (
              <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-3 text-center">
                <p className="text-sm text-yellow-800 font-medium">💡 Multiple selections may apply</p>
              </div>
            )}
          </div>
        )}

        {/* Sub Questions */}
        {slide.subQuestions && (
          <div className="bg-slate-50 rounded-xl p-6">
            <h4 className="font-bold text-slate-800 mb-4">Please specify:</h4>
            <div className="space-y-3">
              {slide.subQuestions.map((sq, idx) => (
                <div key={idx} className="bg-white rounded-lg p-4 border-2 border-slate-200">
                  <p className="text-slate-700">{sq}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Note */}
        {slide.note && (
          <div className="bg-amber-50 border-l-4 border-amber-500 rounded-lg p-4 mt-4">
            <p className="text-amber-800 text-sm font-medium">📝 {slide.note}</p>
          </div>
        )}
      </div>
    );
  }

  if (visual === 'decision-summary') {
    return (
      <div className="py-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 bg-gradient-to-r from-purple-100 to-indigo-100 px-8 py-4 rounded-2xl">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
              {slide.total}
            </div>
            <div className="text-left">
              <div className="text-2xl font-bold text-slate-800">Total Questions</div>
              <div className="text-slate-600">Organized into {slide.categories.length} categories</div>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          {slide.categories.map((cat, idx) => {
            const urgencyColors = {
              'Critical': { bg: 'bg-red-500', light: 'bg-red-50', border: 'border-red-300' },
              'High': { bg: 'bg-orange-500', light: 'bg-orange-50', border: 'border-orange-300' },
              'Medium': { bg: 'bg-yellow-500', light: 'bg-yellow-50', border: 'border-yellow-300' }
            };
            const colors = urgencyColors[cat.urgency];
            return (
              <div key={idx} className={`${colors.light} border-2 ${colors.border} rounded-xl p-6`}>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-slate-800 text-lg">{cat.name}</h4>
                  <span className={`${colors.bg} text-white px-3 py-1 rounded-full text-xs font-bold uppercase`}>
                    {cat.urgency}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`${colors.bg} w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xl`}>
                    {cat.count}
                  </div>
                  <p className="text-slate-600 text-sm">
                    {cat.count} {cat.count === 1 ? 'question' : 'questions'} in this category
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 bg-gradient-to-r from-green-500 to-green-600 rounded-2xl p-8 text-white text-center">
          <CheckCircle className="w-16 h-16 mx-auto mb-4" />
          <h3 className="text-2xl font-bold mb-2">Framework Complete</h3>
          <p className="text-lg text-green-50">All strategic questions identified and organized for systematic decision-making</p>
        </div>
      </div>
    );
  }

  if (visual === 'end') {
    return (
      <div className="py-12 text-center">
        <div className="bg-gradient-to-r from-green-500 to-blue-500 w-32 h-32 rounded-full flex items-center justify-center text-white mx-auto mb-8 shadow-2xl animate-pulse">
          <CheckCircle className="w-16 h-16" />
        </div>
        <h3 className="text-3xl font-bold text-slate-800 mb-4">Presentation Complete</h3>
        <p className="text-xl text-slate-600 mb-8">Ready to begin systematic decision-making</p>
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-8 max-w-3xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-500 rounded-full mx-auto mb-2 flex items-center justify-center text-white font-bold text-xl">
                45+
              </div>
              <p className="text-sm text-slate-600">Total Slides</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-500 rounded-full mx-auto mb-2 flex items-center justify-center text-white font-bold text-xl">
                34
              </div>
              <p className="text-sm text-slate-600">Decision Questions</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-orange-500 rounded-full mx-auto mb-2 flex items-center justify-center text-white font-bold text-xl">
                7
              </div>
              <p className="text-sm text-slate-600">Categories</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-500 rounded-full mx-auto mb-2 flex items-center justify-center text-white font-bold text-xl">
                5
              </div>
              <p className="text-sm text-slate-600">Risk Areas</p>
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <h4 className="font-bold text-slate-800 mb-4 text-xl">What We've Covered:</h4>
            <div className="grid md:grid-cols-2 gap-3 text-left">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span className="text-slate-700 text-sm">Complete IT history (20 years)</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span className="text-slate-700 text-sm">Crisis analysis (4 years)</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span className="text-slate-700 text-sm">Current state assessment</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span className="text-slate-700 text-sm">Proposed structures</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span className="text-slate-700 text-sm">Risk identification</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span className="text-slate-700 text-sm">Strategic questions</span>
              </div>
            </div>
          </div>
          <div className="mt-6 text-center">
            <p className="text-lg text-slate-700 leading-relaxed font-medium">
              All stakeholders now have complete context for systematic, informed decision-making
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default function MeetingPresentation() {
  const [currentSlide, setCurrentSlide] = useState('welcome');
  const [history, setHistory] = useState(['welcome']);

  const slide = slides[currentSlide];

  const goToSlide = (slideId) => {
    setCurrentSlide(slideId);
    setHistory([...history, slideId]);
  };

  const goBack = () => {
    if (history.length > 1) {
      const newHistory = [...history];
      newHistory.pop();
      const previousSlide = newHistory[newHistory.length - 1];
      setHistory(newHistory);
      setCurrentSlide(previousSlide);
    }
  };

  const goHome = () => {
    setCurrentSlide('welcome');
    setHistory(['welcome']);
  };

  const getTypeColor = () => {
    switch (slide.type) {
      case 'intro': return 'from-indigo-600 to-purple-600';
      case 'visual': return 'from-blue-600 to-blue-700';
      case 'timeline': return 'from-blue-500 to-blue-600';
      case 'diagram': return 'from-purple-500 to-purple-600';
      case 'transformation': return 'from-blue-600 to-purple-600';
      case 'flow': return 'from-blue-500 to-indigo-600';
      case 'scope': return 'from-green-500 to-green-600';
      case 'chaos': return 'from-orange-500 to-red-500';
      case 'problems': return 'from-red-600 to-red-700';
      case 'org': return 'from-purple-600 to-indigo-600';
      case 'crisis-timeline': return 'from-red-500 to-red-600';
      case 'impact': return 'from-orange-600 to-red-600';
      case 'contract': return 'from-blue-600 to-blue-700';
      case 'team': return 'from-blue-500 to-purple-500';
      case 'comparison': return 'from-green-500 to-blue-500';
      case 'shock': return 'from-red-600 to-orange-600';
      case 'decision': return 'from-orange-500 to-orange-600';
      case 'scope-change': return 'from-slate-500 to-green-500';
      case 'structure': return 'from-blue-600 to-purple-600';
      case 'three-sector': return 'from-purple-600 to-indigo-600';
      case 'summary': return 'from-green-600 to-green-700';
      case 'takeaways': return 'from-blue-600 to-indigo-600';
      case 'current-state': return 'from-purple-600 to-purple-700';
      case 'questions': return 'from-orange-600 to-red-600';
      case 'decisions': return 'from-red-600 to-red-700';
      case 'risks': return 'from-orange-500 to-red-500';
      case 'roadmap': return 'from-green-600 to-blue-600';
      case 'section-break': return 'from-red-600 to-orange-600';
      case 'question': return 'from-purple-600 to-indigo-600';
      case 'decision-summary': return 'from-green-600 to-blue-600';
      case 'end': return 'from-slate-700 to-slate-800';
      default: return 'from-slate-600 to-slate-700';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-6xl">
        {/* Header Navigation */}
        <div className="mb-6 flex items-center justify-between bg-white rounded-2xl p-4 shadow-lg">
          <div className="flex items-center gap-4">
            <button
              onClick={goHome}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-xl transition-all shadow-md"
            >
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline font-semibold">Home</span>
            </button>
            {history.length > 1 && (
              <button
                onClick={goBack}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline font-semibold">Back</span>
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-slate-600 text-sm font-medium">Progress:</span>
            <span className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-2 rounded-lg font-bold">
              {history.length}
            </span>
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className={`bg-gradient-to-r ${getTypeColor()} px-8 py-8 text-white relative overflow-hidden`}>
            <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -mr-48 -mt-48"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/5 rounded-full -ml-32 -mb-32"></div>
            <div className="relative">
              <h1 className="text-4xl font-bold leading-tight mb-2">
                {slide.title}
              </h1>
              {slide.subtitle && (
                <p className="text-xl opacity-90">
                  {slide.subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="px-8 py-10">
            <VisualComponent slide={slide} />

            {/* Navigation */}
            {slide.next && (
              <div className="mt-10 pt-6 border-t-2 border-slate-100">
                <button
                  onClick={() => goToSlide(slide.next)}
                  className="w-full sm:w-auto flex items-center justify-center gap-3 px-10 py-5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold rounded-2xl transition-all duration-200 shadow-xl hover:shadow-2xl group text-lg"
                >
                  <span>Continue</span>
                  <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            )}

            {/* End Screen */}
            {slide.type === 'end' && (
              <div className="mt-10 pt-6 border-t-2 border-slate-100 flex justify-center">
                <button
                  onClick={goHome}
                  className="px-10 py-5 bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900 text-white font-bold rounded-2xl transition-all duration-200 shadow-xl hover:shadow-2xl flex items-center gap-3 text-lg"
                >
                  <Home className="w-6 h-6" />
                  Back to Start
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Progress Dots */}
        <div className="mt-6 bg-white rounded-2xl p-4 shadow-lg">
          <div className="flex items-center gap-2 justify-center flex-wrap">
            {history.slice(-15).map((_, index) => (
              <div
                key={index}
                className={`h-3 rounded-full transition-all duration-300 ${
                  index === history.slice(-15).length - 1 
                    ? 'w-10 bg-gradient-to-r from-blue-500 to-purple-500' 
                    : 'w-3 bg-slate-300'
                }`}
              />
            ))}
            {history.length > 15 && (
              <div className="text-slate-500 text-xs ml-2 font-medium">
                +{history.length - 15} more
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
