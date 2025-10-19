"use strict";
const { Model } = require("sequelize");
const { v4: uuidv4 } = require("uuid");

module.exports = (sequelize, DataTypes) => {
  class PurchaseOrder extends Model {
    static associate(models) {
      PurchaseOrder.hasMany(models.LineItem, {
        foreignKey: "purchase_order_id",
        as: "line_items",
      });
    }
  }

  PurchaseOrder.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },

      company_name: DataTypes.STRING,
      company_address: DataTypes.TEXT,
      company_city_state_zip: DataTypes.STRING,
      company_country: DataTypes.STRING,

      vendor_name: DataTypes.STRING,
      vendor_address: DataTypes.TEXT,
      vendor_city_state_zip: DataTypes.STRING,
      vendor_country: DataTypes.STRING,

      po_number: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      order_date: DataTypes.DATE,
      delivery_date: DataTypes.DATE,

      sub_total: DataTypes.DECIMAL(12, 2),
      tax_rate: DataTypes.DECIMAL(5, 2),
      tax_amount: DataTypes.DECIMAL(12, 2),
      total: DataTypes.DECIMAL(12, 2),
    },
    {
      sequelize,
      modelName: "PurchaseOrder",
      tableName: "purchase_orders",
    }
  );

  PurchaseOrder.beforeCreate((order) => {
    order.id = uuidv4();
  });

  return PurchaseOrder;
};


