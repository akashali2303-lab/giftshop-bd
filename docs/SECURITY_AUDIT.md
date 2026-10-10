# GiftShop BD - Security, Privacy & Compliance Audit

## 1. Threat Mitigation Review
| Risk Area | Mitigation Implemented |
|---|---|
| **SQL Injection** | Prisma ORM parameterizes all relational queries automatically. |
| **Tampered Prices** | Client-supplied prices and totals are strictly ignored. The server looks up product IDs from the database and recalculates all line items, subtotals, delivery fees, and total amounts in Paisa integers. |
| **Path Traversal in Uploads** | Storage keys are sanitized using `path.basename()` and checked to ensure no directory traversal (`..`) or path separators exist. |
| **Malicious Executable Files** | Multer MIME validation strictly restricts incoming uploads to `image/jpeg`, `image/png`, and `application/pdf`. Uploads are stored privately in non-web-accessible directories (`./storage/uploads`). |
| **Credential Stuffing / Brute Force** | IP-based sliding window rate limiters protect `/api/admin/auth/login` (5 attempts / 15 minutes) and `/api/orders/checkout` (15 attempts / 15 minutes). |
| **Unauthorized Artwork Access** | Customer artwork can only be accessed via `GET /api/uploads/artwork/:key`, which requires an authenticated administrator session. |
| **Privilege Escalation** | Admin registration is disabled. Administrator records are seeded only via internal commands. |

## 2. Customer Privacy & Retention Policy
1. Customer phone numbers and addresses are stored solely for fulfillment and courier delivery.
2. In production, an automated cron job deletes customer artwork files 30 days after the order reaches `COMPLETED` status.
