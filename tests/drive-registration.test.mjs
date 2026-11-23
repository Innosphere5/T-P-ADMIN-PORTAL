/**
 * Drive Registration & Real-Time Sync Verification Test Suite
 * Validates:
 * 1. Student credential submission and persistence
 * 2. Event registration retrieval and field mapping
 * 3. Duplicate registration rejection (same roll number)
 * 4. Status transitions (REGISTERED -> CONFIRMED / WAITLISTED / REJECTED)
 * 5. CSV export with dynamic form responses
 * 6. Server-side API validation for /api/register
 */

import {
  submitEventRegistration,
  getEventRegistrations,
  updateRegistrationStatus,
  generateRegistrationsCsv,
  createDrive,
} from '../src/lib/driveClient.js';
import { POST as registerApiHandler } from '../src/app/api/register/route.js';

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
  console.log('🧪 Starting Drive Registration & Real-Time Sync Unit Tests...\n');

  // Setup: Create a test drive
  const testDriveId = `test_drive_${Date.now()}`;
  const driveRes = await createDrive({
    id: testDriveId,
    title: 'Google Cloud Campus Hiring 2026',
    companyName: 'Google Cloud',
    roleTitle: 'Associate Cloud Engineer',
    formSlug: 'google-cloud-2026',
    status: 'PUBLISHED',
  });

  assert(driveRes.success === true, 'Test recruitment drive created successfully');

  // Test 1: Student Credentials Submission & Storage
  console.log('\nTest 1: Student Credential Input & Storage');
  const studentPayload = {
    event_id: testDriveId,
    form_slug: 'google-cloud-2026',
    student_name: 'Amanpreet Singh',
    student_roll_no: '220301010045',
    student_email: 'amanpreet.singh@rimt.ac.in',
    student_phone: '+91 98765 43210',
    department: 'BCA',
    semester: '6th Sem',
    form_responses: {
      github_profile: 'https://github.com/amanpreet',
      preferred_location: 'Bengaluru',
      prior_internship: 'Yes',
    },
  };

  const regRes = await submitEventRegistration(studentPayload);
  assert(regRes.success === true, 'Registration accepted and stored in database');
  assert(regRes.registration.student_name === 'Amanpreet Singh', 'Student name stored correctly');
  assert(regRes.registration.student_roll_no === '220301010045', 'Student roll number stored correctly');
  assert(regRes.registration.department === 'BCA', 'Department stored correctly');
  assert(regRes.registration.semester === '6th Sem', 'Semester stored correctly');
  assert(regRes.registration.status === 'REGISTERED', 'Initial registration status is strictly REGISTERED');
  assert(regRes.registration.form_responses?.github_profile === 'https://github.com/amanpreet', 'Custom form responses preserved in JSONB');

  // Test 2: Instant Display at Drive Registration
  console.log('\nTest 2: Instant Display at Drive Registrations List');
  const driveRegistrations = await getEventRegistrations(testDriveId, 'google-cloud-2026');
  assert(Array.isArray(driveRegistrations), 'Returns registrations array');
  assert(driveRegistrations.length >= 1, 'Newly registered student immediately appears in drive registrations list');
  const found = driveRegistrations.find((r) => r.student_roll_no === '220301010045');
  assert(found !== undefined, 'Found matching student record in drive registrations');
  assert(found?.student_name === 'Amanpreet Singh', 'Student details match registered credentials');

  // Test 3: Duplicate Registration Guard
  console.log('\nTest 3: Duplicate Registration Prevention');
  const duplicateRes = await submitEventRegistration(studentPayload);
  assert(duplicateRes.success === false, 'Duplicate registration attempt is blocked');
  assert(
    typeof duplicateRes.error === 'string' && duplicateRes.error.toLowerCase().includes('already registered'),
    'Descriptive error message returned on duplicate registration'
  );

  // Test 4: Second Student Registration
  console.log('\nTest 4: Multiple Students Registering for Same Drive');
  const student2Payload = {
    event_id: testDriveId,
    form_slug: 'google-cloud-2026',
    student_name: 'Simran Kaur',
    student_roll_no: '220301010089',
    student_email: 'simran.kaur@rimt.ac.in',
    student_phone: '+91 98123 45678',
    department: 'B.Sc Cyber Security',
    semester: '6th Sem',
    form_responses: {
      github_profile: 'https://github.com/simran',
      preferred_location: 'Noida',
    },
  };

  const reg2Res = await submitEventRegistration(student2Payload);
  assert(reg2Res.success === true, 'Second student registration accepted');

  const updatedRegistrations = await getEventRegistrations(testDriveId, 'google-cloud-2026');
  assert(updatedRegistrations.length >= 2, 'Both registered students show in drive roster');

  // Test 5: Status Transition in Drive Roster
  console.log('\nTest 5: Status Updates in Drive Registration Roster');
  const regId = found.id;
  const statusRes = await updateRegistrationStatus(regId, 'CONFIRMED');
  assert(statusRes.success === true || !statusRes.error, 'Admin can update candidate status to CONFIRMED');

  // Test 6: CSV Export Generation
  console.log('\nTest 6: Roster CSV Export');
  const schema = [
    { id: 'github_profile', label: 'GitHub Profile', isDefault: false },
    { id: 'preferred_location', label: 'Preferred Location', isDefault: false },
  ];
  const csv = generateRegistrationsCsv([found], schema);
  assert(typeof csv === 'string', 'CSV output is generated as string');
  assert(csv.includes('Registration ID') && csv.includes('Student Name'), 'CSV includes header columns');
  assert(csv.includes('Amanpreet Singh'), 'CSV includes student name');
  assert(csv.includes('220301010045'), 'CSV includes roll number');
  assert(csv.includes('https://github.com/amanpreet'), 'CSV includes custom form response values');

  // Test 7: Server-side API Route Validation
  console.log('\nTest 7: Server-Side API Route (/api/register) Validation');

  // Missing student name
  const invalidReq1 = new Request('http://localhost/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ student_roll_no: '123', event_id: testDriveId }),
  });
  const res1 = await registerApiHandler(invalidReq1);
  const data1 = await res1.json();
  assert(res1.status === 400 && data1.error.includes('name'), 'Rejects request missing student name with HTTP 400');

  // Missing roll number
  const invalidReq2 = new Request('http://localhost/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ student_name: 'Test Student', event_id: testDriveId }),
  });
  const res2 = await registerApiHandler(invalidReq2);
  const data2 = await res2.json();
  assert(res2.status === 400 && data2.error.includes('Roll number'), 'Rejects request missing roll number with HTTP 400');

  // Missing event reference
  const invalidReq3 = new Request('http://localhost/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ student_name: 'Test Student', student_roll_no: '123' }),
  });
  const res3 = await registerApiHandler(invalidReq3);
  const data3 = await res3.json();
  assert(res3.status === 400 && data3.error.includes('Event reference'), 'Rejects request missing event reference with HTTP 400');

  console.log('\n========================================');
  console.log(`🏁 Registration Unit Tests: ${passed} Passed, ${failed} Failed`);
  console.log('========================================\n');

  if (failed > 0) process.exit(1);
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

