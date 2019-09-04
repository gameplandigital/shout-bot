"use strict";

const express = require("express"),
  bodyParser = require("body-parser"),
  request = require("request"),
  path = require("path"),
  cors = require("cors"),
  config = require("./config.json"),
  user = require("./components/user");

let app = express();

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

app.get("/send-concern", (req, res) => {
  const sender_psid = req.query.sender_psid;
  res.render("send-concern", { sender_psid });
});

app.post("/send-concern", (req, res) => {
  const first_name = req.body.first_name,
    last_name = req.body.last_name,
    email = req.body.email,
    message = req.body.message;
  request(
    {
      method: "POST",
      url: "https://gpdigital-mailer.herokuapp.com/air21.php",
      json: { first_name, last_name, email, message }
    },
    (error, response, body) => {
      if (!error && body.success) {
        res.send({ success: true });
      } else {
        res.send({ success: false });
      }
    }
  );
});

app.get("/track-package", (req, res) => {
  const sender_psid = req.query.sender_psid;
  res.render("track-package", { sender_psid });
});

app.post("/track-package", (req, res) => {
  const tracking_number = req.body.tracking_number;
  request(
    {
      method: "GET",
      url: "https://www.air21.ph/api.php",
      qs: {
        awb: tracking_number
      }
    },
    (err, response, body) => {
      if (!err) {
        res.send({ success: true, data: body });
      } else {
        res.send({ success: false });
      }
    }
  );
});

app.post("/save-action", (req, res) => {
  const sender_psid = req.body.sender_psid,
    payload = req.body.payload;

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
      res.send({ success: true });
    } else {
      res.send({ success: false });
    }
  });
});

const mainMenu = {
  persistent_menu: [
    {
      locale: "default",
      composer_input_disabled: false,
      call_to_actions: [
        {
          title: "Main Menu",
          type: "postback",
          payload: "MENU_MAIN_MENU"
        }
      ]
    }
  ]
};

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
    
  user.getUserData(sender_psid, result => {
    const user = JSON.parse(result);
    setTimeout(function(){     
      senderAction(sender_psid, "typing_on");
      response = {   
        text: "🎉 CONGRATULATIONS!! 🎉"
      }
      callSendAPI(sender_psid, response);
    }, 2000);

    setTimeout(function(){     
      senderAction(sender_psid, "typing_on");
      response = {   
        text: "You just won your first promo " + user.name + "!!"
      }
      callSendAPI(sender_psid, response);
    }, 2300);
    console.log("____WORKING_________")

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
  });

}






// FUNCTION THAT HANDLE POSTBACKS
var handlePostback = (sender_psid, received_postback) => {
  let response;
  let payload = received_postback.payload;

  if (payload === "GET_STARTED") {
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
    }

 // ---------------------------- PROMO_1 ---------------------------------
      else if (payload == "PROMO_1") {
        console.log("----- PROMO 1 WORKING -----")
        senderAction(sender_psid, "typing_on");
          response = {   
            text: "🎉 CONGRATULATIONS!! 🎉"
          }
        callSendAPI(sender_psid, response);

        senderAction(sender_psid, "typing_on");
          response = {   
            text: "You just won your first promo " + user.name + "!!"
          }
        callSendAPI(sender_psid, response);

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
      }





    user.saveUser(sender_psid, "QR_USER_AGREE", result => {
      if (result.success) { 
        console.log(`Messenger ID ${sender_psid} action saved to the database.`);
       }
      });


  user.saveUser(sender_psid, payload, result => {
    if (result.success) {
      console.log(`Messenger ID ${sender_psid} action saved to the database.`);
        }
      });
    };





