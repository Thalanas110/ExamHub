import json
import uuid
from pathlib import Path

collection_id = str(uuid.uuid4())
env_id = str(uuid.uuid4())

pre_request_script = """
const HEADER_NAME = 'X-Payload-Encryption';
const HEADER_VALUE = 'v1';

function decodeBase64(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function encodeBase64(bytes) {
  let binary = '';
  for (const b of bytes) {
    binary += String.fromCharCode(b);
  }
  return btoa(binary);
}

function decodeHex(value) {
  const out = new Uint8Array(value.length / 2);
  for (let i = 0; i < value.length; i += 2) {
    out[i / 2] = Number.parseInt(value.slice(i, i + 2), 16);
  }
  return out;
}

function resolveKeyBytes(rawKey) {
  const candidate = String(rawKey || '').trim();
  if (!candidate) {
    throw new Error('Missing transport_key variable. Set it in your environment.');
  }

  let resolved = null;

  if (candidate.startsWith('base64:')) {
    resolved = decodeBase64(candidate.slice(7));
  } else if (/^[0-9a-fA-F]{64}$/.test(candidate)) {
    resolved = decodeHex(candidate);
  } else if (/^[A-Za-z0-9+/]+=*$/.test(candidate)) {
    try {
      const decoded = decodeBase64(candidate);
      if (decoded.byteLength === 32) {
        resolved = decoded;
      }
    } catch (err) {
      // continue to raw-text mode
    }
  }

  if (!resolved) {
    resolved = new TextEncoder().encode(candidate);
  }

  if (resolved.byteLength !== 32) {
    throw new Error('transport_key must resolve to exactly 32 bytes.');
  }

  return resolved;
}

function packOpaquePayload(iv, tag, cipherText) {
  const packed = new Uint8Array(iv.byteLength + tag.byteLength + cipherText.byteLength);
  packed.set(iv, 0);
  packed.set(tag, iv.byteLength);
  packed.set(cipherText, iv.byteLength + tag.byteLength);
  return encodeBase64(packed);
}

async function encryptPayload(bodyObject, keyBytes) {
  const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plain = new TextEncoder().encode(JSON.stringify(bodyObject));

  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, tagLength: 128 },
    key,
    plain,
  );

  const encrypted = new Uint8Array(encryptedBuffer);
  const tagLength = 16;
  if (encrypted.byteLength <= tagLength) {
    throw new Error('Invalid AES-GCM output length.');
  }

  const cipherText = encrypted.slice(0, encrypted.byteLength - tagLength);
  const tag = encrypted.slice(encrypted.byteLength - tagLength);

  return { payload: packOpaquePayload(iv, tag, cipherText) };
}

const transportKey =
  pm.environment.get('transport_key') ||
  pm.collectionVariables.get('transport_key') ||
  pm.variables.get('transport_key');

const keyBytes = resolveKeyBytes(transportKey);

// Always enforce encrypted-transport headers.
pm.request.headers.upsert({ key: 'Content-Type', value: 'application/json' });
pm.request.headers.upsert({ key: HEADER_NAME, value: HEADER_VALUE });

// Auto-attach bearer token for authenticated endpoints.
const token = String(pm.environment.get('auth_token') || '').trim();
if (token) {
  pm.request.headers.upsert({ key: 'Authorization', value: `Bearer ${token}` });
} else {
  pm.request.headers.remove('Authorization');
}

// Encrypt only raw JSON bodies.
if (!pm.request.body || pm.request.body.mode !== 'raw') {
  // no body to encrypt
} else {
  const raw = String(pm.request.body.raw || '').trim();
  if (!raw) {
    // empty body
  } else {
    const parsed = JSON.parse(raw);

    // Prevent accidental double encryption.
    const isEnvelope =
      parsed &&
      typeof parsed === 'object' &&
      !Array.isArray(parsed) &&
      typeof parsed.payload === 'string' &&
      Object.keys(parsed).length === 1;

    if (!isEnvelope) {
      const encryptedEnvelope = await encryptPayload(parsed, keyBytes);
      pm.request.body.update(JSON.stringify(encryptedEnvelope));
    }
  }
}
""".strip("\n")

