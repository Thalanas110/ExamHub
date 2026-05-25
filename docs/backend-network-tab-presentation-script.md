# Backend Online Presentation Script Using DevTools Network Tab

## Purpose

Use this when presenting the hosted backend through the deployed frontend, with emphasis on showing transport encryption live.

Important constraint:

- The hosted UI does not naturally hit every required endpoint.
- After login, the app bulk-loads state through `GET /api/data/all`.
- That means some required endpoints must be triggered manually from DevTools Console so they still appear in the **Network** tab.
- The professor's main interest is the encrypted transport itself, so for the important body-carrying endpoints you should pause and show both:
  - the opaque `{ "payload": "..." }` envelope in **Network**
  - the matching decrypted JSON in **Console**

## What To Say At The Start

Use this opener:

> "I will present the backend live through the deployed frontend. I am using DevTools Network so you can see the real HTTP requests. Because our backend uses encrypted transport, the request and response bodies appear as encrypted payload envelopes in Network, and I will use a small console helper to print the decrypted JSON for explanation."

Then add this sentence immediately after:

> "So when you see a single `payload` field in Network, that is the encrypted message. The frontend encrypts before sending, the backend decrypts before processing, and the response is encrypted again before it comes back."

## Before You Share Your Screen

- Prepare one **teacher** account, one **admin** account, and one **student** account that is already enrolled in the teacher's class.
- If you want to show `POST /auth/register`, use a throwaway student account for registration only.
- Do not depend on the newly registered account for the exam flow unless you already enrolled it in a class.
- Open the deployed frontend.
- Open DevTools.
- In **Network**:
  - enable `Fetch/XHR`
  - enable `Preserve log`
  - enable `Disable cache`
- In the Network request details panel, keep these tabs in mind:
  - `Headers`
  - `Payload`
  - `Response`
- In **Console**, paste the helper from `docs/backend-network-tab-demo-helper.js`.
- When prompted:
  - confirm the deployed API base URL
  - paste the deployed `VITE_TRANSPORT_ENCRYPTION_KEY`

What the helper gives you:

- it logs encrypted request bodies and encrypted response envelopes
- it logs decrypted request bodies and decrypted response bodies
- it exposes `demoCall(...)` for endpoints the UI does not call directly
- it exposes `demoEncryptBody(...)` and `demoDecryptEnvelope(...)` if you want to explicitly prove the crypto format
- it stores the last created exam id in `demoState.lastExamId` when `POST /exams` succeeds

## How To Prove Encryption On Screen

For any request with a body, use the same pattern:

1. Trigger the action.
2. Click the request in **Network**.
3. Open the **Payload** tab and point out that the request body is not readable JSON like `email`, `password`, or `answers`.
4. Say that the frontend converted the original JSON into one encrypted opaque payload.
5. Open **Response** and point out that the backend also returned an encrypted envelope.
6. Switch to **Console** and show the helper output:
   - `Encrypted request body`
   - `Decrypted request body`
   - `Encrypted response body`
   - `Decrypted response body`

Use this exact line while doing that:

> "In Network, the transport data is unreadable because it has already been AES-GCM encrypted into a payload envelope. In Console, we decrypt the same envelope only for demonstration, so you can verify the original JSON that the backend actually processed."

## Best Encryption Moments

If the professor is focused on encryption, spend the most time on these three:

- `POST /api/auth/login`
  - shows encrypted credentials going in and encrypted session payload coming back
- `PUT /api/users/profile`
  - shows encrypted update input for sensitive profile fields
- `POST /api/results/submit`
  - shows encrypted exam answers going to the backend

Those three are the strongest proof points. The remaining endpoints can be presented faster for completeness.

## Presentation Flow

This order is the least risky if you want the later admin and report endpoints to show real data from the same demo.

### Phase 1. Public Auth And Student Profile

#### 1. `POST /api/auth/register`

Do:

- Go to the register page.
- Create a new student account.

Say:

> "This is the public registration endpoint. In Network, we can see `POST /api/auth/register`. The body is transport-encrypted, and the backend returns an encrypted response containing the new authenticated user session."

Point to:

- request method and URL
- `X-Payload-Encryption: v1`
- `Payload` tab showing only `{ "payload": "..." }`
- `Response` tab showing another encrypted envelope
- Console showing both decrypted request and decrypted response
- success status

#### 2. `POST /api/auth/login`

Do:

- Log out.
- Log in again using your prepared demo student account.

Say:

> "Next is `POST /api/auth/login`. This authenticates the user and returns the session token. Right after login you will also see `GET /api/data/all`, which is how this frontend hydrates the dashboard state, but that extra request is not part of the required endpoint list."

Then pause and add:

> "This is the first place where you can clearly see encryption in action: my login credentials are not sent as plain JSON in Network. They are sent as one encrypted payload, and the server also returns an encrypted response."

Point to:

- `POST /api/auth/login`
- its `Payload` tab
- its `Response` tab
- Console log for the same request
- then mention the extra `GET /api/data/all`

#### 3. `GET /api/users/profile`

Do:

- While still logged in as the student, run:

```js
await demoCall('GET', '/users/profile')
```

Say:

> "The frontend already has profile state after login, so this required endpoint is triggered manually for the demo. In Network you can now see `GET /api/users/profile`, and in Console I can show the decrypted JSON profile that the backend returns."

