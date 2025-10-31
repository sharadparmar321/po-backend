'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Safely remove UNIQUE constraint on po_number for Postgres by discovering its name
    // Some environments auto-generate different constraint names.
    const dropConstraintSql = `
      DO $$
      DECLARE
        cname text;
      BEGIN
        SELECT tc.constraint_name INTO cname
        FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage ccu
          ON tc.constraint_name = ccu.constraint_name
        WHERE tc.table_name = 'purchase_orders'
          AND tc.constraint_type = 'UNIQUE'
          AND ccu.column_name = 'po_number'
        LIMIT 1;
        IF cname IS NOT NULL THEN
          EXECUTE 'ALTER TABLE "purchase_orders" DROP CONSTRAINT ' || quote_ident(cname);
        END IF;
      END $$;
    `;
    await queryInterface.sequelize.query(dropConstraintSql);
  },

  async down(queryInterface, Sequelize) {
    // Recreate UNIQUE constraint on po_number if it doesn't already exist
    const addConstraintSql = `
      DO $$
      DECLARE
        exists boolean;
      BEGIN
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.table_constraints tc
          JOIN information_schema.constraint_column_usage ccu
            ON tc.constraint_name = ccu.constraint_name
          WHERE tc.table_name = 'purchase_orders'
            AND tc.constraint_type = 'UNIQUE'
            AND ccu.column_name = 'po_number'
        ) INTO exists;
        IF NOT exists THEN
          ALTER TABLE "purchase_orders" ADD CONSTRAINT purchase_orders_po_number_key UNIQUE ("po_number");
        END IF;
      END $$;
    `;
    await queryInterface.sequelize.query(addConstraintSql);
  }
};

