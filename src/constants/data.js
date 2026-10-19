export const STUDENTS_DATA = [];

export const COMPANIES_DATA = [
  {
    id: 'google',
    name: 'Google India Pvt Ltd',
    shortName: 'Google',
    industry: 'Software & Cloud Infrastructure',
    tier: 'Tier 1 MNC',
    category: 'tier1 mou',
    mou: 'Active MoU 2023-26',
    ctc: '38–42 LPA',
    ctcMin: 38,
    ctcMax: 42,
    verified: true,
    logoBg: 'bg-tint-blue/70 text-info-blue',
    icon: 'travel_explore',
    hiredTotal: 18,
    status: 'Active Partner',
    spoc: {
      name: 'Ananya Roy',
      role: 'Campus Recruitment Lead – India',
      phone: '+91 98144 20192',
      email: 'campus.in@google.com',
      location: 'Bangalore / Gurugram Tech Hub'
    }
  },
  {
    id: 'microsoft',
    name: 'Microsoft Corporation',
    shortName: 'Microsoft',
    industry: 'Enterprise Cloud & AI Solutions',
    tier: 'Tier 1 MNC',
    category: 'tier1 mou',
    mou: 'Active MoU 2022-25',
    ctc: '40–44 LPA',
    ctcMin: 40,
    ctcMax: 44,
    verified: true,
    logoBg: 'bg-tint-blue/70 text-info-blue',
    icon: 'window',
    hiredTotal: 14,
    status: 'Active Partner',
    spoc: {
      name: 'Kavita Menon',
      role: 'University Hiring Director',
      phone: '+91 98233 44551',
      email: 'kavita.m@microsoft.com',
      location: 'Hyderabad IDC Hub'
    }
  },
  {
    id: 'tcs',
    name: 'Tata Consultancy Services',
    shortName: 'TCS',
    industry: 'IT Services & Consulting',
    tier: 'Mass Recruiter / Tier 1',
    category: 'core consulting mou',
    mou: 'Long-term MoU 2020-27',
    ctc: '7.5–11.5 LPA',
    ctcMin: 7.5,
    ctcMax: 11.5,
    verified: true,
    logoBg: 'bg-tint-maroon text-primary',
    icon: 'corporate_fare',
    hiredTotal: 340,
    status: 'Active Partner',
    spoc: {
      name: 'Anand Verma',
      role: 'Lead Campus HR – Northern Region',
      phone: '+91 98765 11223',
      email: 'anand.verma@tcs.com',
      location: 'Chandigarh / Mohali Circle'
    }
  },
  {
    id: 'lt',
    name: 'Larsen & Toubro Ltd',
    shortName: 'L&T',
    industry: 'Core Infrastructure & Engineering',
    tier: 'Core Engineering',
    category: 'core',
    mou: 'Active MoU 2024-27',
    ctc: '8.5–12.0 LPA',
    ctcMin: 8.5,
    ctcMax: 12.0,
    verified: true,
    logoBg: 'bg-tint-green text-success-green',
    icon: 'precision_manufacturing',
    hiredTotal: 58,
    status: 'Active Partner',
    spoc: {
      name: 'Vikram Chawla',
      role: 'Talent Acquisition Partner',
      phone: '+91 98888 77665',
      email: 'v.chawla@larsentoubro.com',
      location: 'Mumbai Corporate Office'
    }
  },
  {
    id: 'hdfc',
    name: 'HDFC Bank Ltd',
    shortName: 'HDFC Bank',
    industry: 'BFSI & Fintech Digital',
    tier: 'BFSI Sector',
    category: 'bfsi',
    mou: 'Active MoU 2023-26',
    ctc: '9.0–14.5 LPA',
    ctcMin: 9.0,
    ctcMax: 14.5,
    verified: true,
    logoBg: 'bg-amber-100 text-amber-800',
    icon: 'account_balance',
    hiredTotal: 42,
    status: 'Active Partner',
    spoc: {
      name: 'Ritu Bhargava',
      role: 'Head of Fintech Recruitment',
      phone: '+91 98111 22339',
      email: 'ritu.b@hdfcbank.com',
      location: 'New Delhi Regional Office'
    }
  },
  {
    id: 'deloitte',
    name: 'Deloitte USI',
    shortName: 'Deloitte',
    industry: 'Consulting & Risk Advisory',
    tier: 'Big 4 Consulting',
    category: 'consulting',
    mou: 'Active MoU 2023-26',
    ctc: '10.5–15.0 LPA',
    ctcMin: 10.5,
    ctcMax: 15.0,
    verified: true,
    logoBg: 'bg-tint-blue text-info-blue',
    icon: 'insights',
    hiredTotal: 65,
    status: 'Active Partner',
    spoc: {
      name: 'Sahil Malhotra',
      role: 'Campus Engagement Manager',
      phone: '+91 98222 99881',
      email: 'smalhotra@deloitte.com',
      location: 'Gurugram Cyber City'
    }
  }
];

