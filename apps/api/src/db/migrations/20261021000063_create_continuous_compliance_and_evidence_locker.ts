import type { Knex } from 'knex';
import crypto from 'crypto';

export async function up(knex: Knex): Promise<void> {
  // 1. compliance_controls
  await knex.schema.createTable('compliance_controls', (table) => {
    table.string('id', 64).primary();
    table.string('control_code', 64).notNullable().index();
    table.string('framework', 32).notNullable().index();
    table.string('title', 255).notNullable();
    table.text('description').notNullable();
    table.string('collector_type', 64).notNullable().index();
    table.string('status', 32).notNullable().defaultTo('compliant').index();
    table.boolean('automated_check').notNullable().defaultTo(true);
    table.timestamp('last_evaluated_at').nullable();
    table.integer('evidence_count').notNullable().defaultTo(1);
    table.decimal('pass_percentage', 5, 2).notNullable().defaultTo(100.00);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
  });

  // 2. compliance_evidences
  await knex.schema.createTable('compliance_evidences', (table) => {
    table.string('id', 64).primary();
    table.string('control_id', 64).notNullable().index();
    table.string('control_code', 64).notNullable().index();
    table.string('collector_type', 64).notNullable();
    table.string('evidence_title', 255).notNullable();
    table.string('evidence_payload_hash', 64).notNullable(); // SHA-256 hex
    table.json('evidence_data').nullable();
    table.string('evaluation_status', 32).notNullable().defaultTo('passed').index();
    table.timestamp('collected_at').notNullable().defaultTo(knex.fn.now());
  });

  // 3. compliance_auditor_sessions
  await knex.schema.createTable('compliance_auditor_sessions', (table) => {
    table.string('id', 64).primary();
    table.string('auditor_email', 255).notNullable().index();
    table.string('auditor_firm', 255).notNullable();
    table.string('access_token', 128).notNullable().unique();
    table.json('framework_scope').notNullable();
    table.timestamp('expires_at').notNullable();
    table.boolean('is_active').notNullable().defaultTo(true).index();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  const now = new Date();

  // Pre-seed Core Controls
  const controls = [
    {
      id: 'ctrl-soc2-cc61',
      control_code: 'CC6.1',
      framework: 'soc2_type2',
      title: 'Logical Access Controls & Role-Based Permissions',
      description: 'The entity implements logical access security software, infrastructure, and architectures over protected resources.',
      collector_type: 'access_control',
      status: 'compliant',
      automated_check: true,
      last_evaluated_at: now,
      evidence_count: 2,
      pass_percentage: 100.00,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'ctrl-soc2-cc66',
      control_code: 'CC6.6',
      framework: 'soc2_type2',
      title: 'Boundary & Perimeter DLP Content Guardrails',
      description: 'The entity implements boundary protection and outbound data loss prevention mechanisms to prevent unauthorized exfiltration.',
      collector_type: 'dlp_guardrails',
      status: 'compliant',
      automated_check: true,
      last_evaluated_at: now,
      evidence_count: 1,
      pass_percentage: 100.00,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'ctrl-hipaa-164312',
      control_code: 'HIPAA-164.312',
      framework: 'hipaa',
      title: 'Cryptographic Key Lifecycle & Zero-Trust Key Rotation',
      description: 'A covered entity must implement security measures to ensure that electronic protected health information is encrypted and keys rotated.',
      collector_type: 'secret_rotation',
      status: 'compliant',
      automated_check: true,
      last_evaluated_at: now,
      evidence_count: 1,
      pass_percentage: 98.50,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'ctrl-gdpr-art32',
      control_code: 'GDPR-Art32',
      framework: 'gdpr',
      title: 'Immutable WORM Audit Vault & Cryptographic Tamper Evidence',
      description: 'Ensuring ongoing confidentiality, integrity, availability, and resilience of processing systems and services with cryptographic proofs.',
      collector_type: 'worm_tamper_proof',
      status: 'compliant',
      automated_check: true,
      last_evaluated_at: now,
      evidence_count: 1,
      pass_percentage: 100.00,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'ctrl-iso-a12',
      control_code: 'ISO27001-A.12',
      framework: 'iso27001',
      title: 'Operations Security & Real-Time Incident Response',
      description: 'Information security incidents must be communicated and resolved through audited automated workflows.',
      collector_type: 'incident_response',
      status: 'compliant',
      automated_check: true,
      last_evaluated_at: now,
      evidence_count: 1,
      pass_percentage: 96.00,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'ctrl-fedramp-sc13',
      control_code: 'FedRAMP-SC-13',
      framework: 'fedramp',
      title: 'Cryptographic Protection at Rest with Envelope DEKs',
      description: 'The information system implements approved cryptography in accordance with applicable federal laws and FIPS 140-3 validations.',
      collector_type: 'encryption_at_rest',
      status: 'compliant',
      automated_check: true,
      last_evaluated_at: now,
      evidence_count: 1,
      pass_percentage: 100.00,
      created_at: now,
      updated_at: now,
    },
  ];

  await knex('compliance_controls').insert(controls);

  // Pre-seed Evidence Records with SHA-256 payload hashes
  const evidencePayloads = [
    {
      id: 'ev-soc2-rbac-01',
      control_id: 'ctrl-soc2-cc61',
      control_code: 'CC6.1',
      collector_type: 'access_control',
      evidence_title: 'RBAC Zero-Standing Privilege & MFA Enforcement Audit Snapshot',
      data: { mfaEnforcedUsers: 142, superadminCount: 2, sessionExpiryHours: 24, lastSampleTimestamp: now.toISOString() },
    },
    {
      id: 'ev-soc2-dlp-02',
      control_id: 'ctrl-soc2-cc66',
      control_code: 'CC6.6',
      collector_type: 'dlp_guardrails',
      evidence_title: 'Real-Time DLP Outbound Quarantine & PII Inspection Log',
      data: { activePoliciesCount: 5, quarantinedIncidentsCount: 0, scanPassRatePercent: 100.0 },
    },
    {
      id: 'ev-hipaa-kms-03',
      control_id: 'ctrl-hipaa-164312',
      control_code: 'HIPAA-164.312',
      collector_type: 'secret_rotation',
      evidence_title: 'Master Envelope DEK 90-Day Rotation Attestation',
      data: { activeKeyVersion: 4, gracePeriodVersion: 3, algorithm: 'AES-256-GCM', nextRotationDueDays: 82 },
    },
    {
      id: 'ev-gdpr-worm-04',
      control_id: 'ctrl-gdpr-art32',
      control_code: 'GDPR-Art32',
      collector_type: 'worm_tamper_proof',
      evidence_title: 'Immutable WORM Daily Merkle Root Seal Cryptographic Verification',
      data: { dailySealsVerified: 28, totalWormRecords: 5420, chainIntegrity: '100% Validated' },
    },
    {
      id: 'ev-iso-alert-05',
      control_id: 'ctrl-iso-a12',
      control_code: 'ISO27001-A.12',
      collector_type: 'incident_response',
      evidence_title: 'Automated Incident Dispatch PagerDuty & Slack Webhook Latency',
      data: { averageDispatchMs: 142, uptimeSlaPercent: 99.99, criticalOpenIncidents: 0 },
    },
    {
      id: 'ev-fedramp-enc-06',
      control_id: 'ctrl-fedramp-sc13',
      control_code: 'FedRAMP-SC-13',
      collector_type: 'encryption_at_rest',
      evidence_title: 'FIPS 140-3 Hardware KMS Envelope Encryption Verification',
      data: { storageEncrypted: true, databaseVolumesEncrypted: true, kmsProvider: 'aws_kms' },
    },
  ];

  const evidenceRows = evidencePayloads.map((e) => {
    const raw = JSON.stringify(e.data);
    const hash = crypto.createHash('sha256').update(raw).digest('hex');
    return {
      id: e.id,
      control_id: e.control_id,
      control_code: e.control_code,
      collector_type: e.collector_type,
      evidence_title: e.evidence_title,
      evidence_payload_hash: hash,
      evidence_data: JSON.stringify(e.data),
      evaluation_status: 'passed',
      collected_at: now,
    };
  });

  await knex('compliance_evidences').insert(evidenceRows);

  // Pre-seed 1 active auditor portal session
  const expires = new Date();
  expires.setDate(expires.getDate() + 30);
  await knex('compliance_auditor_sessions').insert({
    id: 'aud-kpmg-soc2-01',
    auditor_email: 'sarah.jenkins@kpmg-cyber.com',
    auditor_firm: 'KPMG US LLP',
    access_token: crypto.createHash('sha256').update('kpmg-soc2-audit-token-secret-2026').digest('hex'),
    framework_scope: JSON.stringify(['soc2_type2', 'iso27001']),
    expires_at: expires,
    is_active: true,
    created_at: now,
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('compliance_auditor_sessions');
  await knex.schema.dropTableIfExists('compliance_evidences');
  await knex.schema.dropTableIfExists('compliance_controls');
}
