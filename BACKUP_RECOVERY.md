# Backup & Disaster Recovery Standard Operating Procedure (SOP)

**Product Intelligence — Industrial Commerce Platform**  
*Document Version:* 1.2.0  
*Classification:* Operations & Reliability Guide  
*Last Reviewed:* August 15, 2026  

---

## 1. Executive Summary

This document establishes the comprehensive data persistence, automated snapshotting, disaster recovery, and failover strategy for the **Product Intelligence** platform across both client-side workspaces and backend persistence layers.

---

## 2. Client-Side Workspace Recovery & Persistence

The frontend application includes a zero-configuration, built-in disaster recovery system located in [`src/services/storage.js`](src/services/storage.js):

### A. Debounced Automated Snapshotting
- Every mutation (form input, preset selection, pipeline execution, review approval/rejection/edit, and theme toggle) triggers `saveStateSnapshot()`.
- **300ms Debounce Strategy**: Disk/localStorage writes are debounced to eliminate synchronous thread locking during rapid typing.
- **Snapshot Key**: `product_intelligence_workspace_v1`
- **Stored Data Schema**:
  ```json
  {
    "version": 1,
    "savedAt": "2026-08-15T14:30:00.000Z",
    "data": {
      "input": { "sku": "HEX-M12-50", "description": "...", "notes": "..." },
      "activeStage": "review",
      "phase": "review",
      "productRecord": { "sku": { "value": "HEX-M12-50", "confidence": 0.98, "status": "extracted" } },
      "reviewQueue": [ ... ],
      "history": [ ... ],
      "theme": "dark"
    }
  }
  ```

### B. Auto-Crash Recovery
- On application bootstrap (`src/main.js`), `loadStateSnapshot()` automatically scans `localStorage`.
- If an existing session snapshot is found, the product intelligence workspace, structured attribute table, and review queue are seamlessly restored without data loss.

### C. Manual Workspace Backup & Import
- Users can export a standalone timestamped JSON snapshot using `exportBackupFile(state)`:
  - Generates: `product-intelligence-backup-<timestamp>.json`
  - Allows cross-device migration, reviewer handoffs, and offline archiving.

---

## 3. Server-Side Persistence & Database Backup

The backend server ([`server/index.js`](server/index.js)) uses a dual in-memory and file-persisted relational database engine ([`server/db/database.js`](server/db/database.js)):

### A. File-Backed Relational Engine (`server/db/data.json`)
- State is serialized on all write operations (`insert`, `update`, `delete`) with a 100ms debounce.
- Persists 5 normalized tables:
  1. `users` — User credentials, PBKDF2 hashes, salts, and roles
  2. `products` — Normalized catalog products and overall confidence scores
  3. `product_attributes` — Extracted attributes with status and confidence ratings
  4. `attribute_evidence` — Source document citations, pages, and OCR text snippets
  5. `review_logs` — Human-in-the-loop review audit trail with reviewer IDs and timestamps
- **Survives server restarts, crashes, container re-deployments, and network drops.**

---

## 4. Production Enterprise Database Backup Strategy (PostgreSQL / Relational)

When deployed to production cloud environments (AWS, GCP, Azure), the following enterprise backup SOP is enforced:

### A. Automated Daily Full Backups (`pg_dump` + S3)
- **Schedule**: Daily at `02:00 UTC` via Kubernetes CronJob / systemd timer.
- **Compression & Encryption**: AES-256 encrypted tar snapshot.
- **Command**:
  ```bash
  #!/usr/bin/env bash
  set -eo pipefail
  TIMESTAMP=$(date +%Y%m%d_%H%M%S)
  BACKUP_FILE="/tmp/pi_db_backup_${TIMESTAMP}.dump"
  
  # Execute compressed binary dump
  pg_dump -h "${DB_HOST}" -U "${DB_USER}" -d "${DB_NAME}" -F c -b -v -f "${BACKUP_FILE}"
  
  # Encrypt and upload to AWS S3 Glacier / GCP Coldline
  aws s3 cp "${BACKUP_FILE}" "s3://${BACKUP_BUCKET}/daily/${TIMESTAMP}.dump" --sse aws:kms --sse-kms-key-id "${KMS_KEY_ID}"
  rm -f "${BACKUP_FILE}"
  ```

### B. Continuous Write-Ahead Log (WAL) Archiving
- Using **WAL-G** or **pgBackRest** to push WAL segments continuously to encrypted cloud storage.
- Enables **Point-in-Time Recovery (PITR)** to any specific second in the past 30 days.

### C. Backup Retention Policy (Grandfather-Father-Son)
| Tier | Frequency | Retention Window | Storage Class |
|:---|:---:|:---:|:---|
| **Daily Snapshots** | Every 24h | 14 Days | S3 Standard-IA |
| **Weekly Snapshots** | Every Sunday | 8 Weeks | S3 Standard-IA |
| **Monthly Snapshots** | 1st of Month | 12 Months | S3 Glacier Flexible |
| **Annual Snapshots** | Jan 1st | 7 Years (Compliance) | S3 Glacier Deep Archive |

---

## 5. Disaster Recovery Objectives (RTO / RPO)

- **Recovery Time Objective (RTO)**: `< 15 minutes`  
  *Automated container failover to secondary region with multi-AZ replica promotion.*
- **Recovery Point Objective (RPO)**: `< 1 minute`  
  *Near real-time streaming replication + continuous WAL archiving.*

---

## 6. Step-by-Step Emergency Failover & Restoration Runbook

### Scenario 1: Primary Database Instance Failure
1. **Health Verification**:
   ```bash
   pg_isready -h primary-db.internal -p 5432 || echo "Primary Node Unreachable"
   ```
2. **Promote Read-Replica to Primary**:
   ```bash
   # On standby replica instance
   pg_ctl promote -D /var/lib/postgresql/data
   ```
3. **Re-route Application Traffic**:
   Update Route53 DNS record or API Gateway connection pool to point to newly promoted primary endpoint.
4. **Verify Application Health**:
   ```bash
   curl -s -f http://localhost:5000/api/v1/health | jq .
   ```

### Scenario 2: Full Disaster Recovery from S3 Snapshot
1. **Provision Fresh Database Node**:
   ```bash
   docker run -d --name pi-postgres-recovery -e POSTGRES_PASSWORD="${DB_PASS}" -p 5432:5432 postgres:16-alpine
   ```
2. **Fetch and Restore Latest Backup**:
   ```bash
   aws s3 cp "s3://${BACKUP_BUCKET}/daily/latest.dump" /tmp/latest.dump
   pg_restore -h localhost -U postgres -d product_intelligence_db -v /tmp/latest.dump
   ```
3. **Execute Data Integrity Verification**:
   ```bash
   npm test
   ```

---

*Product Intelligence Reliability Engineering Team · 2026*
