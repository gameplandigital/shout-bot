"use strict";

const express = require("express"),
  bodyParser = require("body-parser"),
  request = require("request"),
  path = require("path"),
  cors = require("cors"),
  config = require("./config.json"),
  user = require("./components/user"),
  conn = require("./components/connection"),
  mysql = require("mysql");
  
  let app = express();

  let con = conn.connection;
  

//View Engine
app.set("view engine", "ejs");
app.set("public", path.join(__dirname, "public"));

//Body Parser Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(cors());
app.use(function(req, res, next) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "POST, GET, PATCH, DELETE, OPTIONS"
  );
  res.setHeader("X-Frame-Options", "ALLOW-FROM https://www.messenger.com/");
  res.setHeader("X-Frame-Options", "ALLOW-FROM https://www.facebook.com/");
  res.setHeader("Access-Control-Allow-Credentials", true);
  next();
});


//Set Static Path
app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(path.join(__dirname, "views")));

 app.get("/send-concern", (req, res) => {
  const sender_psid = req.query.sender_psid;
  res.render("send-concern", { sender_psid });
});

app.get("/marital-status", (req, res) => {
  const sender_psid = req.query.sender_psid;
  res.render("marital-status", { sender_psid });
});


var getConnection =  mysql.createConnection({
    host: "patsydb.com4k2xtorpw.ap-southeast-1.rds.amazonaws.com",
    user: "patsydigital01",
    password: "pAtsy06072018",
    database: "patsy_db",
    multipleStatements: true
  });
  
  getConnection.connect();

app.post("/save-action", (req, res) => {
  const { sender_psid, payload } = req.body;
  if (payload === "OPEN_SEND_CONCERN_SUCCESS") {
    const message = {
      text: "Thanks! We'll get back to you soon :)",
      quick_replies: [
        {
          content_type: "text",
          title: "Back to Main Menu",
          payload: "MENU_MAIN_MENU"
        }
      ]
    };
    callSendAPI(sender_psid, message);
  }

  user.saveUser(sender_psid, payload, result => {
    if (result.success) {
      res.status(200).send({ success: true });
    } else {
      res.status(200).send({ success: false });
    }
  });
});



const SERVER_URL = "https://rfc-bot.herokuapp.com/"
console.log(SERVER_URL)



//MAIN MENU
const mainMenu = {
  "persistent_menu": [
    {
        "locale": "default",
        "composer_input_disabled": false,
        "call_to_actions": [
            {
                "type": "postback",
                "title": "MAIN MENU",
                "payload": "MENU_MAIN_MENU"
            },
        ]
     }
  ]
 };
 // END MAIN MENU

 var senderAction = (sender_psid, action) => {
  let request_body = {
    recipient: {
      id: sender_psid
    },
    sender_action: action
  };

  request(
    {
      uri: `https://graph.facebook.com/${config.GRAPH_VERSION}/me/messages`,
      qs: {
        access_token: config.ACCESS_TOKEN
      },
      method: "POST",
      json: request_body
    },
    (err, res, body) => {
      if (!err) {
        console.log(body);
        console.log("Action sent!");
      } else {
        console.error("Unable to send action:" + err);
      }
    }
  );
 };

 var callSendAPI = (sender_psid, response) => {
  let request_body = {
    recipient: {
      id: sender_psid
    },
    message: response
  };

  request(
    {
      uri: `https://graph.facebook.com/${config.GRAPH_VERSION}/me/messages`,
      qs: {
        access_token: config.ACCESS_TOKEN
      },
      method: "POST",
      json: request_body
    },
    (err, res, body) => {
      if (!err) {
        console.log(body);
        console.log("Message sent!");
        senderAction(sender_psid, "typing_off");
      } else {
        console.error("Unable to send message:" + err);
      }
    }
  );
 };

 // FUNCTION THAT HANDLE MESSAGES
 var handleMessage = (sender_psid, received_message) => {
  let response;
  var user_input = received_message.text;

  if (user_input){
    switch (user_input){
      case '0001':
        promo1(sender_psid);
        break;
      case '0002':
        promo2(sender_psid);
        break;
    }
  }

};


