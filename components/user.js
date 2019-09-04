"use strict";

const request = require("request"),
  moment = require("moment-timezone"),
  config = require("../config.json"),
  conn = require("./connection");

let con = conn.connection;

moment.tz.setDefault("Asia/Manila");

var getUserData = (sender_psid, callback) => {
  request(
    {
      uri: `https:graph.facebook.com/${config.GRAPH_VERSION}/${sender_psid}`,
      qs: {
        fields: "picture.width(300),first_name,last_name",
        access_token: config.ACCESS_TOKEN
      },
      method: "GET"
    },
    (err, res, body) => {
      if (!err) {
        callback(body);
      }
    }
  );
};

 var saveUser = (sender_psid, action, callback) => {
   console.log("________________________________________________________________________________")
   con.query(
     "SELECT * FROM shout_users WHERE MessengerId = ?",
     [sender_psid],
     (error, result) => {
       if (error) throw err;
       if (result.length == 0) {
         getUserData(sender_psid, result => {
          console.log("+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++")
           const user = JSON.parse(result);
           con.query(
             "INSERT INTO shout_users (BotTag, MessengerId, Profile_pic, Fname, Lname, LastActive, FirstOptIn, LastClicked) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
             [
               "SHOUT",
               sender_psid,
               user.picture.data.url,
               user.first_name,
               user.last_name,
               moment().format("YYYY/MM/DD HH:mm:ss"),
               moment().format("YYYY/MM/DD HH:mm:ss"),
               action
             ],
             (error2, result2) => {
               if (error2) throw error2;
               if (result2.affectedRows > 0) {
                 callback({ success: true });
               } else {
                 callback({ success: false });
               }
             }
           );
         });
       } else if (result.length > 0) {
         let tag,
           hasTag = false;
         if (action === "QR_USER_AGREE") {
           tag = { HasDisclaimer: 1, TagDisclaimer: action };
           hasTag = true;
         } else if (action === "MENU_MAIN_MENU") {
           tag = { HomePayload: action };
           hasTag = true;
         } else if (action === "MENU_LOCATION") {
           tag = { locationTag: action };
           hasTag = true;
         } else if (action === "OPEN_SEND_CONCERN") {
           tag = { FaqTag: action };
           hasTag = true;
         } else if (action === "OPEN_SEND_CONCERN_SUCCESS") {
           tag = { FaqTag: action };
           hasTag = true;
         } else if (action === "OPEN_SEND_CONCERN_FAILED") {
           tag = { FaqTag: action };
           hasTag = true;
         } else if (action === "MENU_PROHIBITTED_ITEMS") {
           tag = { ProhibitedTag: action };
           hasTag = true;
         } else if (action === "MENU_MORE_RATE_1") {
           tag = { SatisfactionTag: action };
           hasTag = true;
         } else if (action === "MENU_MORE_RATE_2") {
           tag = { SatisfactionTag: action };
           hasTag = true;
         } else if (action === "MENU_MORE_RATE_3") {
           tag = { SatisfactionTag: action };
           hasTag = true;
         } else if (action === "MENU_MORE_RATE_4") {
           tag = { SatisfactionTag: action };
           hasTag = true;
         } else if (action === "MENU_MORE_RATE_5") {
           tag = { SatisfactionTag: action };
           hasTag = true;
         } else if (action === "MENU_INTERNATIONAL_SHIPPING_DOC") {
           tag = { IntlTag: action };
           hasTag = true;
         }

         con.query(
           "UPDATE shout_users SET LastActive = ?, LastClicked = ? WHERE BotTag = ? AND MessengerId = ?",
           [
             moment().format("YYYY/MM/DD HH:mm:ss"),
             action,
             "SHOUT",
             sender_psid
           ],
           (error2, result2) => {
             if (error2) throw error2;
             if (result2.affectedRows > 0) {
               callback({ success: true });
             } else {
               callback({ success: false });
             }
           }
         );

         if (hasTag) {
           con.query(
             "UPDATE shout_users SET ? WHERE BotTag = ? AND MessengerId = ?",
             [tag, "SHOUT", sender_psid],
             (error2, result2) => {
               if (error2) throw error2;
               if (result2.affectedRows > 0) {
                 console.log("Tag saved!");
               } else {
                 console.log("Tag saving failed!");
               }
             }
           );
         }
       } else {
         callback({ success: false });
       }
     }
   );
 };

var getBranches = (latitude, longitude, callback) => {
  con.query(
    'SELECT id, name, contacts, address, Mon, Tue, Wed, Thur, Fri, Sat, (6371 * acos(cos(radians("' +
      latitude +
      '")) * cos(radians(lat)) * cos(radians(lng) - radians("' +
      longitude +
      '")) + sin(radians("' +
      latitude +
      '")) * sin(radians(lat )))) AS distance FROM marker WHERE Tag = "AIR21" HAVING distance < 25 ORDER BY distance LIMIT 1;',
    function(err, result) {
      if (err) throw err;
      callback(result);
    }
  );
};


moment.tz.setDefault("Asia/Manila");

var getUserData1 = (sender_psid, callback) => {
  request(
    {
      uri: `https:graph.facebook.com/${config.GRAPH_VERSION}/${sender_psid}`,
      qs: {
        fields: "picture.width(300),first_name,last_name",
        access_token: config.ACCESS_TOKEN
      },
      method: "GET"
    },
    (err, res, body) => {
      if (!err) {
        callback(body);
      }
    }
  );
};


module.exports = {
  getUserData,
  saveUser,
  getBranches,
  getUserData1
};