post_response_script = """
const HEADER_NAME = 'X-Payload-Encryption';
const HEADER_VALUE = 'v1';

function decodeBase64(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function decodeHex(value) {
  const out = new Uint8Array(value.length / 2);
  for (let i = 0; i < value.length; i += 2) {
    out[i / 2] = Number.parseInt(value.slice(i, i + 2), 16);
  }
  return out;
}

function resolveKeyBytes(rawKey) {
  const candidate = String(rawKey || '').trim();
  if (!candidate) {
    throw new Error('Missing transport_key variable.');
  }

  let resolved = null;

  if (candidate.startsWith('base64:')) {
    resolved = decodeBase64(candidate.slice(7));
  } else if (/^[0-9a-fA-F]{64}$/.test(candidate)) {
    resolved = decodeHex(candidate);
  } else if (/^[A-Za-z0-9+/]+=*$/.test(candidate)) {
    try {
      const decoded = decodeBase64(candidate);
      if (decoded.byteLength === 32) {
        resolved = decoded;
      }
    } catch (err) {
      // continue to raw-text mode
    }
  }

  if (!resolved) {
    resolved = new TextEncoder().encode(candidate);
  }

  if (resolved.byteLength !== 32) {
    throw new Error('transport_key must resolve to exactly 32 bytes.');
  }

  return resolved;
}

function unpackOpaquePayload(value) {
  const packed = decodeBase64(value);
  if (packed.byteLength <= 28) {
    throw new Error('Invalid encrypted payload length.');
  }

  const iv = packed.slice(0, 12);
  const tag = packed.slice(12, 28);
  const cipherText = packed.slice(28);

  const encrypted = new Uint8Array(cipherText.byteLength + tag.byteLength);
  encrypted.set(cipherText, 0);
  encrypted.set(tag, cipherText.byteLength);

  return { iv, encrypted };
}

async function decryptEnvelope(envelope, keyBytes) {
  if (!envelope || typeof envelope !== 'object' || typeof envelope.payload !== 'string') {
    throw new Error('Response does not contain encrypted payload envelope.');
  }

  const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['decrypt']);
  const unpacked = unpackOpaquePayload(envelope.payload);

  const plainBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: unpacked.iv, tagLength: 128 },
    key,
    unpacked.encrypted,
  );

  const text = new TextDecoder().decode(new Uint8Array(plainBuffer));
  return JSON.parse(text);
}

const marker = pm.response.headers.get(HEADER_NAME);
if (String(marker || '').trim() === HEADER_VALUE) {
  const transportKey =
    pm.environment.get('transport_key') ||
    pm.collectionVariables.get('transport_key') ||
    pm.variables.get('transport_key');

  const keyBytes = resolveKeyBytes(transportKey);
  const envelope = pm.response.json();
  const decrypted = await decryptEnvelope(envelope, keyBytes);

  pm.environment.set('last_decrypted_json', JSON.stringify(decrypted, null, 2));

  if (decrypted && typeof decrypted === 'object') {
    if (typeof decrypted.token === 'string' && decrypted.token.trim() !== '') {
      pm.environment.set('auth_token', decrypted.token);
    }

    if (decrypted.user && typeof decrypted.user === 'object') {
      const userId = typeof decrypted.user.id === 'string' ? decrypted.user.id : '';
      const role = typeof decrypted.user.role === 'string' ? decrypted.user.role : '';

      if (userId) {
        pm.environment.set('current_user_id', userId);
      }
      if (role) {
        pm.environment.set('current_user_role', role);
      }

      if (userId && role === 'student') {
        pm.environment.set('student_id', userId);
      }
      if (userId && role === 'teacher') {
        pm.environment.set('teacher_id', userId);
      }
      if (userId && role === 'admin') {
        pm.environment.set('admin_id', userId);
      }
    }

    if (typeof decrypted.id === 'string') {
      if (pm.info.requestName.includes('Create Exam')) {
        pm.environment.set('exam_id', decrypted.id);
      }
      if (pm.info.requestName.includes('Submit Result')) {
        pm.environment.set('submission_id', decrypted.id);
      }
    }

    if (typeof decrypted.studentId === 'string') {
      pm.environment.set('student_id', decrypted.studentId);
    }

    if (typeof decrypted.examId === 'string') {
      pm.environment.set('exam_id', decrypted.examId);
    }
  }

  console.log('Decrypted response:', decrypted);
} else {
  // Not encrypted response; keep raw text for debugging.
  pm.environment.set('last_decrypted_json', pm.response.text());
}

pm.test('Status is not 500', function () {
  pm.expect(pm.response.code).to.not.equal(500);
});
""".strip("\n")