var handleQuickReply = (sender_psid, received_postback) => {
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

    senderAction(sender_psid, "typing_on");
    response = {
      attachment: {
        type: "template",
        payload: {
          template_type: "generic",
          elements: [
            {
              title: "Promo 1",
              subtitle:
                "Participate to win the prize",
              image_url: config.APP_URL + "/images/1.png",
              buttons: [
                {
                  type: "postback",
                  title: "Let's go",
                  payload: "PROMO_1"
                }
              ]
            },
            {
              title: "Promo 2",
              subtitle:
                "Participate to win the prize",
              image_url: config.APP_URL + "/images/2.png",
              buttons: [
                {
                  type: "postback",
                  title: "Let's go",
                  payload: "PROMO_2"
                }
              ]
            }
          ]
        }
      }
    };
    callSendAPI(sender_psid, response);
   }

  else if (payload === "MENU_MAIN_MENU") {
    user.getUserData(sender_psid, result => {
    const user = JSON.parse(result);
    senderAction(sender_psid, "typing_on");
    response = {
      text:
      "Hi! " + user.first_name + " 👋,\n\nWelcome!!.\nI am the Aircast shout bot. Choose the promo you want on the menu below so we can proceed 😉",
        };
        callSendAPI(sender_psid, response);
      });

        senderAction(sender_psid, "typing_on");
        response = {
          attachment: {
            type: "template",
            payload: {
              template_type: "generic",
              elements: [
                {
                  title: "Promo 1",
                  subtitle:
                    "Participate to win the prize",
                  image_url: config.APP_URL + "/images/1.png",
                  buttons: [
                    {
                      type: "postback",
                      title: "Let's go",
                      payload: "PROMO_1"
                    }
                  ]
                },
                {
                  title: "Promo 2",
                  subtitle:
                    "Participate to win the prize",
                  image_url: config.APP_URL + "/images/2.png",
                  buttons: [
                    {
                      type: "postback",
                      title: "Let's go",
                      payload: "PROMO_2"
                    }
                  ]
                }
              ]
            }
          }
        };
        callSendAPI(sender_psid, response);

  }





  user.saveUser(sender_psid, payload, result => {
    if (result.success) {
      console.log(`Messenger ID ${sender_psid} action saved to the database.`);
    }
  });
};







var handleAttachments = (sender_psid, received_postback) => {
  let response;
  const type = received_postback[0].type;

  if (type === "location") {
    const latitude = received_postback[0].payload.coordinates.lat,
      longitude = received_postback[0].payload.coordinates.long;
    request(
      {
        method: "GET",
        url: "https:maps.googleapis.com/maps/api/geocode/json",
        qs: {
          latlng: latitude + "," + longitude,
          key: config.GOOGLE_KEY
        }
      },
      (err, res, body) => {
        if (!err) {
          const results = body.results;
          let loc = {
            address: ""
          };

          user.getBranches(latitude, longitude, result => {
            let location = "";
            for (var i = 0; i < result.length; i++) {
              location +=
                "Nearest Branch: " +
                result[i].name +
                "\nAddress: " +
                result[i].address +
                "\nDistance: " +
                result[i].distance.toFixed(1) +
                " km\n\n";
            }
            response = {
              text: location,
              quick_replies: [
                {
                  content_type: "text",
                  title: "Back to Main Menu",
                  payload: "MENU_MAIN_MENU"
                }
              ]
            };
            callSendAPI(sender_psid, response);
          });
        } else {
          response = {
            text:
              "Ops! Something went wrong finding the nearest Aircast for you. Try again later.",
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
      "https://accounts.google.com"
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
      console.log("ENTRY: " + JSON.stringify(entry));
      console.log("ENTRY MESSAGING: " + JSON.stringify(entry.messaging));
      let webhook_event = entry.messaging[0];
      let sender_psid = webhook_event.sender.id;
      console.log("Sender PSID:" + sender_psid);

      senderAction(sender_psid, "mark_seen");

      if (webhook_event.message) {
        // handleMessage(sender_psid, webhook_event.message);
        if (webhook_event.message.quick_reply) {
          handleQuickReply(sender_psid, webhook_event.message.quick_reply);
        } else if (webhook_event.message.attachments) {
          handleAttachments(sender_psid, webhook_event.message.attachments);
        }
      } else if (webhook_event.postback) {
        handlePostback(sender_psid, webhook_event.postback);
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
    }
  } else {
    res.sendStatus(404);
  }
});

app.listen(process.env.PORT || 1101, () => {
  console.log("Server is now running.");
});

app.get("/", function(req, res){
    res.send("WEBHOOK WORKING")
});

