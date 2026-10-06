export const DEFAULT_CAMPUS_BANNER = '/campus-banner.jpg';
export const DEFAULT_CAMPUS_BANNER_FALLBACK =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDU0WxpQlbpxQiarnBUYXOm-UdffEHgfxRgYqHcpYW81UL5rGmsBSXxfhK8URFbOue13YJBfR1xcybNvdgqxCugUlL7eXsIsoI1LErveZBZyvEmMH4tTZ6HZdrrNzGqBBtdwIM_rGSe9idFsJn4uZz8vYonAF5dSDL1gvVbZ7xNazKnW4Gju4oR13POPiAN5oPuq68udftDyi3-cSHXEx6Exzkh1oitFx8Od_g_DO9GpZbD8BgpyZZD2A';

export const COLORS = {
  primary: '#8B1D2C', // Deep Academic Maroon
  primaryHover: '#6E1521',
  primaryContainer: '#8B1D2C',
  surfaceHero: '#15151F', // Dark Navy/Black Hero Surface
  goldAccent: '#E7B94A',
  goldFixed: '#FFDF9B',
  successGreen: '#1E9E5A',
  infoBlue: '#3E6FD9',
  surfaceCard: '#FFFFFF',
  surfaceCanvas: '#F8F9FD',
  surfaceContainerLow: '#F2F3F7',
  surfaceContainer: '#EDEEF2',
  surfaceContainerHigh: '#E7E8EC',
  tintMaroon: '#FBEAEA',
  tintBlue: '#EAF0FC',
  tintGreen: '#EAF8EF',
  tintAmber: '#FEF9C3',
  textPrimary: '#181A1F',
  textSecondary: '#6B7280',
  borderSubtle: '#E7E8EE',
  brandRed600: '#A31D35',
  brandRed700: '#8A1228',
  brandRed800: '#6E0E20',
  brandRed50: '#FDECEF',
  brandRed100: '#FAD6DC',
  brandBlue500: '#3B82F6',
  glossGradient: 'linear-gradient(135deg, #A31D35 0%, #8A1228 100%)',
  glossShadow: '0 8px 20px -6px rgba(138, 18, 40, .55), inset 0 1px 0 rgba(255, 255, 255, .35)',
};

export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

export const MODULES = [
  { id: 'students', label: 'Student Management', icon: 'school', shortDesc: 'Scholar Roster & Credentials' },
  { id: 'companies', label: 'Company Management', icon: 'business', shortDesc: 'Corporate Relations & Directory' },
  { id: 'drives', label: 'Drive Management', icon: 'campaign', shortDesc: 'Campus Recruitment Schedules' },
  { id: 'statistics', label: 'Placement Statistics', icon: 'bar_chart', shortDesc: 'Institutional Analytics & Trends' },
  { id: 'trainings', label: 'Training Management', icon: 'menu_book', shortDesc: 'Skill Programs & Certifications' },
  { id: 'internships', label: 'Internship Monitoring', icon: 'assignment', shortDesc: 'Workplace Internships & Mentors' },
  { id: 'reports', label: 'Report Generation', icon: 'description', shortDesc: 'Audit & Compliance Reports' },
];
