/**
 * Shared Form Schema Specification & Zod Validation Engine
 * Implements Section 6 of DRIVE_MANAGEMENT_AGENT.md
 */

import { z } from 'zod';

export const FIELD_TYPES = [
  'text',
  'textarea',
  'number',
  'email',
  'phone',
  'date',
  'select',
  'radio',
  'checkbox',
  'file',
];

export const MAX_FIELDS = 30;
export const MAX_PAYLOAD_BYTES = 100 * 1024; // 100 KB

export class SchemaIncompatibleError extends Error {
  constructor(violations = []) {
    super(`Schema incompatible with existing registrations:\n${violations.join('\n')}`);
    this.name = 'SchemaIncompatibleError';
    this.code = 'SCHEMA_INCOMPATIBLE';
    this.violations = violations;
  }
}

/**
 * Generates a valid unique field key from a label or random suffix
 * Format: ^[a-z][a-z0-9_]{1,29}$
 */
export function generateFieldKey(label = '', existingKeys = new Set()) {
  let base = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 20);

  if (!base || !/^[a-z]/.test(base)) {
    base = 'q_' + Math.random().toString(36).substring(2, 8);
  }

  let candidate = base.slice(0, 30);
  let counter = 1;
  while (existingKeys.has(candidate)) {
    const suffix = `_${counter}`;
    candidate = `${base.slice(0, 30 - suffix.length)}${suffix}`;
    counter++;
  }

  return candidate;
}

/**
 * Validates the structure of a Form Schema definition (Admin side)
 */
export function validateFormSchema(schema) {
  if (!Array.isArray(schema)) {
    throw new Error('Form schema must be an array of fields');
  }

  if (schema.length > MAX_FIELDS) {
    throw new Error(`Form schema exceeds maximum limit of ${MAX_FIELDS} fields (received ${schema.length})`);
  }

  const seenKeys = new Set();

  schema.forEach((field, index) => {
    if (!field || typeof field !== 'object') {
      throw new Error(`Field at index ${index} must be an object`);
    }

    // Key validation: ^[a-z][a-z0-9_]{1,29}$
    if (!field.key || typeof field.key !== 'string' || !/^[a-z][a-z0-9_]{1,29}$/.test(field.key)) {
      throw new Error(
        `Field "${field.label || index}" has invalid key "${field.key}". Must be 2-30 lowercase chars, starting with a letter and containing only letters, numbers, and underscores.`
      );
    }

    if (seenKeys.has(field.key)) {
      throw new Error(`Duplicate field key "${field.key}" detected in form schema`);
    }
    seenKeys.add(field.key);

    // Label validation: 1..120 chars
    if (!field.label || typeof field.label !== 'string' || field.label.trim().length === 0 || field.label.length > 120) {
      throw new Error(`Field "${field.key}" label must be between 1 and 120 characters`);
    }

    // Type validation
    if (!FIELD_TYPES.includes(field.type)) {
      throw new Error(`Field "${field.key}" has unsupported type "${field.type}"`);
    }

    // HelpText validation: <= 200 chars
    if (field.helpText && (typeof field.helpText !== 'string' || field.helpText.length > 200)) {
      throw new Error(`Field "${field.key}" helpText must be <= 200 characters`);
    }

    // Options validation for select, radio, checkbox
    if (['select', 'radio', 'checkbox'].includes(field.type)) {
      if (!Array.isArray(field.options) || field.options.length === 0 || field.options.length > 20) {
        throw new Error(`Field "${field.key}" (${field.type}) must have between 1 and 20 options`);
      }

      const optSet = new Set();
      field.options.forEach((opt) => {
        if (typeof opt !== 'string' || opt.trim().length === 0 || opt.length > 60) {
          throw new Error(`Option in field "${field.key}" must be between 1 and 60 characters`);
        }
        if (optSet.has(opt.trim())) {
          throw new Error(`Duplicate option "${opt}" in field "${field.key}"`);
        }
        optSet.add(opt.trim());
      });
    }
  });

  return true;
}

/**
 * Builds a strict Zod validator from the form schema to validate student answers
 */