def req(name, method, url, body=None, description=None):
    request = {
        "method": method,
        "header": [],
        "url": url,
    }
    if body is not None:
        request["body"] = {
            "mode": "raw",
            "raw": json.dumps(body, indent=2),
            "options": {"raw": {"language": "json"}},
        }
    item = {
        "name": name,
        "request": request,
        "response": [],
    }
    if description:
        item["request"]["description"] = description
    return item

collection = {
    "info": {
        "_postman_id": collection_id,
        "name": "Group8 Required Endpoints (Encrypted Transport)",
        "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
        "description": "Import this collection + environment. Set transport_key, then run requests in order. Bodies are plain JSON; collection pre-request script encrypts automatically.",
    },
    "event": [
        {
            "listen": "prerequest",
            "script": {
                "type": "text/javascript",
                "exec": pre_request_script.splitlines(),
            },
        },
        {
            "listen": "test",
            "script": {
                "type": "text/javascript",
                "exec": post_response_script.splitlines(),
            },
        },
    ],
    "item": [
        {
            "name": "1) Auth",
            "item": [
                req(
                    "01 Register (Student sample)",
                    "POST",
                    "{{base_url}}/auth/register",
                    {
                        "name": "Student One",
                        "email": "{{student_email}}",
                        "password": "{{student_password}}",
                        "role": "student",
                        "department": "Science",
                    },
                    "Creates a student account. Token will auto-save to auth_token if success.",
                ),
                req(
                    "02 Login (Student)",
                    "POST",
                    "{{base_url}}/auth/login",
                    {
                        "email": "{{student_email}}",
                        "password": "{{student_password}}",
                    },
                    "Logs in student account and saves auth_token/current_user_id/current_user_role.",
                ),
                req(
                    "03 Login (Teacher)",
                    "POST",
                    "{{base_url}}/auth/login",
                    {
                        "email": "{{teacher_email}}",
                        "password": "{{teacher_password}}",
                    },
                    "Use this before teacher/admin routes if needed.",
                ),
                req(
                    "04 Login (Admin)",
                    "POST",
                    "{{base_url}}/auth/login",
                    {
                        "email": "{{admin_email}}",
                        "password": "{{admin_password}}",
                    },
                    "Use this before admin-only routes.",
                ),
            ],
        },
        {
            "name": "2) Profile & Users (Required)",
            "item": [
                req(
                    "05 Get Profile",
                    "GET",
                    "{{base_url}}/users/profile",
                    None,
                    "Requires auth_token.",
                ),
                req(
                    "06 Update Profile",
                    "PUT",
                    "{{base_url}}/users/profile",
                    {
                        "name": "Student One Updated",
                        "department": "Engineering",
                        "phone": "+1 555 1000",
                        "bio": "Testing API via Postman",
                    },
                    "Requires auth_token.",
                ),
            ],
        },
        {
            "name": "3) Exams (Required)",
            "item": [
                req(
                    "07 Create Exam",
                    "POST",
                    "{{base_url}}/exams",
                    {
                        "title": "Algebra Quiz 1",
                        "description": "Basic algebra quiz",
                        "classId": "{{class_id}}",
                        "teacherId": "{{teacher_id}}",
                        "duration": 60,
                        "totalMarks": 10,
                        "passingMarks": 6,
                        "startDate": "2026-05-25T08:00:00Z",
                        "endDate": "2026-05-25T09:30:00Z",
                        "status": "published",
                        "questions": [
                            {
                                "id": "q1",
                                "text": "2 + 2 = ?",
                                "type": "mcq",
                                "topic": "Arithmetic",
                                "options": ["3", "4", "5"],
                                "correctAnswer": "4",
                                "marks": 10,
                            }
                        ],
                    },
                    "Requires admin/teacher auth_token. On success, exam_id is auto-saved.",
                ),
                req(
                    "08 List Exams",
                    "GET",
                    "{{base_url}}/exams",
                    None,
                    "Requires auth_token.",
                ),
                req(
                    "09 Get Exam By ID",
                    "GET",
                    "{{base_url}}/exams/{{exam_id}}",
                    None,
                    "Requires auth_token and a valid exam_id.",
                ),
            ],
        },
        {
            "name": "4) Results (Required)",
            "item": [
                req(
                    "10 Submit Result",
                    "POST",
                    "{{base_url}}/results/submit",
                    {
                        "examId": "{{exam_id}}",
                        "answers": [
                            {
                                "questionId": "q1",
                                "answer": "4",
                            }
                        ],
                        "submittedAt": "2026-05-25T08:20:00Z",
                        "questionTelemetry": [
                            {
                                "questionId": "q1",
                                "timeSpentSeconds": 40,
                                "visitCount": 1,
                                "answerChangeCount": 0,
                            }
                        ],
                    },
                    "Requires student auth_token.",
                ),
                req(
                    "11 Get Results By Student ID",
                    "GET",
                    "{{base_url}}/results/student/{{student_id}}",
                    None,
                    "Requires auth_token and student_id.",
                ),
            ],
        },
        {
            "name": "5) Admin & Reporting (Required)",
            "item": [
                req(
                    "12 Admin Exams",
                    "GET",
                    "{{base_url}}/admin/exams",
                    None,
                    "Requires admin auth_token.",
                ),
                req(
                    "13 Admin Results",
                    "GET",
                    "{{base_url}}/admin/results",
                    None,
                    "Requires admin auth_token.",
                ),
                req(
                    "14 Report Exam Performance",
                    "GET",
                    "{{base_url}}/reports/exam-performance",
                    None,
                    "Requires admin/teacher auth_token.",
                ),
                req(
                    "15 Report Pass Fail",
                    "GET",
                    "{{base_url}}/reports/pass-fail",
                    None,
                    "Requires admin/teacher auth_token.",
                ),
            ],
        },
    ],
    "variable": [
        {"key": "transport_key", "value": ""}
    ],
}

