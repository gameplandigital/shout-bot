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
      composer_input_disabled: true,
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

  if (received_message.text === "") {
    senderAction(sender_psid, "typing_on");
  }

  callSendAPI(sender_psid, response);
};

// FUNCTION THAT HANDLE POSTBACKS
var handlePostback = (sender_psid, received_postback) => {
  let response;

  let payload = received_postback.payload;

  if (payload === "GET_STARTED") {
      callSendAPI(sender_psid, response);
      setTimeout(function() {
        senderAction(sender_psid, "typing_on");
        response = {
          text:
          "Your accessing of the Aircast Shout Bot indicates your understanding, agreement to and acceptance of the Fullterms and Condition and Privacy Policy of the Aircast Shout Bot. ",
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
  } else if (payload === "MENU_MAIN_MENU") {
    senderAction(sender_psid, "typing_on");
    response = {
      attachment: {
        type: "template",
        payload: {
          template_type: "generic",
          elements: [
            {
              title: "Package Status",
              subtitle: "Know your package whereabouts.\n",
              image_url: config.APP_URL + "/assets/packagestatus.png",
              buttons: [
                {
                  type: "web_url",
                  url:
                    config.APP_URL +
                    "/track-package?sender_psid=" +
                    sender_psid,
                  title: " Track Number",
                  webview_height_ratio: "tall",
                  messenger_extensions: "true"
                }
              ]
            },
            {
              title: "Find Nearest Business Hub",
              subtitle: "Looking for our branches? We can guide you.",
              image_url: config.APP_URL + "/assets/findnearestbranch.png",
              buttons: [
                {
                  type: "web_url",
                  url: "https://docdro.id/IX2GLen",
                  title: "View list of hubs",
                  webview_height_ratio: "tall",
                  messenger_extensions: "true"
                },
                {
                  type: "postback",
                  title: "Send my location",
                  payload: "MENU_LOCATION"
                },
                {
                  type: "postback",
                  title: "Probihited Items",
                  payload: "MENU_PROHIBITTED_ITEMS"
                }

              ]
            },
            {
              title: "International Shipping",
              subtitle: "Send international.",
              image_url: config.APP_URL + "/assets/internationashipping.png",
              buttons: [
                {
                  type: "postback",
                  title: "Documents ",
                  payload: "MENU_INTERNATIONAL_SHIPPING_DOC"
                },
                {
                  type: "postback",
                  title: "Non Documents ",
                  payload: "MENU_INTERNATIONAL_SHIPPING_NODOC"
                }
              ]
            },
            {
              title: "More",
              subtitle:
                "Still got questions? Learn more and find the answers here.",
              image_url: config.APP_URL + "/assets/more.png",
              buttons: [
                {
                  type: "postback",
                  title: "Learn More ",
                  payload: "MENU_MORE"
                }
              ]
            }
          ]
        }
      }
    };
    callSendAPI(sender_psid, response);
  } else if (payload === "MENU_LOCATION") {
    senderAction(sender_psid, "typing_on");
    response = {
      text:
        "Click send location to recommend the nearest AIR21 Branch.\n(Please make sure to turn on your GPS Location for better results)",
      quick_replies: [
        {
          content_type: "location"
        },
        {
          content_type: "text",
          title: "Back to Main Menu",
          payload: "MENU_MAIN_MENU"
        }
      ]
    };
    callSendAPI(sender_psid, response);
  } else if (payload === "MENU_PROHIBITTED_ITEMS") {
    senderAction(sender_psid, "typing_on");
    response = {
      text:
        "PROHIBITED ITEMS\n\n1. Explosives of any kind (Liquid, Solid, or Gas)\n2. Any article or substance, as presented for transport, which is liable to produce a dangerous evolution of heat or gas under the conditions normally encountered in air transport,\n3. Flammable solids and organic peroxides having, as tested, explosives properties, which are packed in such a way that the classification procedure would require the use of an explosives label as a subsidiary risk label\n4. Wet or dry ice\n5. Lottery tickets\n6. Money (Coins, Currency, Paper Money and Negotiable Instruments equivalent to cash such as endorsed stocks, bonds, and cash letters) \n7. Jewelries\n8. Replica or fake \n9. Live animals and plants \n10. Any shipment whose carriage is prohibited by Philippine law, statutes or regulations \n\n* Subject to Airline policy changes.",
      quick_replies: [
        {
          content_type: "text",
          title: "Back to Main Menu",
          payload: "MENU_MAIN_MENU"
        }
      ]
    };
    callSendAPI(sender_psid, response);
  } else if (payload === "MENU_INTERNATIONAL_SHIPPING_DOC") {
    senderAction(sender_psid, "typing_on");
    response = {
      text:
        "For International Shipping please visit our nearest Business Hub.\nhttps://www.air21.ph/locations/\n\nEmail address (PML)\ninternational@af2100.com",
      quick_replies: [
        {
          content_type: "text",
          title: "Back to Main Menu",
          payload: "MENU_MAIN_MENU"
        }
      ]
    };
    callSendAPI(sender_psid, response);
  } else if (payload === "MENU_INTERNATIONAL_SHIPPING_NODOC") {
    senderAction(sender_psid, "typing_on");
    response = {
      text:
        "AIR21\nIf existing package, call UPS hotline.\n\nhttps://www.air21.ph/locations/",
      quick_replies: [
        {
          content_type: "text",
          title: "Back to Main Menu",
          payload: "MENU_MAIN_MENU"
        }
      ]
    };
    callSendAPI(sender_psid, response);
  } else if (payload === "MENU_MORE") {
    senderAction(sender_psid, "typing_on");
    response = {
      attachment: {
        type: "template",
        payload: {
          template_type: "generic",
          elements: [
            {
              title: "Franchise",
              subtitle:
                "Build your business with us. Fill-out this franchise form.",
              image_url: config.APP_URL + "/assets/franchise.png",
              default_action: {
                type: "web_url",
                url: "https://www.air21.ph/Franchise%20Form.pdf",
                webview_height_ratio: "full",
                messenger_extensions: true
              },
              buttons: [
                {
                  title: "Learn more",
                  type: "web_url",
                  url: "https://www.air21.ph/Franchise%20Form.pdf",
                  webview_height_ratio: "full",
                  messenger_extensions: true
                }
              ]
            },
            {
              title: "Career",
              subtitle:
                "Build your career with the Lina Group of Companies. Job vacancies are available at http://www.lina-group.com/careers",
              image_url: config.APP_URL + "/assets/career.png",
              default_action: {
                type: "web_url",
                url: "https://www.lina-group.com/careers",
                webview_height_ratio: "tall",
                messenger_extensions: true
              },
              buttons: [
                {
                  title: "Learn more",
                  type: "web_url",
                  url: "https://www.lina-group.com/careers",
                  webview_height_ratio: "tall",
                  messenger_extensions: true
                }
              ]
            },
            {
              title: "Review",
              subtitle:
                "Your feedback is important to us. How did we do today?",
              image_url: config.APP_URL + "/assets/review.png",
              buttons: [
                {
                  type: "postback",
                  title: "Rate Me",
                  payload: "MENU_MORE_RATE"
                }
              ]
            },
            {
              title: "Concerns",
              subtitle: "Your concern will help us to improve our ability\n",
              image_url: config.APP_URL + "/assets/concerns.png",
              buttons: [
                {
                  type: "web_url",
                  url:
                    config.APP_URL + "/send-concern?sender_psid=" + sender_psid,
                  title: "Send Concerns",
                  webview_height_ratio: "tall",
                  messenger_extensions: true
                }
              ]
            }
          ]
        }
      }
    };
    callSendAPI(sender_psid, response);
  } else if (payload === "MENU_MORE_RATE") {
    senderAction(sender_psid, "typing_on");
    response = {
      text: "Rate us based on your experience",
      quick_replies: [
        {
          content_type: "text",
          title: "🌟",
          payload: "MENU_MORE_RATE_1"
        },
        {
          content_type: "text",
          title: "🌟🌟",
          payload: "MENU_MORE_RATE_2"
        },
        {
          content_type: "text",
          title: "🌟🌟🌟",
          payload: "MENU_MORE_RATE_3"
        },
        {
          content_type: "text",
          title: "🌟🌟🌟🌟",
          payload: "MENU_MORE_RATE_4"
        },
        {
          content_type: "text",
          title: "🌟🌟🌟🌟🌟",
          payload: "MENU_MORE_RATE_5"
        }
      ]
    };
    callSendAPI(sender_psid, response);
  }

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
      "👋,\n\nWelcome!\n. I am the Aircast shout bot. Choose the promo you want on the menu below so we can procede. 😉",
      attachment: {
        type: "template",
        payload: {
          template_type: "generic",
          elements: [
            {
              title: "Package Status",
              subtitle: "Know your package whereabouts.\n",
              image_url: config.APP_URL + "/assets/packagestatus.png",
              buttons: [
                {
                  type: "web_url",
                  url:
                    config.APP_URL +
                    "/track-package?sender_psid=" +
                    sender_psid,
                  title: " Track Number",
                  webview_height_ratio: "tall",
                  messenger_extensions: "true"
                }
              ]
            },
          ]
        }
      }
    };
  });
    callSendAPI(sender_psid, response);
  } else if (payload === "MENU_MORE_RATE_1") {
    senderAction(sender_psid, "typing_on");
    response = {
      text:
        "Rated us 1 star, Thank you for your response! Your feedback helps us to continuously improve our services.",
      quick_replies: [
        {
          content_type: "text",
          title: "Back to Main Menu",
          payload: "MENU_MAIN_MENU"
        }
      ]
    };
    callSendAPI(sender_psid, response);
  } else if (payload === "MENU_MORE_RATE_2") {
    senderAction(sender_psid, "typing_on");
    response = {
      text:
        "Rated us 2 stars, Thank you for your response! Your feedback helps us to continuously improve our services.",
      quick_replies: [
        {
          content_type: "text",
          title: "Back to Main Menu",
          payload: "MENU_MAIN_MENU"
        }
      ]
    };
    callSendAPI(sender_psid, response);
  } else if (payload === "MENU_MORE_RATE_3") {
    senderAction(sender_psid, "typing_on");
    response = {
      text:
        "Rated us 3 stars, Thank you for your response! Your feedback helps us to continuously improve our services.",
      quick_replies: [
        {
          content_type: "text",
          title: "Back to Main Menu",
          payload: "MENU_MAIN_MENU"
        }
      ]
    };
    callSendAPI(sender_psid, response);
  } else if (payload === "MENU_MORE_RATE_4") {
    senderAction(sender_psid, "typing_on");
    response = {
      text:
        "Rated us 4 stars, Thank you for your response! Your feedback helps us to continuously improve our services.",
      quick_replies: [
        {
          content_type: "text",
          title: "Back to Main Menu",
          payload: "MENU_MAIN_MENU"
        }
      ]
    };
    callSendAPI(sender_psid, response);
  } else if (payload === "MENU_MORE_RATE_5") {
    senderAction(sender_psid, "typing_on");
    response = {
      text:
        "Rated us 5 stars, Thank you for your response! Your feedback helps us to continuously improve our services.",
      quick_replies: [
        {
          content_type: "text",
          title: "Back to Main Menu",
          payload: "MENU_MAIN_MENU"
        }
      ]
    };
    callSendAPI(sender_psid, response);
  } else if (payload === "MENU_MAIN_MENU") {
    senderAction(sender_psid, "typing_on");
    response = {
      attachment: {
        type: "template",
        payload: {
          template_type: "generic",
          elements: [
            {
              title: "Package Status",
              subtitle: "Know your package whereabouts.\n",
              image_url: config.APP_URL + "/assets/packagestatus.png",
              buttons: [
                {
                  type: "web_url",
                  url:
                    config.APP_URL +
                    "/track-package?sender_psid=" +
                    sender_psid,
                  title: " Track Number",
                  webview_height_ratio: "tall",
                  messenger_extensions: "true"
                }
              ]
            },
            {
              title: "Find Nearest Business Hub",
              subtitle: "Looking for our branches? We can guide you.",
              image_url: config.APP_URL + "/assets/findnearestbranch.png",
              buttons: [
                {
                  type: "web_url",
                  url: "https://docdro.id/IX2GLen",
                  title: "View list of hubs",
                  webview_height_ratio: "tall",
                  messenger_extensions: "true"
                },
                {
                  type: "postback",
                  title: "Send my location",
                  payload: "MENU_LOCATION"
                },
                {
                  type: "postback",
                  title: "Probihited Items",
                  payload: "MENU_PROHIBITTED_ITEMS"
                }
              ]
            },
            {
              title: "International Shipping",
              subtitle: "Send international.",
              image_url: config.APP_URL + "/assets/internationashipping.png",
              buttons: [
                {
                  type: "postback",
                  title: "Documents ",
                  payload: "MENU_INTERNATIONAL_SHIPPING_DOC"
                },
                {
                  type: "postback",
                  title: "Non Documents ",
                  payload: "MENU_INTERNATIONAL_SHIPPING_NODOC"
                }
              ]
            },
            {
              title: "More",
              subtitle:
                "Still got questions? Learn more and find the answers here.",
              image_url: config.APP_URL + "/assets/more.png",
              buttons: [
                {
                  type: "postback",
                  title: "Learn More ",
                  payload: "MENU_MORE"
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
        url: "https://maps.googleapis.com/maps/api/geocode/json",
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
              "Ops! Something went wrong finding the nearest branch for you. Try again later.",
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
      "https://air21.ph",
      "https://www.air21.ph",
      "https://www.lina-group.com",
      "https://air21mail.herokuapp.com",
      "https://air21bot.palmsolutions.co",
      "https://google.com",
      "https://accounts.google.com",
      "https://docdro.id/IX2GLen"
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

