"use strict";
const { Model } = require("sequelize");
const { v4: uuidv4 } = require("uuid");

module.exports = (sequelize, DataTypes) => {
  class LineItem extends Model {
    static associate(models) {
      LineItem.belongsTo(models.PurchaseOrder, {
        foreignKey: "purchase_order_id",
        as: "purchase_order",
      });
    }
  }

  LineItem.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      description: DataTypes.TEXT,
      quantity: DataTypes.INTEGER,
      rate: DataTypes.DECIMAL(12, 2),
      amount: DataTypes.DECIMAL(12, 2),
      gst: DataTypes.DECIMAL(5, 2), // NEW FIELD
    },
    {
      sequelize,
      modelName: "LineItem",
      tableName: "line_items",
    }
  );

  LineItem.beforeCreate((item) => {
    item.id = uuidv4();
  });

  return LineItem;
};


