import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. dlp_policies table
  const hasPolicies = await knex.schema.hasTable('dlp_policies');
  if (!hasPolicies) {
    await knex.schema.createTable('dlp_policies', (table) => {
      table.string('id', 64).primary();
      table.string('tenant_id', 64).nullable().index();
      table.string('name', 255).notNullable();
      table.text('description').nullable();
      table.string('category', 32).notNullable(); // credentials, pii, financial_pci, health_hipaa, custom
      table.string('severity', 16).notNullable().defaultTo('warning'); // info, warning, critical, fatal
      table.string('action', 32).notNullable().defaultTo('redact_inline'); // redact_inline, quarantine_for_approval, warn_and_log, block_outright
      table.json('match_patterns').notNullable();
      table.json('target_scopes').notNullable();
      table.boolean('is_enabled').notNullable().defaultTo(true);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    });

    // Seed default enterprise DLP policies
    await knex('dlp_policies').insert([
      {
        id: 'dlp-pol-creds-aws-github',
        tenant_id: null,
        name: 'Strict API Keys & Secret Credentials Blocker',
        description: 'Blocks posts containing AWS access keys, GitHub PATs, private certificates, or secret bearer tokens.',
        category: 'credentials',
        severity: 'fatal',
        action: 'block_outright',
        match_patterns: JSON.stringify([
          {
            name: 'AWS Access Key ID',
            pattern: '(?:A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}',
            flags: 'g',
            description: 'Standard 20-character AWS IAM access key ID prefix',
          },
          {
            name: 'GitHub Personal Access Token',
            pattern: 'ghp_[0-9a-zA-Z]{36}',
            flags: 'g',
            description: 'GitHub classic personal access token format',
          },
          {
            name: 'Private RSA/EC Encryption Key',
            pattern: '-----BEGIN (?:RSA |EC )?PRIVATE KEY-----',
            flags: 'g',
            description: 'PEM-encoded private key header block',
          },
        ]),
        target_scopes: JSON.stringify(['posts:publish', 'ai:generation', 'webhooks:dispatch']),
        is_enabled: true,
        created_at: knex.fn.now(),
        updated_at: knex.fn.now(),
      },
      {
        id: 'dlp-pol-fin-pci-cards',
        tenant_id: null,
        name: 'PCI DSS Financial Credit Card Redactor',
        description: 'Automatically redacts Visa, Mastercard, and Amex payment card numbers inline before publishing.',
        category: 'financial_pci',
        severity: 'critical',
        action: 'redact_inline',
        match_patterns: JSON.stringify([
          {
            name: 'Visa Credit Card',
            pattern: '\\b4[0-9]{12}(?:[0-9]{3})?\\b',
            flags: 'g',
            description: '13 or 16 digit Visa card format',
          },
          {
            name: 'Mastercard Credit Card',
            pattern: '\\b(?:5[1-5][0-9]{2}|222[1-9]|22[3-9][0-9]|2[3-6][0-9]{2}|27[01][0-9]|2720)[0-9]{12}\\b',
            flags: 'g',
            description: '16 digit Mastercard format with BIN ranges',
          },
          {
            name: 'American Express Card',
            pattern: '\\b3[47][0-9]{13}\\b',
            flags: 'g',
            description: '15 digit American Express card format',
          },
        ]),
        target_scopes: JSON.stringify(['posts:publish', 'ai:generation', 'comments:reply']),
        is_enabled: true,
        created_at: knex.fn.now(),
        updated_at: knex.fn.now(),
      },
      {
        id: 'dlp-pol-pii-ssn-contacts',
        tenant_id: null,
        name: 'PII Identification & Quarantine Guard',
        description: 'Quarantines content containing US Social Security numbers or corporate email leaks for security officer review.',
        category: 'pii',
        severity: 'warning',
        action: 'quarantine_for_approval',
        match_patterns: JSON.stringify([
          {
            name: 'US Social Security Number (SSN)',
            pattern: '\\b(?!000|666|9\\d{2})\\d{3}-(?!00)\\d{2}-(?!0000)\\d{4}\\b',
            flags: 'g',
            description: 'Standard 9-digit hyphenated US Social Security Number',
          },
          {
            name: 'Restricted Corporate Email Leak',
            pattern: '\\b[A-Za-z0-9._%+-]+@(corp\\.internal|topsecret\\.defense\\.gov)\\b',
            flags: 'gi',
            description: 'Emails originating from internal or restricted defense domains',
          },
        ]),
        target_scopes: JSON.stringify(['posts:publish']),
        is_enabled: true,
        created_at: knex.fn.now(),
        updated_at: knex.fn.now(),
      },
      {
        id: 'dlp-pol-custom-confidential',
        tenant_id: null,
        name: 'Confidential M&A Project Codenames Sentinel',
        description: 'Logs warnings when unannounced M&A projects or confidential codenames appear in marketing copy.',
        category: 'custom',
        severity: 'info',
        action: 'warn_and_log',
        match_patterns: JSON.stringify([
          {
            name: 'Confidential Project Codename',
            pattern: '\\b(PROJECT_TITAN_SECRET|INTERNAL_ACQUISITION_OMEGA|STRICTLY_CONFIDENTIAL_EMBARGO)\\b',
            flags: 'g',
            description: 'High-sensitivity internal strategic codenames',
          },
        ]),
        target_scopes: JSON.stringify(['posts:publish', 'ai:generation', 'exports:csv']),
        is_enabled: true,
        created_at: knex.fn.now(),
        updated_at: knex.fn.now(),
      },
    ]);
  }

  // 2. dlp_incidents table
  const hasIncidents = await knex.schema.hasTable('dlp_incidents');
  if (!hasIncidents) {
    await knex.schema.createTable('dlp_incidents', (table) => {
      table.string('id', 64).primary();
      table.string('tenant_id', 64).notNullable().index();
      table.string('policy_id', 64).notNullable().index();
      table.string('target_scope', 64).notNullable();
      table.string('entity_type', 64).notNullable();
      table.string('entity_id', 64).nullable();
      table.string('severity', 16).notNullable();
      table.string('action_taken', 32).notNullable(); // redacted, quarantined, warned, blocked
      table.integer('match_count').notNullable().defaultTo(1);
      table.json('violation_details').notNullable();
      table.text('masked_content').notNullable();
      table.string('quarantine_status', 32).notNullable().defaultTo('none'); // pending_review, approved_override, rejected_dismissed, auto_resolved, none
      table.string('reviewed_by', 64).nullable();
      table.text('review_notes').nullable();
      table.timestamp('reviewed_at').nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    });

    // Seed sample historical incidents
    await knex('dlp_incidents').insert([
      {
        id: 'dlp-inc-quarantine-seed01',
        tenant_id: 'default-tenant-001',
        policy_id: 'dlp-pol-pii-ssn-contacts',
        target_scope: 'posts:publish',
        entity_type: 'post',
        entity_id: 'post-draft-review-991',
        severity: 'warning',
        action_taken: 'quarantined',
        match_count: 1,
        violation_details: JSON.stringify({
          violations: [
            {
              rule_name: 'US Social Security Number (SSN)',
              category: 'pii',
              severity: 'warning',
              snippet_masked: 'Contact employee SSN: [REDACTED_PII:ssn] for details',
              match_index: 22,
            },
          ],
          detected_categories: ['pii'],
          original_length: 64,
        }),
        masked_content: 'Contact employee SSN: [REDACTED_PII:ssn] for benefits verification.',
        quarantine_status: 'pending_review',
        reviewed_by: null,
        review_notes: null,
        reviewed_at: null,
        created_at: knex.fn.now(),
        updated_at: knex.fn.now(),
      },
      {
        id: 'dlp-inc-redacted-seed02',
        tenant_id: 'default-tenant-001',
        policy_id: 'dlp-pol-fin-pci-cards',
        target_scope: 'posts:publish',
        entity_type: 'post',
        entity_id: 'post-draft-redacted-882',
        severity: 'critical',
        action_taken: 'redacted',
        match_count: 1,
        violation_details: JSON.stringify({
          violations: [
            {
              rule_name: 'Visa Credit Card',
              category: 'financial_pci',
              severity: 'critical',
              snippet_masked: 'Invoice paid with card [REDACTED_PCI:visa_card]',
              match_index: 23,
            },
          ],
          detected_categories: ['financial_pci'],
          original_length: 58,
        }),
        masked_content: 'Invoice paid with card [REDACTED_PCI:visa_card] successfully.',
        quarantine_status: 'none',
        reviewed_by: null,
        review_notes: null,
        reviewed_at: null,
        created_at: knex.fn.now(),
        updated_at: knex.fn.now(),
      },
    ]);
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('dlp_incidents');
  await knex.schema.dropTableIfExists('dlp_policies');
}
