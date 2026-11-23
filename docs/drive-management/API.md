# API.md — Drive Management API Reference & Handoff Contract

**Version:** 1.0.0  
**Target:** Web Admin Portal (`ADMIN-PANEL-RIMT`) & Mobile Client (`APP-RIMT-BCA`)  
**Base URL:** `https://<DOMAIN>` (Local: `http://localhost:3000`)  
**Auth:** Supabase Auth JWT  
- Admin: Cookie or `Authorization: Bearer <admin_jwt>`
- Mobile Student: `Authorization: Bearer <student_jwt>`

---

## 1. Authentication & Security Rules

1. **Server-Side Identity:** Client requests MUST NOT specify `student_id` or `is_admin` in request bodies. The server extracts the authenticated identity directly from the verified Supabase Auth session.
2. **Payload Limits:** Maximum allowed JSON payload size for registration submissions is 100 KB.
3. **No Direct Student Database Writes:** Mobile applications never insert directly into `public.drive_registrations`. All submissions go through `POST /api/drives/[slug]/register` or the `register_for_drive(slug, answers)` RPC.

---

## 2. Standard Response Envelope

### Success Response
```json
{
  "data": { ... }
}
```

### Failure Response
```json
{
  "error": {
    "code": "ERROR_CODE_STRING",
    "message": "Human-readable description of error",
    "details": { ... }
  }
}
```

---

## 3. Error Codes Reference

| Error Code | HTTP Status | Description / Cause |
|---|---|---|
| `UNAUTHENTICATED` | 401 | Missing, malformed, or expired Supabase Auth token |
| `FORBIDDEN` | 403 | Missing required administrative or student privileges |
| `NOT_FOUND` | 404 | Drive ID or slug not found, or student attempting to view a draft |
| `VALIDATION_ERROR` | 400 | Form answers failed schema validation (see `details` for field-level errors) |
| `SCHEMA_INCOMPATIBLE` | 409 | Republished schema violates compatibility (e.g. removed key or added required field when registrations exist) |
| `ALREADY_REGISTERED` | 409 | Student has already submitted a registration for this drive |
| `REGISTRATION_CLOSED` | 403 | Drive registration has been closed, deadline has passed, or drive is info-only |
| `NOT_ELIGIBLE` | 403 | Student branch or year does not match the drive's eligibility filter |
| `DRIVE_FULL` | 409 | Drive registration capacity has been reached (`max_registrations`) |
| `HAS_REGISTRATIONS` | 409 | Drive cannot be deleted because registrations already exist |
| `RATE_LIMITED` | 429 | Too many registration requests in a given time window |

---

## 4. Student API Endpoints

### 4.1 List Visible Drives
- **Endpoint:** `GET /api/drives`
- **Auth:** Student JWT
- **Description:** Returns drives visible to the student according to department and year eligibility.

#### Response
```json
{
  "data": [
    {
      "id": "18f97a3a-23d1-419b-a010-863a8a9a2a91",
      "slug": "c9f1a8e234",
      "title": "Larsen & Toubro Ltd — Campus Recruitment Drive",
      "type": "company",
      "description": "Exclusive recruitment drive for BCA and B.Sc Computer Science scholars.",
      "deadline": "2026-10-27T18:30:00.000Z",
      "status": "published",
      "registrationEnabled": true,
      "myRegistration": true,
      "seatsLeft": 18
    }
  ]
}
```

---

### 4.2 Get Drive Detail by Slug
- **Endpoint:** `GET /api/drives/[slug]`
- **Auth:** Student JWT
- **Description:** Fetches drive metadata, published dynamic form schema, registration status, and computed state.