export const DRIVES_DATA = [
  {
    id: 'drive-1',
    company: 'Tata Consultancy Services',
    title: 'TCS Digital & Ninja Hiring 2025',
    date: 'Oct 14, 2025 • 09:00 AM IST',
    location: 'Auditorium 1 & Lab 4 (West Campus)',
    packageText: '₹7.5 – ₹11.5 LPA',
    registeredCount: 320,
    status: 'Upcoming',
    currentRound: 'Round 1: Cognitive & Technical Assessment',
    roundStage: 'Upcoming',
    category: 'upcoming',
    flagship: true,
    liaison: 'Anand Verma (Lead Campus HR)',
    eligibility: 'B.Tech CSE/IT/ECE • CGPA ≥ 6.5 • No Active Backlogs',
    rounds: [
      { name: 'Online Cognitive Assessment', date: 'Oct 14', status: 'Upcoming' },
      { name: 'Advanced Coding Round', date: 'Oct 16', status: 'Scheduled' },
      { name: 'Technical & HR Interview', date: 'Oct 18', status: 'Pending' }
    ]
  },
  {
    id: 'drive-2',
    company: 'Google India',
    title: 'Google STEP & Software Engineer 2025',
    date: 'Oct 22, 2025 • 10:00 AM IST',
    location: 'Virtual / Google Meet & CodePair',
    packageText: '₹38.0 – ₹42.0 LPA',
    registeredCount: 145,
    status: 'Ongoing',
    currentRound: 'Round 2: Data Structures & Algorithms',
    roundStage: 'Ongoing',
    category: 'ongoing',
    flagship: true,
    liaison: 'Ananya Roy (Campus Lead)',
    eligibility: 'B.Tech All Branches • CGPA ≥ 8.0 • DSA Proficiency',
    rounds: [
      { name: 'Online Coding Challenge', date: 'Oct 05', status: 'Completed' },
      { name: 'Technical DSA Round 1', date: 'Oct 12', status: 'Completed' },
      { name: 'Technical DSA Round 2', date: 'Oct 22', status: 'Ongoing' },
      { name: 'Googleyness & Leadership', date: 'Oct 26', status: 'Upcoming' }
    ]
  },
  {
    id: 'drive-3',
    company: 'Larsen & Toubro Ltd',
    title: 'L&T Graduate Engineer Trainee (GET)',
    date: 'Sep 28, 2025 • 09:30 AM IST',
    location: 'Mechanical Block Seminar Hall',
    packageText: '₹8.5 – ₹12.0 LPA',
    registeredCount: 210,
    status: 'Completed',
    currentRound: 'Final Selection Completed (42 Offers Released)',
    roundStage: 'Completed',
    category: 'completed',
    flagship: false,
    liaison: 'Vikram Chawla (Talent Acquisition)',
    eligibility: 'B.Tech Mech / Civil / Electrical • CGPA ≥ 7.0',
    rounds: [
      { name: 'Written Aptitude & Technical', date: 'Sep 24', status: 'Completed' },
      { name: 'Group Discussion', date: 'Sep 26', status: 'Completed' },
      { name: 'Panel Interview', date: 'Sep 28', status: 'Completed' }
    ]
  },
  {
    id: 'drive-4',
    company: 'Infosys Limited',
    title: 'Infosys Specialist Programmer & DSE',
    date: 'Nov 02, 2025 • 09:00 AM IST',
    location: 'Central Computing Center',
    packageText: '₹6.5 – ₹9.5 LPA',
    registeredCount: 290,
    status: 'Upcoming',
    currentRound: 'Registration & Eligibility Verification',
    roundStage: 'Upcoming',
    category: 'upcoming',
    flagship: false,
    liaison: 'Neha Kapoor (Campus Lead)',
    eligibility: 'All Engineering Streams & MCA • CGPA ≥ 6.8',
    rounds: [
      { name: 'HackWithInfy Screening', date: 'Nov 02', status: 'Upcoming' },
      { name: 'Technical Evaluation', date: 'Nov 05', status: 'Pending' }
    ]
  }
];

