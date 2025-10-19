"use strict";

const fs = require("fs");
const path = require("path");
const { Sequelize, DataTypes } = require("sequelize");
require("dotenv").config({ path: path.join(__dirname, "../../../.env") });

const env = process.env.NODE_ENV || "development";
const config = require("../../database/config/config")[env];

let sequelize;
if (config.use_env_variable) {
  sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
  sequelize = new Sequelize(
    config.database,
    config.username,
    config.password,
    config
  );
}

const db = {};

const modelsDir = path.join(__dirname);
fs.readdirSync(modelsDir)
  .filter((file) => file !== "index.js" && file.endsWith(".js"))
  .forEach((file) => {
    const model = require(path.join(modelsDir, file))(sequelize, DataTypes);
    db[model.name] = model;
  });

// Load PO models in subfolder
const poModelsDir = path.join(__dirname, "po");
if (fs.existsSync(poModelsDir)) {
  fs.readdirSync(poModelsDir)
    .filter((file) => file.endsWith(".js"))
    .forEach((file) => {
      const model = require(path.join(poModelsDir, file))(sequelize, DataTypes);
      db[model.name] = model;
    });
}

Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;


