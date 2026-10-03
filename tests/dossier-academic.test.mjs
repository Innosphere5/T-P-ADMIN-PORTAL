import {
  initDb,
  getStudentDossier,
  upsertAcademicSummary,
  upsertSemesterRecord,
  upsertGrades,
  upsertStudentProfile,
  createStudentProject,
  updateStudentProject,
  deleteStudentProject,
  createStudentGitProject,
  createStudentCertificate,
  createStudentInternship,
  getAdminAuditLog,
} from '../src/lib/db.js';

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
  console.log('🧪 Starting Dossier & Manual Academics Unit Tests (CONTEXT.md Spec)...\n');

  await initDb();
  const testStudentId = 'admin-001-uuid'; // existing student in memory
  const adminActorId = 'a0000000-0000-0000-0000-000000000001';

  // Test 1: Unset academic values return null (not fake 0 or fake calculated value)
  console.log('Test 1: Unset Academic Indicators');
  const initialDossier = await getStudentDossier(testStudentId);
  assert(initialDossier !== null, 'Dossier retrieved successfully');
  assert(initialDossier.academic_summary !== undefined, 'Academic summary object exists');
  // Initial in memory should be null if not explicitly entered
  console.log(`  Current CGPA: ${initialDossier.cgpa}`);

  // Test 2: Validation on manual academic entry
  console.log('\nTest 2: Validation & Boundary Checks');
  let invalidCgpaError = false;
  try {
    await upsertAcademicSummary(testStudentId, { cgpa: 11.5 }, adminActorId);
  } catch (e) {
    invalidCgpaError = true;
  }
  assert(invalidCgpaError === true, 'CGPA > 10.0 is strictly rejected');

  let invalidAttError = false;
  try {
    await upsertAcademicSummary(testStudentId, { overall_attendance: -5 }, adminActorId);
  } catch (e) {
    invalidAttError = true;
  }
  assert(invalidAttError === true, 'Attendance < 0% is strictly rejected');

  // Test 3: Manual CGPA and Attendance Entry + Audit Log
  console.log('\nTest 3: Manual Academic Entry & Audit Recording');
  const academicSaved = await upsertAcademicSummary(
    testStudentId,
    { cgpa: 8.75, overall_attendance: 92.5, backlogs: 0 },
    adminActorId
  );
  assert(academicSaved.cgpa === 8.75, 'CGPA saved as 8.75');
  assert(academicSaved.overall_attendance === 92.5, 'Attendance saved as 92.5%');
  assert(academicSaved.backlogs === 0, 'Backlogs saved as 0');

  const auditAfterSummary = await getAdminAuditLog(testStudentId);
  assert(auditAfterSummary.length > 0, 'Audit log recorded entry for academic change');
  const latestAudit = auditAfterSummary[0];
  assert(latestAudit.table_name === 'student_academic_summary', 'Audit recorded table name correctly');
  assert(latestAudit.new_data.cgpa === 8.75, 'Audit recorded new CGPA in new_data');

  // Test 4: Hard Rule - Grades Entry DOES NOT Auto-calculate or Alter CGPA
  console.log('\nTest 4: Strict Manual-Only Guarantee (Changing grades does NOT alter CGPA)');
  await upsertSemesterRecord(
    testStudentId,
    1,
    { sgpa: 8.2, attendance_pct: 95.0, remarks: 'Good progress' },
    adminActorId
  );

  await upsertGrades(
    testStudentId,
    1,
    [
      { subject_code: 'BCA101', subject_name: 'Programming in C', credits: 4, grade: 'F', grade_points: 0.0 },
      { subject_code: 'BCA102', subject_name: 'Mathematics', credits: 4, grade: 'C', grade_points: 5.0 },
    ],
    adminActorId
  );

  const dossierAfterGrades = await getStudentDossier(testStudentId);
  assert(dossierAfterGrades.cgpa === 8.75, 'CGPA remains strictly 8.75 despite low grades (NO auto-recalculation)');
  assert(dossierAfterGrades.grades.length === 2, 'Semester grades saved');
  assert(dossierAfterGrades.grades[0].grade === 'F', 'Course grade F recorded as entered');

  // Test 5: Section CRUD - Projects, Git Projects, Certificates, Internships
  console.log('\nTest 5: Section CRUD for Dossier');
  const project = await createStudentProject(
    testStudentId,
    { title: 'AI Placement Portal', tech_stack: ['Next.js', 'PostgreSQL'], live_url: 'https://example.com' },
    adminActorId
  );
  assert(project.id !== undefined, 'Project created');
  assert(project.title === 'AI Placement Portal', 'Project title matches');

  const updatedPrj = await updateStudentProject(project.id, { is_visible: false }, adminActorId);
  assert(updatedPrj.is_visible === false, 'Project visibility toggled to false');

  const gitPrj = await createStudentGitProject(
    testStudentId,
    { repo_name: 'rimt-portal', repo_url: 'https://github.com/rimt/portal', primary_language: 'JavaScript' },
    adminActorId
  );
  assert(gitPrj.repo_name === 'rimt-portal', 'Git project created');

  const cert = await createStudentCertificate(
    testStudentId,
    { title: 'AWS Cloud Practitioner', issuer: 'Amazon Web Services' },
    adminActorId
  );
  assert(cert.issuer === 'Amazon Web Services', 'Certificate created');

  const internship = await createStudentInternship(
    testStudentId,
    { company_name: 'Tata Consultancy Services', role_title: 'Software Intern', mode: 'hybrid', status: 'ongoing' },
    adminActorId
  );
  assert(internship.company_name === 'Tata Consultancy Services', 'Internship created');

  // Test 6: Profile & Bio Update
  console.log('\nTest 6: Student Profile & Bio Update');
  const updatedProfile = await upsertStudentProfile(
    testStudentId,
    { bio: 'Aspiring Full Stack Engineer', skills: ['React', 'Node.js', 'PostgreSQL'], linkedin_url: 'https://linkedin.com/in/test' },
    adminActorId
  );
  assert(updatedProfile.bio === 'Aspiring Full Stack Engineer', 'Bio updated');
  assert(updatedProfile.skills.includes('React'), 'Skills updated');

  const finalDossier = await getStudentDossier(testStudentId);
  assert(finalDossier.bio === 'Aspiring Full Stack Engineer', 'Dossier reflects updated bio');
  assert(finalDossier.projects.length >= 1, 'Dossier contains projects');
  assert(finalDossier.git_projects.length >= 1, 'Dossier contains git projects');
  assert(finalDossier.certificates.length >= 1, 'Dossier contains certificates');
  assert(finalDossier.internships.length >= 1, 'Dossier contains internships');

  console.log(`\n========================================`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log(`========================================\n`);

  if (failed > 0) process.exit(1);
}

runTests().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