function promo1(sender_psid){
  let response;
    console.log("----- PROMO 1 WORKING -----")
    user.getUserData(sender_psid, result => {
    const user = JSON.parse(result);
      senderAction(sender_psid, "typing_on");
        response = {   
          text: "🎉 CONGRATULATIONS" + user.name + "!! 🎉"
        }
      callSendAPI(sender_psid, response);

    setTimeout(function(){     
      senderAction(sender_psid, "typing_on");
        response = {   
          text: "You just won your first promo."
        }
      callSendAPI(sender_psid, response);
    }, 1500);

    setTimeout(function(){     
      senderAction(sender_psid, "typing_on");
        response = {   
          text: "Click the card below to claim 👇"
        }
      callSendAPI(sender_psid, response);
    }, 1800);

    setTimeout(function(){     
      senderAction(sender_psid, "typing_on");
       response = {
        attachment: {
          type: "template",
            payload: {
            template_type: "media",
              elements: [
                 {
                  media_type: "image",
                  url: "https://www.facebook.com/photo.php?fbid=450066978929263&set=a.450031398932821&type=3&theater",
                  buttons: [
                    {
                      type: "web_url",
                      url: "www.google.com",
                      title: "Claim promo",
                    }
                  ]              
                }
              ]
            }
          }           
        };
       callSendAPI(sender_psid, response);
      }, 2000);
      });
    
}

function handleAddress(sender_psid, received_message){
  var user_input = received_message.text;

  senderAction(sender_psid, "typing_on");
  response = {
    text: "!! INPUT !!" + user_input.text
  }
    callSendAPI(sender_psid, response);
}


 // FUNCTION THAT HANDLE POSTBACKS
 var handlePostback = (sender_psid, received_postback) => {
  let response;
  let payload = received_postback.payload;


  if (payload === "GET_STARTED") {
    user.getUserData(sender_psid, result => {
      const user = JSON.parse(result);
      setTimeout(function() {
      senderAction(sender_psid, "typing_on");
      response = {
        text: "Your accessing of the Aircast Shout Bot indicates your understanding, agreement to and acceptance of the Fullterms and Condition and Privacy Policy of the Aircast Shout Bot. ",
          quick_replies: [
            {
              content_type: "text",
              title: "I Agree.",
              payload: "QR_USER_AGREE"
            }
          ]
      };
      callSendAPI(sender_psid, response);
    }, 1000);

    user.saveUser(sender_psid, "QR_USER_AGREE", result => {
      if (result.success) {
        console.log(
          `Messenger ID ${sender_psid} action saved to the database.`
        );
      }
    });

  });


// ------- SAVE ACTION TO DATABASE ------- //
  user.saveUser(sender_psid, payload, result => {
    if (result.success) {
      console.log(`Messenger ID ${sender_psid} action saved to the database.`);
        }
      });
    };


}




var handleQuickReply = (sender_psid, received_postback, received_message, callback) => {
  let response;
  let payload = received_postback.payload;

  if (payload === "QR_USER_AGREE") {
    user.getUserData(sender_psid, result => {
    const user = JSON.parse(result);
    senderAction(sender_psid, "typing_on");
    response = {
      text:
      "Hi! " +
      user.first_name +
      " 👋,\n\nWelcome!!.\nI am the Aircast shout bot. Choose the promo you want on the menu below so we can proceed 😉",
    };
    callSendAPI(sender_psid, response);
  });


// ------- SAVE ACTION TO DATABASE ------- //
  user.saveUser(sender_psid, payload, result => {
    if (result.success) {
      console.log(`Messenger ID ${sender_psid} action saved to the database.`);
        }
      });

  };
}