#### 4. `PUT /api/users/profile`

Do:

- Open the student profile page.
- Edit one or two fields such as `department`, `phone`, or `bio`.
- Click save.

Say:

> "This is `PUT /api/users/profile`. It updates the authenticated user's profile, and this is one of the endpoints where the backend encrypts sensitive profile fields before storage."

Then add:

> "This is a good encryption proof point because the request body contains profile data, but in Network we only see the encrypted envelope."

Point to:

- the `PUT /api/users/profile` request in Network
- `Payload` tab with the opaque encrypted request
- `Response` tab with the encrypted response envelope
- Console showing decrypted request and decrypted response
- the UI updating after save

### Phase 2. Teacher Creates The Exam

#### 5. `POST /api/exams`

Do:

- Log out.
- Log in as the teacher.
- Open **My Exams**.
- Create a simple published exam with one MCQ question.
- Choose the class that already contains your prepared demo student.

Say:

> "Now I am switching to the teacher flow. This request is `POST /api/exams`, which creates a new exam. I am keeping it to one question so the later student submission is quick."

Then add:

> "Even here, the exam definition is transported as an encrypted body rather than readable JSON in the browser network trace."

Point to:

- `POST /api/exams` in Network
- `Payload` tab
- Console log showing decrypted request and response
- `demoState.lastExamId` now available for the next step

#### 6. `GET /api/exams`

Do:

```js
await demoCall('GET', '/exams')
```

Say:

> "The deployed UI reads exams from the earlier `/data/all` snapshot, so I am calling the required list endpoint directly here. This shows the role-filtered exam list for the authenticated teacher."

#### 7. `GET /api/exams/{exam_id}`

Do:

```js
await demoCall('GET', '/exams/' + demoState.lastExamId)
```

Say:

> "This is the single-exam retrieval endpoint. It returns the full exam record including the question payload for the selected exam id."

### Phase 3. Student Submission Flow

#### 8. `POST /api/results/submit`

Do:

- Log out.
- Log in as the prepared enrolled student account.
- Open the new exam.
- Answer the single question.
- Submit the exam.

Say:

> "This is `POST /api/results/submit`. The backend receives the encrypted answer payload, stores it securely, and for MCQ items it can immediately compute marks server-side."

Then add:

> "This is the strongest example for the backend presentation because the student's answers are never visible as plaintext in the Network tab."

Point to:

- `POST /api/results/submit`
- `Payload` tab with the encrypted answer envelope
- `Response` tab with the encrypted response envelope
- Console showing decrypted answers and decrypted server response
- success status
- the UI confirmation after submit

#### 9. `GET /api/results/student/{student_id}`

Do:

```js
await demoCall('GET', '/results/student/' + demoUser().id)
```

Say:

> "This retrieves the authenticated student's result history. Again, I am triggering it directly because the hosted UI already has submission data in local state after the initial snapshot load."

### Phase 4. Admin Dashboards And Reports

#### 10. `GET /api/admin/exams`

Do:

- Log out.
- Log in as admin.
- Run:

```js
await demoCall('GET', '/admin/exams')
```

Say:

> "Now I am in the admin role. `GET /api/admin/exams` returns the exam overview used for administration, including counts and aggregate performance fields."

#### 11. `GET /api/admin/results`

Do:

```js
await demoCall('GET', '/admin/results')
```

Say:

> "This is the admin results overview endpoint. It aggregates submissions with related student and exam context so the admin can review platform-wide activity."

#### 12. `GET /api/reports/exam-performance`

Do:

```js
await demoCall('GET', '/reports/exam-performance')
```

Say:

> "This reporting endpoint summarizes per-exam performance, such as average score, highest and lowest scores, and pass or fail counts."

#### 13. `GET /api/reports/pass-fail`

Do:

```js
await demoCall('GET', '/reports/pass-fail')
```

Say:

> "This final reporting endpoint summarizes pass and fail rates overall and by exam or class. With this request, all required backend endpoints have been demonstrated live."

## Closing Line

Use this closer:

> "That completes the required backend presentation: public auth, profile management, exam creation and retrieval, student submission flow, and the admin and reporting endpoints. Most importantly, the Network tab showed the encrypted transport envelopes live, while the console helper showed the matching decrypted JSON so the encryption flow was visible and verifiable."

## Quick Recovery Notes

- If you get `401 Unauthorized`, you are on the wrong role or the session expired. Log in again with the correct account.
- If `demoCall(...)` fails with a decrypt error, the transport key you pasted does not match the deployed frontend and backend key pair.
- If the student cannot see the new exam, the student is probably not enrolled in that class. Use the prepared enrolled demo student instead of the throwaway registered account.
- Ignore extra calls such as `GET /api/data/all` and `DELETE /api/auth/logout` unless your panel asks about them. They are valid app behavior, but not part of the required 13 endpoints.

## Optional 30-Second Encryption-Only Mini Demo

If the professor interrupts and only wants encryption proof, do just this:

1. Log in and show `POST /api/auth/login`.
2. Update one profile field and show `PUT /api/users/profile`.
3. Submit one exam answer and show `POST /api/results/submit`.

Use this line:

> "These three requests prove the pattern end to end: the browser sends encrypted payloads, the backend decrypts and processes them, and the backend returns encrypted responses back to the client."
