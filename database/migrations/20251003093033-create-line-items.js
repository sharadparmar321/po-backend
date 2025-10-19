'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('line_items', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
        primaryKey: true,
      },
      description: { type: Sequelize.TEXT },
      quantity: { type: Sequelize.INTEGER },
      rate: { type: Sequelize.DECIMAL(12, 2) },
      amount: { type: Sequelize.DECIMAL(12, 2) },
      purchase_order_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'purchase_orders',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('line_items');
  }
};