#### Response
```json
{
  "data": {
    "id": "18f97a3a-23d1-419b-a010-863a8a9a2a91",
    "slug": "c9f1a8e234",
    "title": "Larsen & Toubro Ltd — Campus Recruitment Drive",
    "type": "company",
    "description": "Exclusive recruitment drive for BCA and B.Sc Computer Science scholars.",
    "status": "published",
    "registrationEnabled": true,
    "deadline": "2026-10-27T18:30:00.000Z",
    "maxRegistrations": 50,
    "eligibleBranches": ["BCA", "B.Sc Cyber Security"],
    "eligibleYears": [3],
    "publishedAt": "2026-10-24T06:00:00.000Z",
    "form": [
      {
        "key": "cgpa_score",
        "label": "Overall Degree CGPA",
        "type": "number",
        "required": true,
        "helpText": "Enter CGPA between 0 and 10",
        "validation": { "min": 0, "max": 10 }
      },
      {
        "key": "primary_skills",
        "label": "Core Technical Skills",
        "type": "checkbox",
        "required": true,
        "options": ["React Native", "Node.js", "Python", "SQL", "Cloud"]
      },
      {
        "key": "statement_of_purpose",
        "label": "Why do you want to join this program?",
        "type": "textarea",
        "required": false,
        "validation": { "maxLength": 1000 }
      }
    ],
    "alreadyRegistered": false,
    "state": "open"
  }
}
```

#### Possible `state` Values
- `open`: Student is eligible and registration is currently open.
- `registered`: Student has already registered.
- `closed`: Drive status is explicitly closed by administration.
- `deadline_passed`: Registration deadline has passed.
- `full`: Drive has reached `max_registrations`.
- `not_eligible`: Student's department or batch does not meet drive criteria.
- `info_only`: `registration_enabled` is false (e.g. notices or informative announcements).

---

### 4.3 Submit Drive Registration
- **Endpoint:** `POST /api/drives/[slug]/register`
- **Auth:** Student JWT
- **Body:**
```json
{
  "answers": {
    "cgpa_score": 8.45,
    "primary_skills": ["React Native", "SQL"],
    "statement_of_purpose": "Eager to contribute to enterprise distributed systems."
  }
}
```

#### Success Response (200 OK)
```json
{
  "data": {
    "registrationId": "73e97022-8b32-4e4b-9e8c-8f19f2a00c22",
    "status": "registered",
    "registeredAt": "2026-10-24T07:15:20.120Z"
  }
}
```

#### Validation Error (400 Bad Request)
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Form submission failed validation",
    "details": {
      "fieldErrors": {
        "cgpa_score": ["Number must be less than or equal to 10"]
      }
    }
  }
}
```

---

### 4.4 In-App Notifications
- **List Notifications:** `GET /api/notifications?limit=20&cursor=<timestamp>`
- **Unread Count:** `GET /api/notifications/unread-count`
- **Mark As Read:** `POST /api/notifications/read`
  - Body: `{ "ids": ["uuid-1", "uuid-2"] }` or `{ "all": true }`

---

## 5. Admin API Endpoints Summary

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/admin/drives` | Filterable list with pagination & counts |
| `POST` | `/api/admin/drives` | Create new drive draft |
| `GET` | `/api/admin/drives/[id]` | Drive details + draft & published form schema |
| `PATCH` | `/api/admin/drives/[id]` | Update metadata (title, branches, deadline, etc.) |
| `PUT` | `/api/admin/drives/[id]/form` | Save draft form schema (validated against limits) |
| `POST` | `/api/admin/drives/[id]/publish` | Compatibility verification & atomic publication |
| `POST` | `/api/admin/drives/[id]/close` | Mark drive as closed |
| `DELETE` | `/api/admin/drives/[id]` | Delete drive (forbidden if registrations exist) |
| `GET` | `/api/admin/drives/[id]/registrations` | Paginated roster of applicants and answers |
| `GET` | `/api/admin/drives/[id]/registrations/export` | Formula-injection sanitized UTF-8 BOM CSV export |

---

## 6. Deep Linking Specification

- **Universal Links (iOS):** `https://<APP_DOMAIN>/drives/<slug>`
- **App Scheme (Android / iOS):** `rimt-app://drives/<slug>`
- **Web Fallback:** If opened in a web browser without the app installed, `https://<APP_DOMAIN>/drives/<slug>` renders a clean, privacy-safe landing screen prompting the student to open the RIMT Student App.