export function buildAnswerSchema(fields = []) {
  validateFormSchema(fields);

  const shape = {};

  fields.forEach((field) => {
    let fieldValidator;

    switch (field.type) {
      case 'text': {
        const maxLen = field.validation?.maxLength || 300;
        let v = z.string().trim().max(maxLen, `Must be at most ${maxLen} characters`);
        if (field.validation?.pattern) {
          v = v.regex(new RegExp(field.validation.pattern), 'Invalid format');
        }
        fieldValidator = v;
        break;
      }

      case 'textarea': {
        const maxLen = field.validation?.maxLength || 2000;
        fieldValidator = z.string().trim().max(maxLen, `Must be at most ${maxLen} characters`);
        break;
      }

      case 'number': {
        let num = z.number({ invalid_type_error: 'Must be a valid number' });
        if (field.validation?.min !== undefined) {
          num = num.min(field.validation.min, `Must be at least ${field.validation.min}`);
        }
        if (field.validation?.max !== undefined) {
          num = num.max(field.validation.max, `Must be at most ${field.validation.max}`);
        }
        fieldValidator = z.preprocess((val) => {
          if (val === '' || val === null || val === undefined) return undefined;
          if (typeof val === 'string') {
            const parsed = Number(val.trim());
            return isNaN(parsed) ? val : parsed;
          }
          return val;
        }, num);
        break;
      }

      case 'email': {
        fieldValidator = z.string().trim().email('Invalid email address').max(120);
        break;
      }

      case 'phone': {
        fieldValidator = z.preprocess((val) => {
          if (typeof val === 'string') return val.replace(/[\s\+]/g, '');
          return val;
        }, z.string().regex(/^\d{7,15}$/, 'Phone number must contain between 7 and 15 digits'));
        break;
      }

      case 'date': {
        fieldValidator = z
          .string()
          .trim()
          .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format');
        break;
      }

      case 'select':
      case 'radio': {
        const opts = field.options || [];
        if (opts.length === 0) {
          fieldValidator = z.string();
        } else {
          fieldValidator = z.enum(opts, {
            errorMap: () => ({ message: `Must be one of: ${opts.join(', ')}` }),
          });
        }
        break;
      }

      case 'checkbox': {
        const opts = field.options || [];
        const itemEnum = z.enum(opts, {
          errorMap: () => ({ message: `Selections must be from: ${opts.join(', ')}` }),
        });
        let v = z.array(itemEnum).min(field.required ? 1 : 0, 'Please select at least one option');
        fieldValidator = v;
        break;
      }

      case 'file': {
        // Phase 2 stub: validates URL or metadata object
        fieldValidator = z.union([
          z.string().url('Must be a valid file URL'),
          z.object({
            url: z.string().url(),
            name: z.string().optional(),
            size: z.number().optional(),
          }),
        ]);
        break;
      }

      default:
        fieldValidator = z.string();
    }

    if (!field.required) {
      if (field.type === 'checkbox') {
        fieldValidator = fieldValidator.optional().default([]);
      } else {
        fieldValidator = z.preprocess((val) => {
          if (val === '' || val === null || val === undefined) return undefined;
          return val;
        }, fieldValidator.optional());
      }
    }

    shape[field.key] = fieldValidator;
  });

  // Strict object schema rejects unknown keys
  const objectSchema = z.object(shape).strict();

  return z.preprocess((raw) => {
    if (raw && typeof raw === 'object') {
      const serialized = JSON.stringify(raw);
      if (Buffer.byteLength(serialized, 'utf8') > MAX_PAYLOAD_BYTES) {
        throw new Error('Payload size exceeds 100 KB limit');
      }
    }
    return raw;
  }, objectSchema);
}

/**
 * Asserts compatibility when editing a published form schema
 * If registrations exist, strict backwards compatibility is enforced.
 */
export function assertSchemaCompatible(prevPublished = [], nextSchema = [], hasRegistrations = false) {
  if (!hasRegistrations || !prevPublished || prevPublished.length === 0) {
    validateFormSchema(nextSchema);
    return true;
  }

  validateFormSchema(nextSchema);

  const prevMap = new Map(prevPublished.map((f) => [f.key, f]));
  const nextMap = new Map(nextSchema.map((f) => [f.key, f]));
  const violations = [];

  // 1. Must NOT remove existing keys
  for (const [key, prevField] of prevMap.entries()) {
    if (!nextMap.has(key)) {
      violations.push(`Cannot remove field "${prevField.label}" (${key}) because registrations already exist.`);
    }
  }

  // 2. Check changes to existing fields
  for (const [key, nextField] of nextMap.entries()) {
    if (prevMap.has(key)) {
      const prevField = prevMap.get(key);

      // Must NOT change type
      if (prevField.type !== nextField.type) {
        violations.push(
          `Field "${nextField.label}" (${key}) cannot change type from "${prevField.type}" to "${nextField.type}".`
        );
      }

      // Must NOT remove existing options from select/radio/checkbox
      if (['select', 'radio', 'checkbox'].includes(prevField.type)) {
        const prevOpts = prevField.options || [];
        const nextOpts = new Set(nextField.options || []);
        const removed = prevOpts.filter((opt) => !nextOpts.has(opt));
        if (removed.length > 0) {
          violations.push(
            `Field "${nextField.label}" (${key}) cannot remove options: ${removed.join(', ')}.`
          );
        }
      }
    } else {
      // 3. Any NEW field MUST be optional (required: false)
      if (nextField.required) {
        violations.push(
          `New field "${nextField.label}" (${key}) cannot be required because existing registrations did not answer it.`
        );
      }
    }
  }

  if (violations.length > 0) {
    throw new SchemaIncompatibleError(violations);
  }

  return true;
}