// --------------  TO SEND LOCATION -------------------------------
var handleAttachments = (sender_psid, received_postback) => {
  let response;
  const type = received_postback[0].type;

  if (type === "location") {
    const latitude = received_postback[0].payload.coordinates.lat,
      longitude = received_postback[0].payload.coordinates.long;

          user.getBranches(latitude, longitude, result => {
            response = {
              text:
                "Nearest Branch: " +
                result[0].name +
                "\nAddress: " +
                result[0].address +
                "\nDistance: " +
                result[0].distance.toFixed(1) +
                " km",
              quick_replies: [
                {
                  content_type: "text",
                  title: "Back to Main Menu",
                  payload: "MENU_MAIN_MENU"
                }
              ]
            };
            callSendAPI(sender_psid, response);
          }
        );
      }
};

// CREATE THE PERSISTENT MENU
var persistentMenu = () => {
  request(
    {
      uri: `https://graph.facebook.com/${
        config.GRAPH_VERSION
      }/me/messenger_profile`,
      qs: {
        access_token: config.ACCESS_TOKEN
      },
      method: "POST",
      json: mainMenu
    },
    (err, res, body) => {
      if (!err) {
        console.log("Persistent menu successfully created.");
      } else {
        console.log("Unable to create persistent menu");
      }
    }
  );
};

// CREATE THE GET STARTED BUTTON
var getStarted = () => {
  let menu = {
    get_started: {
      payload: "GET_STARTED"
    },
    whitelisted_domains: [
      config.APP_URL,
      "https://google.com",
      "https://accounts.google.com",
      "https://rfc-bot.herokuapp.com/",
      "https://patsy-official-dashboard.herokuapp.com/counter.php"
        ]
  };

  request(
    {
      uri: `https://graph.facebook.com/${
        config.GRAPH_VERSION
      }/me/messenger_profile`,
      qs: {
        access_token: config.ACCESS_TOKEN
      },
      method: "POST",
      json: menu
    },
    (err, res, body) => {
      if (!err) {
        persistentMenu();
        console.log("Get started button successfully created.");
      } else {
        console.log("Unable to create get started button");
      }
    }
  );
};
getStarted();

// WEBHOOK END POINT
app.post("/webhook", (req, res) => {
  let body = req.body;
  if (body.object === "page") {
    body.entry.forEach(function(entry) {
      let webhook_event = entry.messaging[0];
      let sender_psid = webhook_event.sender.id;
      senderAction(sender_psid, "mark_seen");

        if (webhook_event.message) {
          handleMessage(sender_psid, webhook_event.message);
        if (webhook_event.message.quick_reply) {
          handleQuickReply(sender_psid, webhook_event.message.quick_reply);
        } else if (webhook_event.message.attachments) {
          handleAttachments(sender_psid, webhook_event.message.attachments);
        }
        } else if (webhook_event.postback) {
        handlePostback(sender_psid, webhook_event.postback);
        } else if (webhook_event.postback) {
        handleAddress(sender_psid, webhook_event.message);
        }
    });
    res.send("EVENT_RECEIVED");
  } else {
    res.sendStatus(404);
  }
});

// WEBHOOK VERIFICATION
app.get("/webhook", (req, res) => {
  let VERIFY_TOKEN = config.VERIFY_TOKEN;
  let mode = req.query["hub.mode"];
  let token = req.query["hub.verify_token"];
  let challenge = req.query["hub.challenge"];
  console.log(req.query);

  if (mode && token) {
    if (mode == "subscribe" && token == VERIFY_TOKEN) {
      console.log("WEBHOOK_VERIFIED");
      res.send(challenge);
      res.status(200).send(challenge);
    }
  } else {
    res.sendStatus(404);
  }
});

app.listen(process.env.PORT || 1337, () => {
  console.log("Server is now running.");
});

app.get("/", function(req, res){
    res.send("WEBHOOK WORKING")
});

app.get("/name", function(req, res){
  res.render("views/name");
});