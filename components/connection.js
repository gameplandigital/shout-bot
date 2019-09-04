"use strict";

var mysql = require("mysql");

var con = mysql.createConnection({
  host: "patsydb.com4k2xtorpw.ap-southeast-1.rds.amazonaws.com",
  user: "patsydigital01",
  password: "pAtsy06072018",
  database: "shout_db",
  multipleStatements: true
});

con.connect(function(err) {
  if (err) throw err;
  console.log("MySQL Connected!");
});

module.exports.connection = con;
