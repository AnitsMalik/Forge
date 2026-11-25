import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. SMS Senders (Twilio / Telnyx / A2P 10DLC Registration)
  await knex.schema.createTable('sms_senders', (table) => {
    table.string('id', 36).primary();
    table.string('tenant_id', 36).notNullable().index();
    table.string('brand_id', 36).notNullable().index();
    table.string('provider', 32).notNullable().defaultTo('twilio'); // 'twilio' | 'telnyx' | 'aws_sns'
    table.string('phone_number', 32).notNullable();
    table.string('sender_type', 32).notNullable().defaultTo('10DLC'); // '10DLC' | 'TOLL_FREE' | 'SHORTCODE' | 'ALPHANUMERIC'
    table.string('a2p_registration_status', 32).notNullable().defaultTo('APPROVED'); // 'PENDING' | 'APPROVED' | 'REJECTED'
    table.string('brand_name', 128).notNullable();
    table.boolean('is_default').notNullable().defaultTo(true);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
  });

  // 2. SMS Campaigns (Broadcasts)
  await knex.schema.createTable('sms_campaigns', (table) => {
    table.string('id', 36).primary();
    table.string('tenant_id', 36).notNullable().index();
    table.string('brand_id', 36).notNullable().index();
    table.string('name', 255).notNullable();
    table.text('body').notNullable();
    table.string('sender_phone', 32).notNullable();
    table.string('status', 32).notNullable().defaultTo('DRAFT'); // 'DRAFT' | 'SENDING' | 'COMPLETED' | 'FAILED'
    table.integer('recipient_count').notNullable().defaultTo(0);
    table.integer('sent_count').notNullable().defaultTo(0);
    table.integer('delivered_count').notNullable().defaultTo(0);
    table.integer('opt_out_count').notNullable().defaultTo(0);
    table.timestamp('sent_at').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
  });

  // 3. SMS Messages (Detailed Ledger)
  await knex.schema.createTable('sms_messages', (table) => {
    table.string('id', 36).primary();
    table.string('tenant_id', 36).notNullable().index();
    table.string('brand_id', 36).notNullable().index();
    table.string('contact_id', 36).nullable().index();
    table.string('campaign_id', 36).nullable().index();
    table.string('direction', 16).notNullable().defaultTo('OUTBOUND'); // 'OUTBOUND' | 'INBOUND'
    table.string('from_number', 32).notNullable();
    table.string('to_number', 32).notNullable().index();
    table.text('body').notNullable();
    table.integer('segments').notNullable().defaultTo(1);
    table.string('status', 32).notNullable().defaultTo('SENT'); // 'QUEUED' | 'SENT' | 'DELIVERED' | 'UNDELIVERED' | 'FAILED'
    table.string('provider_message_sid', 64).notNullable().unique();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  // 4. Voice AI Agents
  await knex.schema.createTable('voice_agents', (table) => {
    table.string('id', 36).primary();
    table.string('tenant_id', 36).notNullable().index();
    table.string('brand_id', 36).notNullable().index();
    table.string('name', 128).notNullable();
    table.string('voice_persona', 64).notNullable().defaultTo('Nova - Warm Concierge'); // 'Nova' | 'Atlas' | 'Echo'
    table.text('system_prompt').notNullable();
    table.string('language', 16).notNullable().defaultTo('en-US');
    table.string('forwarding_phone', 32).nullable();
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
  });

  // 5. Voice Call Logs
  await knex.schema.createTable('voice_calls', (table) => {
    table.string('id', 36).primary();
    table.string('tenant_id', 36).notNullable().index();
    table.string('brand_id', 36).notNullable().index();
    table.string('contact_id', 36).nullable().index();
    table.string('agent_id', 36).nullable().index();
    table.string('direction', 16).notNullable().defaultTo('OUTBOUND'); // 'OUTBOUND' | 'INBOUND'
    table.string('caller_number', 32).notNullable();
    table.string('callee_number', 32).notNullable().index();
    table.integer('duration_seconds').notNullable().defaultTo(0);
    table.string('status', 32).notNullable().defaultTo('COMPLETED'); // 'RINGING' | 'IN_PROGRESS' | 'COMPLETED' | 'NO_ANSWER' | 'BUSY'
    table.string('outcome', 64).notNullable().defaultTo('INFORMATION_PROVIDED'); // 'APPOINTMENT_BOOKED' | 'CALLBACK_REQUESTED' | 'TRANSFERRED' | 'VOICEMAIL' | 'NOT_INTERESTED'
    table.text('transcript').nullable();
    table.text('ai_summary').nullable();
    table.string('recording_url', 512).nullable();
    table.string('call_sid', 64).notNullable().unique();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('voice_calls');
  await knex.schema.dropTableIfExists('voice_agents');
  await knex.schema.dropTableIfExists('sms_messages');
  await knex.schema.dropTableIfExists('sms_campaigns');
  await knex.schema.dropTableIfExists('sms_senders');
}