environment = {
    "id": env_id,
    "name": "Group8 Local (Encrypted API)",
    "values": [
        {"key": "base_url", "value": "http://localhost/group8/api", "enabled": True},
        {"key": "transport_key", "value": "", "enabled": True},
        {"key": "auth_token", "value": "", "enabled": True},
        {"key": "last_decrypted_json", "value": "", "enabled": True},
        {"key": "current_user_id", "value": "", "enabled": True},
        {"key": "current_user_role", "value": "", "enabled": True},
        {"key": "student_email", "value": "student1@example.com", "enabled": True},
        {"key": "student_password", "value": "Pass1234!", "enabled": True},
        {"key": "teacher_email", "value": "", "enabled": True},
        {"key": "teacher_password", "value": "", "enabled": True},
        {"key": "admin_email", "value": "", "enabled": True},
        {"key": "admin_password", "value": "", "enabled": True},
        {"key": "admin_id", "value": "", "enabled": True},
        {"key": "class_id", "value": "c1", "enabled": True},
        {"key": "teacher_id", "value": "", "enabled": True},
        {"key": "exam_id", "value": "", "enabled": True},
        {"key": "student_id", "value": "", "enabled": True},
        {"key": "submission_id", "value": "", "enabled": True}
    ],
    "_postman_variable_scope": "environment",
    "_postman_exported_at": "2026-05-24T00:00:00.000Z",
    "_postman_exported_using": "Codex GPT-5"
}

out_dir = Path('docs')
out_dir.mkdir(parents=True, exist_ok=True)
collection_path = out_dir / 'group8-required-endpoints.postman_collection.json'
env_path = out_dir / 'group8-local-encrypted.postman_environment.json'

collection_path.write_text(json.dumps(collection, indent=2), encoding='utf-8')
env_path.write_text(json.dumps(environment, indent=2), encoding='utf-8')

print(collection_path)
print(env_path)
