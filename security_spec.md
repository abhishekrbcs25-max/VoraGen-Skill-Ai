# PathForge Firestore Security Specification (Eight Pillars)

## 1. Data Invariants
1. **Identity & Ownership**: `/users/{userId}` and its subcollections (`/private/{docId}`, `/assessments/{assessmentId}`) belong strictly to `request.auth.uid == userId` with verified email (`request.auth.token.email_verified == true`).
2. **PII Isolation**: Email addresses and auth provider metadata are strictly stored in `/users/{userId}/private/info` and readable/writable only by the verified owner.
3. **Master Gate Relational Sync**: All subcollections under `/users/{userId}` verify `exists(/databases/$(database)/documents/users/$(userId))` (or `existsAfter` during atomic creation) and strict ownership.
4. **Immutable Fields & Temporal Integrity**: `uid` and `createdAt` cannot be altered after creation; `createdAt` and `updatedAt` must equal `request.time`.
5. **Strict Schema & Bounds**: Every string validates `.size()` bounds and regex ID patterns (`^[a-zA-Z0-9_\-]+$`); shadow/ghost keys are rejected via `keys().hasAll(...) && keys().hasOnly(...)` on create and `affectedKeys().hasOnly(...)` on update.

## 2. The "Dirty Dozen" Attack Payloads (Expected: PERMISSION_DENIED)
1. **Unauthenticated Read**: `GET /users/uid_alice` with `auth = null`.
2. **Cross-Tenant Read**: `GET /users/uid_alice` as `uid_bob`.
3. **Cross-Tenant PII Read**: `GET /users/uid_alice/private/info` as `uid_bob`.
4. **Identity Spoofing on Create**: `CREATE /users/uid_bob` with `{ "uid": "uid_alice", ... }` as `uid_bob`.
5. **Unverified Email Bypass**: `CREATE /users/uid_bob` as `uid_bob` with `email_verified = false`.
6. **Shadow/Ghost Field Injection**: `CREATE /users/uid_bob` with `{ ..., "isAdmin": true }`.
7. **ID Poisoning (1.5KB Document ID)**: `CREATE /users/uid_bob/assessments/<1500_char_id>` with invalid length/chars.
8. **Client-Forged Timestamp**: `CREATE /users/uid_bob` with `createdAt = "2020-01-01T00:00:00Z"` instead of `request.time`.
9. **Immutable `uid` Mutation**: `UPDATE /users/uid_bob` changing `uid` to `"uid_alice"`.
10. **Out-of-Range Score**: `CREATE /users/uid_bob/assessments/a1` with `scorePct: 999` or `-10`.
11. **Oversized String DoS**: `UPDATE /users/uid_bob` with `headline` > 160 chars.
12. **Blanket Collection List**: `LIST /users` as `uid_bob` without owner scoping.
