'use strict';

module.exports = {
  async up(queryInterface) {
    // Idempotent operations using raw SQL (Postgres)
    const sql = `
      -- Add columns if not exist
      ALTER TABLE "purchase_orders"
        ADD COLUMN IF NOT EXISTS "company_contact" VARCHAR(255);

      ALTER TABLE "purchase_orders"
        ADD COLUMN IF NOT EXISTS "unique_id" TEXT;

      -- Backfill missing unique_id values
      UPDATE "purchase_orders"
      SET "unique_id" = (
        'PO-' || EXTRACT(EPOCH FROM NOW())::BIGINT || '-' || SUBSTRING(MD5(RANDOM()::TEXT) FOR 9)
      )
      WHERE "unique_id" IS NULL;

      -- Create unique constraint on unique_id if absent
      DO $$
      DECLARE
        exists boolean;
      BEGIN
        SELECT EXISTS (
          SELECT 1 FROM information_schema.table_constraints tc
          WHERE tc.table_name = 'purchase_orders'
            AND tc.constraint_type = 'UNIQUE'
            AND tc.constraint_name = 'purchase_orders_unique_id_key'
        ) INTO exists;
        IF NOT exists THEN
          EXECUTE 'ALTER TABLE "purchase_orders" ADD CONSTRAINT purchase_orders_unique_id_key UNIQUE ("unique_id")';
        END IF;
      END $$;

      -- Enforce NOT NULL
      ALTER TABLE "purchase_orders"
        ALTER COLUMN "unique_id" SET NOT NULL;

      -- Line items gst column
      ALTER TABLE "line_items"
        ADD COLUMN IF NOT EXISTS "gst" DECIMAL(5,2) DEFAULT 0;
    `;
    await queryInterface.sequelize.query(sql);
  },

  async down(queryInterface) {
    const sql = `
      -- Drop gst column if exists
      ALTER TABLE "line_items" DROP COLUMN IF EXISTS "gst";

      -- Drop unique constraint if exists, then columns if exist
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.table_constraints tc
          WHERE tc.table_name = 'purchase_orders'
            AND tc.constraint_name = 'purchase_orders_unique_id_key'
        ) THEN
          EXECUTE 'ALTER TABLE "purchase_orders" DROP CONSTRAINT purchase_orders_unique_id_key';
        END IF;
      END $$;

      ALTER TABLE "purchase_orders" DROP COLUMN IF EXISTS "unique_id";
      ALTER TABLE "purchase_orders" DROP COLUMN IF EXISTS "company_contact";
    `;
    await queryInterface.sequelize.query(sql);
  }
};


