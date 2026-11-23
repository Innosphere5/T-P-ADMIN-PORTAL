import {
  buildAnswerSchema,
  assertSchemaCompatible,
  generateFieldKey,
  validateFormSchema,
  SchemaIncompatibleError,
  MAX_FIELDS,
} from '../src/lib/drives/schema.js';

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
  console.log('🧪 Starting Drive Form Schema Unit Tests...\n');

  // Test 1: Field Key Generation
  console.log('Test 1: Field Key Generation');
  const key1 = generateFieldKey('Student Full Name');
  assert(key1 === 'student_full_name', `Generated key from label is valid: ${key1}`);
  const key2 = generateFieldKey('123 Invalid Start');
  assert(/^[a-z]/.test(key2), `Invalid start generates random prefix: ${key2}`);
  const existing = new Set(['skills']);
  const key3 = generateFieldKey('Skills', existing);
  assert(key3 === 'skills_1', `Colliding key generates unique suffix: ${key3}`);

  // Test 2: Form Schema Validation Rules
  console.log('\nTest 2: Form Schema Validation Rules');
  const validFields = [
    { key: 'q_cgpa', label: 'Current CGPA', type: 'number', required: true, validation: { min: 0, max: 10 } },
    { key: 'q_skills', label: 'Technical Skills', type: 'checkbox', required: false, options: ['React', 'Python', 'Node'] },
    { key: 'q_sop', label: 'Statement of Purpose', type: 'textarea', required: false },
  ];
  assert(validateFormSchema(validFields) === true, 'Valid form schema passes');

  let dupKeyFailed = false;
  try {
    validateFormSchema([
      { key: 'q_same', label: 'Field 1', type: 'text', required: true },
      { key: 'q_same', label: 'Field 2', type: 'text', required: false },
    ]);
  } catch (e) {
    dupKeyFailed = true;
  }
  assert(dupKeyFailed, 'Duplicate field key is rejected');

  let maxFieldsFailed = false;
  try {
    const tooMany = Array.from({ length: MAX_FIELDS + 1 }, (_, i) => ({
      key: `field_${i}`,
      label: `Field ${i}`,
      type: 'text',
      required: false,
    }));
    validateFormSchema(tooMany);
  } catch (e) {
    maxFieldsFailed = true;
  }
  assert(maxFieldsFailed, `Exceeding max fields (${MAX_FIELDS}) is rejected`);

  // Test 3: Zod Answer Validator - Valid and Invalid Answers
  console.log('\nTest 3: Zod Answer Validator - Valid and Invalid Answers');
  const schema = buildAnswerSchema(validFields);

  const validAnswer = {
    q_cgpa: '8.75', // string coercion to number
    q_skills: ['React', 'Node'],
    q_sop: 'I am passionate about building full-stack platforms.',
  };
  const parsed = schema.parse(validAnswer);
  assert(parsed.q_cgpa === 8.75, 'Number string coerced to finite float');
  assert(Array.isArray(parsed.q_skills) && parsed.q_skills.length === 2, 'Checkbox options verified');

  let invalidNumberFailed = false;
  try {
    schema.parse({ q_cgpa: 14.5 }); // Exceeds max 10
  } catch (e) {
    invalidNumberFailed = true;
  }
  assert(invalidNumberFailed, 'Number exceeding max validation is rejected');

  let unknownKeyFailed = false;
  try {
    schema.parse({ ...validAnswer, hacker_field: 'exploit' });
  } catch (e) {
    unknownKeyFailed = true;
  }
  assert(unknownKeyFailed, 'Unknown answer keys rejected by strict()');

  // Test 4: Option Membership
  console.log('\nTest 4: Option Membership Enforcement');
  let badOptionFailed = false;
  try {
    schema.parse({
      q_cgpa: 9.0,
      q_skills: ['Fortran'], // Not in ['React', 'Python', 'Node']
    });
  } catch (e) {
    badOptionFailed = true;
  }
  assert(badOptionFailed, 'Checkbox option not in allowed options is rejected');

  // Test 5: Optional Field Normalization
  console.log('\nTest 5: Optional Field Normalization');
  const optionalParsed = schema.parse({
    q_cgpa: 7.2,
    q_sop: '', // Empty string should be allowed and normalized
  });
  assert(optionalParsed.q_cgpa === 7.2, 'Optional empty string accepted for non-required');

  // Test 6: Schema Compatibility Engine
  console.log('\nTest 6: Schema Compatibility Engine (Section 6)');
  const initialSchema = [
    { key: 'q_code', label: 'LeetCode Profile', type: 'text', required: true },
    { key: 'q_track', label: 'Track Preference', type: 'select', required: true, options: ['Frontend', 'Backend'] },
  ];

  // Case A: No registrations exist -> Any modification allowed
  const freeEdit = [
    { key: 'q_other', label: 'Other Info', type: 'text', required: true },
  ];
  assert(assertSchemaCompatible(initialSchema, freeEdit, false) === true, 'Any edit allowed when hasRegistrations = false');

  // Case B: Registrations exist -> Removing key rejected
  let removeKeyRejected = false;
  try {
    assertSchemaCompatible(initialSchema, [initialSchema[0]], true); // Removed q_track
  } catch (e) {
    removeKeyRejected = e instanceof SchemaIncompatibleError;
  }
  assert(removeKeyRejected, 'Removing existing key when registrations exist is rejected');

  // Case C: Registrations exist -> Changing type rejected
  let changeTypeRejected = false;
  try {
    const alteredType = [
      { key: 'q_code', label: 'LeetCode Profile', type: 'number', required: true }, // was text
      initialSchema[1],
    ];
    assertSchemaCompatible(initialSchema, alteredType, true);
  } catch (e) {
    changeTypeRejected = e instanceof SchemaIncompatibleError;
  }
  assert(changeTypeRejected, 'Changing field type when registrations exist is rejected');

  // Case D: Registrations exist -> Adding REQUIRED field rejected
  let addRequiredRejected = false;
  try {
    const addRequired = [
      ...initialSchema,
      { key: 'q_phone', label: 'Alternate Phone', type: 'phone', required: true }, // New required!
    ];
    assertSchemaCompatible(initialSchema, addRequired, true);
  } catch (e) {
    addRequiredRejected = e instanceof SchemaIncompatibleError;
  }
  assert(addRequiredRejected, 'Adding required field when registrations exist is rejected');

  // Case E: Registrations exist -> Adding OPTIONAL field succeeds!
  const addOptional = [
    ...initialSchema,
    { key: 'q_github', label: 'GitHub URL', type: 'text', required: false },
  ];
  assert(assertSchemaCompatible(initialSchema, addOptional, true) === true, 'Adding optional field when registrations exist succeeds');

  // Case F: Registrations exist -> Adding options to select succeeds!
  const expandOptions = [
    initialSchema[0],
    { key: 'q_track', label: 'Track Preference', type: 'select', required: true, options: ['Frontend', 'Backend', 'Fullstack'] },
  ];
  assert(assertSchemaCompatible(initialSchema, expandOptions, true) === true, 'Adding options to select when registrations exist succeeds');

  console.log(`\n===========================================`);
  console.log(`Results: ${passed} Passed, ${failed} Failed`);
  console.log(`===========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
