'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Remove the unique constraint from po_number column
    await queryInterface.removeConstraint('purchase_orders', 'purchase_orders_po_number_key');
  },

  async down(queryInterface, Sequelize) {
    // Add back the unique constraint if needed to rollback
    await queryInterface.addConstraint('purchase_orders', {
      fields: ['po_number'],
      type: 'unique',
      name: 'purchase_orders_po_number_key'
    });
  }
};
