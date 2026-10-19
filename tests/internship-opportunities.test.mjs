/**
 * Internship Opportunities & Live Monitoring Unit Tests
 * Spec: INTERNSHIP.md (Module 06 Overhaul)
 * Covers:
 *  - Clean store returns [] (no seeded fake data)
 *  - Compensation model mutual exclusivity (stipend, non_stipend, paid)
 *  - Duration bounds (1..24, rejecting 0 and 25)
 *  - Season enum and skill normalization / deduplication
 *  - Multi-filter combination queries
 *  - Role gating (COMPANY role and non-admin receive 403)
 *  - Full CRUD operations and administrative audit logging
 */

import {
  initDb,
  initAdminDb,
  initCompanyDb,
  getInternshipOpportunities,
  getInternshipOpportunityById,
  createInternshipOpportunity,
  updateInternshipOpportunity,
  deleteInternshipOpportunity,
  getAllStudentInternships,
  getAdminAuditLog,
  getCompanyByEmail,
  getAdminByEmail,
} from '../src/lib/db.js';
import {
  validateInternshipOpportunity,
  VALID_SEASONS,
  VALID_COMPENSATION_TYPES,
} from '../src/lib/internshipValidation.js';
import { generateToken } from '../src/lib/auth.js';
import { withAuth } from '../src/lib/middleware.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log('🧪 Starting Internship Opportunities & Live Monitoring Unit Tests...\n');

  // Initialize DB environments in memory
  await initDb();
  await initAdminDb();
  await initCompanyDb();

  const adminActor = {
    id: 'a0000000-0000-0000-0000-000000000001',
    full_name: 'Raj Kumar (HOD BCA)',
    role: 'ADMIN',
  };

  // ─────────────────────────────────────────────────────────────
  // Test 1: Clean Store Returns Empty Array (R1 — Zero Mock Data)
  // ─────────────────────────────────────────────────────────────
  console.log('Test 1: Clean In-Memory Store Starts Strictly Empty');
  global.__RIMT_DB_INTERNSHIP_OPPORTUNITIES = [];
  const cleanOpportunities = await getInternshipOpportunities();
  assert(Array.isArray(cleanOpportunities), 'Opportunities return an array');
  assert(cleanOpportunities.length === 0, 'Clean store returns 0 opportunities (no seeded sample records)');

  const cleanStudentInternships = await getAllStudentInternships();
  assert(Array.isArray(cleanStudentInternships), 'Student internships return an array');
  // Student internships should contain no dummy records like Harpreet Kaur or Aman Sharma
  const dummyNames = ['Harpreet Kaur', 'Aman Sharma', 'Simranjeet Singh', 'Karanveer Dhillon'];
  const hasDummyStudent = cleanStudentInternships.some((s) =>
    dummyNames.includes(s.student_name || s.studentName)
  );
  assert(!hasDummyStudent, 'Zero hardcoded student dummy records in student internships feed');

  // ─────────────────────────────────────────────────────────────
  // Test 2: Compensation Mutual Exclusivity Validation (R3)
  // ─────────────────────────────────────────────────────────────
  console.log('\nTest 2: Compensation Model Mutual Exclusivity Validation');

  // Case 2a: Valid 'stipend'
  const validStipend = validateInternshipOpportunity({
    company_name: 'Google India',
    title: 'Cloud Engineering Intern',
    required_skills: ['GCP', 'Python'],
    duration_months: 6,
    season: 'summer',
    compensation_type: 'stipend',
    stipend_amount: 50000,
  });
  assert(validStipend.valid === true, 'Stipend type with stipend_amount > 0 is valid');
  assert(validStipend.sanitized.stipend_amount === 50000, 'Stipend amount preserved');
  assert(validStipend.sanitized.fee_amount === null, 'Fee amount strictly null for stipend type');

  // Case 2b: Invalid 'stipend' without amount
  const invalidStipendMissing = validateInternshipOpportunity({
    company_name: 'Google India',
    title: 'Cloud Engineering Intern',
    required_skills: ['GCP'],
    duration_months: 6,
    compensation_type: 'stipend',
  });
  assert(invalidStipendMissing.valid === false, 'Stipend type without stipend_amount is rejected');

  // Case 2c: Invalid 'stipend' with fee_amount present
  const invalidStipendBoth = validateInternshipOpportunity({
    company_name: 'Google India',
    title: 'Cloud Engineering Intern',
    required_skills: ['GCP'],
    duration_months: 6,
    compensation_type: 'stipend',
    stipend_amount: 30000,
    fee_amount: 5000,
  });
  assert(invalidStipendBoth.valid === false, 'Stipend type with fee_amount also populated is rejected');

  // Case 2d: Valid 'paid' (student pays company)
  const validPaid = validateInternshipOpportunity({
    company_name: 'TechTrain Academy',
    title: 'Full Stack Trainee',
    required_skills: ['React', 'Node.js'],
    duration_months: 3,
    season: 'winter',
    compensation_type: 'paid',
    fee_amount: 12000,
  });
  assert(validPaid.valid === true, 'Paid type with fee_amount > 0 is valid');
  assert(validPaid.sanitized.fee_amount === 12000, 'Fee amount preserved');
  assert(validPaid.sanitized.stipend_amount === null, 'Stipend amount strictly null for paid type');

  // Case 2e: Invalid 'paid' without fee_amount
  const invalidPaidMissing = validateInternshipOpportunity({
    company_name: 'TechTrain Academy',
    title: 'Full Stack Trainee',
    required_skills: ['React'],
    duration_months: 3,
    compensation_type: 'paid',
  });
  assert(invalidPaidMissing.valid === false, 'Paid type without fee_amount is rejected');

  // Case 2f: Valid 'non_stipend'
  const validNonStipend = validateInternshipOpportunity({
    company_name: 'Open Source Lab',
    title: 'Research Intern',
    required_skills: ['C++', 'Linux'],
    duration_months: 6,
    season: 'spring',
    compensation_type: 'non_stipend',
  });
  assert(validNonStipend.valid === true, 'Non-stipend type with no amounts is valid');
  assert(validNonStipend.sanitized.stipend_amount === null, 'Stipend amount null for non_stipend');
  assert(validNonStipend.sanitized.fee_amount === null, 'Fee amount null for non_stipend');

  // Case 2g: Invalid 'non_stipend' with stipend_amount
  const invalidNonStipendWithStipend = validateInternshipOpportunity({
    company_name: 'Open Source Lab',
    title: 'Research Intern',
    required_skills: ['Linux'],
    duration_months: 6,
    compensation_type: 'non_stipend',
    stipend_amount: 5000,
  });
  assert(invalidNonStipendWithStipend.valid === false, 'Non-stipend with stipend_amount is rejected');

  // ─────────────────────────────────────────────────────────────
  // Test 3: Duration Bounds & Season Validation (R2)
  // ─────────────────────────────────────────────────────────────
  console.log('\nTest 3: Duration Bounds & Season Validation');

  const durationZero = validateInternshipOpportunity({
    company_name: 'Acme',
    title: 'Intern',
    required_skills: ['Java'],
    duration_months: 0,
    compensation_type: 'non_stipend',
  });
  assert(durationZero.valid === false, 'Duration of 0 months is strictly rejected');

  const durationOver24 = validateInternshipOpportunity({
    company_name: 'Acme',
    title: 'Intern',
    required_skills: ['Java'],
    duration_months: 25,
    compensation_type: 'non_stipend',
  });
  assert(durationOver24.valid === false, 'Duration > 24 months is strictly rejected');

  for (const months of [3, 6, 9, 12]) {
    const preset = validateInternshipOpportunity({
      company_name: 'Acme',
      title: 'Intern',
      required_skills: ['Java'],
      duration_months: months,
      compensation_type: 'non_stipend',
    });
    assert(preset.valid === true, `Duration preset ${months} months is valid`);
  }

  // Season validation
  for (const season of ['winter', 'summer', 'spring', 'autumn', 'any']) {
    const validS = validateInternshipOpportunity({
      company_name: 'Acme',
      title: 'Intern',
      required_skills: ['Java'],
      duration_months: 6,
      season,
      compensation_type: 'non_stipend',
    });
    assert(validS.valid === true, `Season '${season}' is accepted`);
  }

  const invalidSeason = validateInternshipOpportunity({
    company_name: 'Acme',
    title: 'Intern',
    required_skills: ['Java'],
    duration_months: 6,
    season: 'monsoon',
    compensation_type: 'non_stipend',
  });
  assert(invalidSeason.valid === false, `Invalid season 'monsoon' is rejected`);

  // ─────────────────────────────────────────────────────────────
  // Test 4: Skills Normalization & De-duplication (R2)
  // ─────────────────────────────────────────────────────────────
  console.log('\nTest 4: Skills Normalization & De-duplication');

  const emptySkills = validateInternshipOpportunity({
    company_name: 'Acme',
    title: 'Intern',
    required_skills: [],
    duration_months: 6,
    compensation_type: 'non_stipend',
  });
  assert(emptySkills.valid === false, 'Empty skills list is rejected (at least 1 required)');

  const dupSkills = validateInternshipOpportunity({
    company_name: 'Acme',
    title: 'Intern',
    required_skills: [' React ', 'react', 'REACT', '  Node.js  ', 'node.js'],
    duration_months: 6,
    compensation_type: 'non_stipend',
  });
  assert(dupSkills.valid === true, 'Case-insensitive duplicate skills accepted');
  assert(dupSkills.sanitized.required_skills.length === 2, 'Duplicates deduplicated to exactly 2 skills');
  assert(dupSkills.sanitized.required_skills.includes('React'), 'Contains trimmed React');
  assert(dupSkills.sanitized.required_skills.includes('Node.js'), 'Contains trimmed Node.js');

  // ─────────────────────────────────────────────────────────────
  // Test 5: CRUD Operations & Audit Logging (R6)
  // ─────────────────────────────────────────────────────────────
  console.log('\nTest 5: CRUD Operations & Audit Logging');

  // 5a. Create
  const created = await createInternshipOpportunity({
    company_name: 'Microsoft IDC',
    title: 'Frontend Engineering Intern',
    description: 'Work with the Azure portal UX team.',
    required_skills: ['TypeScript', 'React', 'CSS'],
    eligible_departments: ['BCA', 'B.Sc IT'],
    duration_months: 6,
    season: 'summer',
    compensation_type: 'stipend',
    stipend_amount: 45000,
    work_mode: 'hybrid',
    location: 'Hyderabad, India',
    seats: 5,
    status: 'open',
    is_visible: true,
  }, adminActor);

  assert(created.id !== undefined, 'Opportunity ID generated');
  assert(created.company_name === 'Microsoft IDC', 'Company name stored');
  assert(created.duration_months === 6, 'Duration stored');

  const auditLogsAfterCreate = await getAdminAuditLog({ limit: 5 });
  const createLog = auditLogsAfterCreate.find(
    (log) => log.record_id === created.id && log.action === 'insert'
  );
  assert(createLog !== undefined, 'Audit log entry created for opportunity insertion');

  // 5b. Update Status & Visibility
  const updated = await updateInternshipOpportunity(
    created.id,
    { status: 'closed', is_visible: false },
    adminActor
  );
  assert(updated.status === 'closed', 'Status successfully updated to closed');
  assert(updated.is_visible === false, 'Visibility successfully toggled to false');

  const auditLogsAfterUpdate = await getAdminAuditLog({ limit: 5 });
  const updateLog = auditLogsAfterUpdate.find(
    (log) => log.record_id === created.id && log.action === 'update'
  );
  assert(updateLog !== undefined, 'Audit log entry recorded for opportunity update');

  // 5c. Get by ID
  const fetched = await getInternshipOpportunityById(created.id);
  assert(fetched !== null, 'Opportunity retrieved by ID');
  assert(fetched.status === 'closed', 'Retrieved record reflects updated status');

  // 5d. Delete
  const deleted = await deleteInternshipOpportunity(created.id, adminActor);
  assert(deleted === true, 'Opportunity successfully deleted');

  const postDeleteFetch = await getInternshipOpportunityById(created.id);
  assert(postDeleteFetch === null, 'Opportunity no longer exists after deletion');

  const auditLogsAfterDelete = await getAdminAuditLog({ limit: 5 });
  const deleteLog = auditLogsAfterDelete.find(
    (log) => log.record_id === created.id && log.action === 'delete'
  );
  assert(deleteLog !== undefined, 'Audit log entry recorded for opportunity deletion');

  // ─────────────────────────────────────────────────────────────
  // Test 6: Multi-Filter Combination Queries (R4)
  // ─────────────────────────────────────────────────────────────
  console.log('\nTest 6: Multi-Filter Combination Queries');

  // Seed 4 test records
  const itemA = await createInternshipOpportunity({
    company_name: 'Amazon Web Services',
    title: 'Cloud DevOps Intern',
    required_skills: ['AWS', 'Docker', 'Python'],
    duration_months: 6,
    season: 'winter',
    compensation_type: 'stipend',
    stipend_amount: 35000,
    status: 'open',
  }, adminActor);

  const itemB = await createInternshipOpportunity({
    company_name: 'Samsung R&D',
    title: 'Android Software Intern',
    required_skills: ['Kotlin', 'Android', 'Java'],
    duration_months: 3,
    season: 'summer',
    compensation_type: 'stipend',
    stipend_amount: 40000,
    status: 'open',
  }, adminActor);

  const itemC = await createInternshipOpportunity({
    company_name: 'RIMT OpenSource Initiative',
    title: 'Linux Kernel Contributor',
    required_skills: ['C', 'Linux', 'Python'],
    duration_months: 6,
    season: 'winter',
    compensation_type: 'non_stipend',
    status: 'open',
  }, adminActor);

  const itemD = await createInternshipOpportunity({
    company_name: 'SkillForge Academy',
    title: 'Data Science Trainee',
    required_skills: ['Python', 'SQL'],
    duration_months: 6,
    season: 'summer',
    compensation_type: 'paid',
    fee_amount: 8000,
    status: 'draft',
  }, adminActor);

  // Filter 1: By skill 'Python' (matches itemA, itemC, itemD)
  const pythonMatches = await getInternshipOpportunities({ skills: ['Python'] });
  assert(pythonMatches.length === 3, 'Filtering by skill Python returns 3 matching items');

  // Filter 2: By season 'winter' (matches itemA, itemC)
  const winterMatches = await getInternshipOpportunities({ season: 'winter' });
  assert(winterMatches.length === 2, 'Filtering by season winter returns 2 matching items');

  // Filter 3: By compensation 'stipend' (matches itemA, itemB)
  const stipendMatches = await getInternshipOpportunities({ compensation: 'stipend' });
  assert(stipendMatches.length === 2, 'Filtering by compensation stipend returns 2 items');

  // Filter 4: Combination (skill: Python + season: winter + compensation: stipend + duration: 6)
  const comboMatches = await getInternshipOpportunities({
    skills: ['Python'],
    season: 'winter',
    compensation: 'stipend',
    duration: '6',
  });
  assert(comboMatches.length === 1, 'Multi-filter combination uniquely matches 1 item (itemA)');
  assert(comboMatches[0].id === itemA.id, 'Combo match correctly identifies AWS opportunity');

  // Clean up seeded test records
  await deleteInternshipOpportunity(itemA.id, adminActor);
  await deleteInternshipOpportunity(itemB.id, adminActor);
  await deleteInternshipOpportunity(itemC.id, adminActor);
  await deleteInternshipOpportunity(itemD.id, adminActor);

  // ─────────────────────────────────────────────────────────────
  // Test 7: Role Gating & Access Control (R6 & R7)
  // ─────────────────────────────────────────────────────────────
  console.log('\nTest 7: Role Gating & Security Guard (Non-Admin & COMPANY Block)');

  // Set NODE_ENV to production during auth test so dev backdoor is not active
  const originalEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';

  const mockAdminHandler = withAuth(
    async (req) => {
      return new Response(JSON.stringify({ success: true, user: req.user }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    },
    { requiredRole: 'ADMIN' }
  );

  // 7a. Unauthenticated Request (Missing Token) -> 401
  const reqUnauth = new Request('http://localhost:3000/api/admin/internship-opportunities', {
    method: 'GET',
    headers: {},
  });
  const resUnauth = await mockAdminHandler(reqUnauth);
  assert(resUnauth.status === 401, 'Unauthenticated request receives HTTP 401');

  // 7b. Corporate Recruiter Token (COMPANY role) -> 403 Forbidden
  const companyUser = await getCompanyByEmail('recruiter@google.com');
  assert(companyUser !== null, 'Seeded corporate recruiter user exists');

  const companyToken = await generateToken({
    id: companyUser.id,
    companyId: companyUser.id,
    email: companyUser.email,
    role: 'COMPANY',
  });

  const reqCompany = new Request('http://localhost:3000/api/admin/internship-opportunities', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${companyToken}`,
    },
  });
  const resCompany = await mockAdminHandler(reqCompany);
  assert(resCompany.status === 403, 'COMPANY role user receives HTTP 403 on admin-only internship route');
  const companyBody = await resCompany.json();
  assert(companyBody.code === 'FORBIDDEN_ROLE', 'Error code is FORBIDDEN_ROLE');

  // 7c. Administrator Token (ADMIN role) -> 200 OK
  const adminUser = await getAdminByEmail('dean.tp.rimt@gmail.com');
  assert(adminUser !== null, 'Default admin exists');

  const adminToken = await generateToken({
    id: adminUser.id,
    adminId: adminUser.id,
    email: adminUser.email,
    role: 'ADMIN',
  });

  const reqAdmin = new Request('http://localhost:3000/api/admin/internship-opportunities', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${adminToken}`,
    },
  });
  const resAdmin = await mockAdminHandler(reqAdmin);
  assert(resAdmin.status === 200, 'Authenticated ADMIN user receives HTTP 200');

  process.env.NODE_ENV = originalEnv;

  // ─────────────────────────────────────────────────────────────
  // Summary
  // ─────────────────────────────────────────────────────────────
  console.log(`\n================================`);
  console.log(`Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log(`================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Unhandled test runner error:', err);
  process.exit(1);
});