export const PLACEMENT_STATS = {
  cohort: 'Academic Year 2024–25',
  totalStudents: 2480,
  eligibleStudents: 1950,
  placedStudents: 1607,
  placementRate: '82.4%',
  rateGrowth: '+4.8% YoY',
  avgPackage: '₹8.65 LPA',
  highestPackage: '₹44.0 LPA',
  medianPackage: '₹7.20 LPA',
  totalOffers: 1845,
  participatingCompanies: 182,
  tier1Offers: 218,
  ctcBrackets: [
    { label: '₹20+ LPA (Super Dream)', count: 98, percentage: 6.1, color: 'bg-primary' },
    { label: '₹12 - ₹20 LPA (Dream)', count: 342, percentage: 21.3, color: 'bg-info-blue' },
    { label: '₹6 - ₹12 LPA (Core Premium)', count: 825, percentage: 51.3, color: 'bg-success-green' },
    { label: '₹4 - ₹6 LPA (Standard)', count: 342, percentage: 21.3, color: 'bg-amber-500' }
  ],
  departmentProgress: [
    { name: 'Computer Science & Engineering', placed: 546, total: 580, rate: '94.2%', barColor: 'bg-primary' },
    { name: 'Information Technology', placed: 218, total: 240, rate: '90.8%', barColor: 'bg-info-blue' },
    { name: 'Electronics & Communication', placed: 310, total: 360, rate: '86.1%', barColor: 'bg-success-green' },
    { name: 'Mechanical Engineering', placed: 284, total: 370, rate: '76.8%', barColor: 'bg-amber-500' },
    { name: 'Civil Engineering', placed: 142, total: 210, rate: '67.6%', barColor: 'bg-rose-400' },
    { name: 'Biotechnology & Healthcare', placed: 107, total: 140, rate: '76.4%', barColor: 'bg-purple-500' }
  ],
  sectors: [
    { name: 'IT / Software & Cloud', percentage: 46, color: '#8B1D2C' },
    { name: 'Core Engineering', percentage: 22, color: '#3E6FD9' },
    { name: 'BFSI & Fintech', percentage: 14, color: '#1E9E5A' },
    { name: 'Consulting & Analytics', percentage: 11, color: '#E7B94A' },
    { name: 'Others / EdTech', percentage: 7, color: '#9333EA' }
  ]
};

