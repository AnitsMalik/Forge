import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasTemplates = await knex.schema.hasTable('templates');
  if (hasTemplates) {
    const hasSubcategory = await knex.schema.hasColumn('templates', 'subcategory');
    if (!hasSubcategory) {
      await knex.schema.alterTable('templates', (table) => {
        table.string('subcategory', 64).nullable();
        table.json('dimensions').nullable();
        table.json('visual_components').nullable();
      });
    }
  }

  const hasTemplateVersions = await knex.schema.hasTable('template_versions');
  if (hasTemplateVersions) {
    const hasSubcategory = await knex.schema.hasColumn('template_versions', 'subcategory');
    if (!hasSubcategory) {
      await knex.schema.alterTable('template_versions', (table) => {
        table.string('subcategory', 64).nullable();
        table.json('dimensions').nullable();
        table.json('visual_components').nullable();
      });
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasTemplates = await knex.schema.hasTable('templates');
  if (hasTemplates) {
    const hasSubcategory = await knex.schema.hasColumn('templates', 'subcategory');
    if (hasSubcategory) {
      await knex.schema.alterTable('templates', (table) => {
        table.dropColumn('subcategory');
        table.dropColumn('dimensions');
        table.dropColumn('visual_components');
      });
    }
  }

  const hasTemplateVersions = await knex.schema.hasTable('template_versions');
  if (hasTemplateVersions) {
    const hasSubcategory = await knex.schema.hasColumn('template_versions', 'subcategory');
    if (hasSubcategory) {
      await knex.schema.alterTable('template_versions', (table) => {
        table.dropColumn('subcategory');
        table.dropColumn('dimensions');
        table.dropColumn('visual_components');
      });
    }
  }
}
