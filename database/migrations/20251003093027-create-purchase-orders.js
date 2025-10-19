'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('purchase_orders', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
        primaryKey: true,
      },
      company_name: { type: Sequelize.STRING },
      company_address: { type: Sequelize.TEXT },
      company_city_state_zip: { type: Sequelize.STRING },
      company_country: { type: Sequelize.STRING },
      vendor_name: { type: Sequelize.STRING },
      vendor_address: { type: Sequelize.TEXT },
      vendor_city_state_zip: { type: Sequelize.STRING },
      vendor_country: { type: Sequelize.STRING },
      po_number: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      order_date: { type: Sequelize.DATE },
      delivery_date: { type: Sequelize.DATE },
      sub_total: { type: Sequelize.DECIMAL(12, 2) },
      tax_rate: { type: Sequelize.DECIMAL(5, 2) },
      tax_amount: { type: Sequelize.DECIMAL(12, 2) },
      total: { type: Sequelize.DECIMAL(12, 2) },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('purchase_orders');
  }
};