export const TRAININGS_DATA = [
  {
    id: 'tr-1',
    title: 'Full Stack Java & Cloud Native Microservices',
    trainer: 'Dr. Arvinder Singh (Ex-Infosys Architect)',
    dept: 'CSE & IT • 7th Semester',
    duration: '60 Hours (6 Weeks)',
    sessionsDone: 8,
    totalSessions: 10,
    attendanceRate: '93.4%',
    enrolledCount: 165,
    status: 'Ongoing',
    statusType: 'ongoing',
    category: 'ongoing',
    nextClass: 'Tomorrow, 10:30 AM (Lab 3)',
    materials: ['Spring Boot 3.2 Cheatsheet', 'Docker Kubernetes Lab Guide', 'Mock Assessment 2']
  },
  {
    id: 'tr-2',
    title: 'Advanced DSA & Competitive Problem Solving',
    trainer: 'Prof. Kunal Mehta (Codeforces Master)',
    dept: 'All Engineering Streams',
    duration: '45 Hours (4 Weeks)',
    sessionsDone: 12,
    totalSessions: 12,
    attendanceRate: '96.2%',
    enrolledCount: 220,
    status: 'Completed',
    statusType: 'completed',
    category: 'completed',
    nextClass: 'Certificates Dispatched',
    materials: ['Dynamic Programming Mastery Book', 'Graph Algorithms Handbook']
  },
  {
    id: 'tr-3',
    title: 'Corporate Soft Skills & Leadership Dynamics',
    trainer: 'Pooja Taneja (Senior HR Consultant)',
    dept: 'Final Year Cohort',
    duration: '30 Hours (3 Weeks)',
    sessionsDone: 2,
    totalSessions: 8,
    attendanceRate: '91.0%',
    enrolledCount: 310,
    status: 'Ongoing',
    statusType: 'ongoing',
    category: 'ongoing',
    nextClass: 'Thursday, 02:00 PM (Auditorium 2)',
    materials: ['Group Discussion Playbook', 'Body Language in Technical Interviews']
  },
  {
    id: 'tr-4',
    title: 'Automotive Design & EV Powertrain Simulation',
    trainer: 'Er. Rajesh Kulkarni (Tata Motors R&D)',
    dept: 'Mechanical & EEE',
    duration: '40 Hours (4 Weeks)',
    sessionsDone: 0,
    totalSessions: 8,
    attendanceRate: 'Upcoming',
    enrolledCount: 95,
    status: 'Upcoming',
    statusType: 'upcoming',
    category: 'upcoming',
    nextClass: 'Starts Nov 04, 2025',
    materials: ['MATLAB Simulink EV Models', 'Battery Thermal Management Guide']
  }
];

export const INTERNSHIPS_DATA = [];

export const REPORTS_DATA = [
  {
    id: 'rep-1',
    name: 'Annual NAAC Placement & Salary Audit Report',
    type: 'Placement & NAAC',
    cycle: 'Academic Year 2024–25',
    generatedDate: '24 Sep 2025 • 04:30 PM',
    format: 'PDF',
    size: '4.8 MB',
    status: 'Ready',
    category: 'placement',
    scheduled: false,
    description: 'Comprehensive institutional summary covering student rosters, CTC brackets, sector distributions, and accredited corporate MoUs.'
  },
  {
    id: 'rep-2',
    name: 'Department-Wise Placement Conversion Index',
    type: 'Department Performance',
    cycle: 'Quarter 3 (Jul–Sep 2025)',
    generatedDate: '22 Sep 2025 • 11:15 AM',
    format: 'Excel',
    size: '1.9 MB',
    status: 'Ready',
    category: 'placement',
    scheduled: true,
    description: 'Spreadsheet breakdown of eligible scholars versus final offers across CSE, IT, ECE, Mechanical, and Civil Engineering.'
  },
  {
    id: 'rep-3',
    name: 'Corporate Recruitment & MoU Partner Engagement',
    type: 'Corporate Relations',
    cycle: 'Academic Year 2024–25',
    generatedDate: '18 Sep 2025 • 02:00 PM',
    format: 'PDF',
    size: '3.2 MB',
    status: 'Ready',
    category: 'custom',
    scheduled: false,
    description: 'Tier-1 company visiting history, hiring volumes per drive, and SPOC contact updates.'
  },
  {
    id: 'rep-4',
    name: '6-Month Mandatory Internship & Mentorship Log',
    type: 'Internships',
    cycle: 'Batch 2021–25',
    generatedDate: '15 Sep 2025 • 05:45 PM',
    format: 'Excel',
    size: '2.4 MB',
    status: 'Ready',
    category: 'internship',
    scheduled: true,
    description: 'Bi-weekly attendance log, mentor feedback scores, and stipend verification details.'
  },
  {
    id: 'rep-5',
    name: 'Skill Certification & Training Attendance Matrix',
    type: 'Training',
    cycle: 'Pre-Placement Sprint 2025',
    generatedDate: '10 Sep 2025 • 09:20 AM',
    format: 'PDF',
    size: '2.1 MB',
    status: 'Ready',
    category: 'training',
    scheduled: false,
    description: 'Assessment grades and certificate credentials in Java Microservices, DSA, and Soft Skills.'
  }
];
