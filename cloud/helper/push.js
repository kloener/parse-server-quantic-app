/**
 * Push Helper.
 *
 * More easy way to send your Push notifications.
 */
var _ = require("cloud/lodash");
var participantHelper = require('cloud/helper/participant.js');
var userHelper = require('cloud/helper/user.js');
var defaultExpirationTime = new Date( (new Date()).getTime() + (30/*seconds*/ * 1000) );

module.exports.pushConversationMessage = pushConversationMessage;
module.exports.pushConversationAdded = pushConversationAdded;

module.exports.resetBadge = resetBadge;
module.exports.setBadge = setBadge;
module.exports.getBadge = getBadge;

/**
 * sends a push message for a new message in conversation.
 *
 * @date   2016-01-26
 *
 * @param  ParseObject   conversation The conversation where the message was sent to.
 * @param  ParseObject   message the new message object
 * @param  ParseObject   author the original author of the message.
 *
 * @return promise
 */
function pushConversationMessage(conversation, message, author) {
  // enable master key to access installation table in parse.
  Parse.Cloud.useMasterKey();

  var users = participantHelper.getAllUsers(conversation);
  var pushQuery = new Parse.Query(Parse.Installation);

  // remove the author. He knows his message, so he don't need a push.
  /*_.remove(users, function(_user) {
    return author.id === _user.id;
  });*/

  pushQuery.containedIn('user', users);

  pushQuery.count()
  .then(function(count) {
    console.log("Push the notification to "+count+" devices.");
  }, function() {
    console.error(JSON.stringify(arguments));
  });

  var contentText;
  if(typeof message == "object")
    contentText = message.get("contentText");
  else
    // handle direct strings, too.
    contentText = message;

  var pushMessage = "";
  if(author) {
    pushMessage += getFullNameOf(author.get("email"), author.get("firstName"), author.get("lastName")) + ": ";
  }

  if(contentText.length > 80)
    contentText = contentText.substr(0, 76) + " ...";

  pushMessage += contentText;

  return Parse.Push.send({
    where: pushQuery,
    // channels: [ "MVP_Beta_Test" ],
    expiration_time: defaultExpirationTime,
    data: {
      alert: pushMessage,
      badge: "Increment",
      category: "Neue Nachricht",
      sound: "default"
    }
  });
}

/**
 * returns the full name of a user by the given first and surname.
 * If both are empty or null, the email address will be returned.
 *
 * @date   2016-02-02
 *
 * @param  string   email
 * @param  string   firstname optional
 * @param  string   surname   optional
 *
 * @return string
 */
function getFullNameOf(email, firstname, surname) {
  var fullname = "";
  if(firstname != null && firstname.length > 0) {
    fullname += firstname;
  }
  if(surname != null && surname.length > 0) {
    if(fullname != "") {
      fullname += " "; // add space between first- and surname
    }
    fullname += surname;
  }

  if(fullname == "") {
    return email;
  }

  return fullname;
}

/**
 * the message should inform users about new workspaces/conversations
 * added to their account.
 *
 * @date   2016-01-27
 *
 * @param  ParseObject   conversation
 *
 * @return promise
 */
function pushConversationAdded(conversation, invitedUserEmail) {
  var promise = new Parse.Promise();
  /*
        1. find the user by his email address
        2. find the installation row in with a query
        3. send the push to this device.
  */
 userHelper.findUserByEmail(invitedUserEmail)
 .then(function(user) {
   // enable master key to access installation table in parse.
   Parse.Cloud.useMasterKey();

   var pushQuery = new Parse.Query(Parse.Installation);
   pushQuery.equalTo('user', user);

   pushQuery.count()
   .then(function(count) {
     console.log("Push the notification to "+count+" devices.");
   }, function() {
     console.error(JSON.stringify(arguments));
   });

   return Parse.Push.send({
     where: pushQuery,
     expiration_time: defaultExpirationTime,
     data: {
       alert: "Neuer Workspace verfügbar: " + conversation.get("workspaceName"),
       category: "Neuer Workspace",
       sound: "default"
     }
   });
 })
 .then(
   function(result) {
     promise.resolve(result);
   },
   function(error) {
     promise.reject(error);
   }
 );

 return promise;
}

/**
 * internal method to generate an installation query.
 *
 * @param  ParseUser fromUser
 * @return ParseQuery
 */
function _getQuery(fromUser) {
  // enable master key to access installation table in parse.
  Parse.Cloud.useMasterKey();
  var pushQuery = new Parse.Query(Parse.Installation);
  pushQuery.equalTo('user', fromUser);
  return pushQuery;
}

/**
 * sets all "badge" values from the user to 0.
 *
 * @param  ParseUser fromUser
 *
 * @return Promise
 */
function resetBadge(fromUser) {
  return setBadge(0, fromUser);
}

/**
 * sets all "badge" values to {toNewValue}.
 *
 * @param Integer toNewValue
 * @param ParseUser fromUser
 *
 * @return Promise
 */
function setBadge(toNewValue, fromUser) {
  // enable master key to access installation table in parse.
  var entries = [];
  return (_getQuery(fromUser)
    .each(
      function(installationEntry) {
        installationEntry.set("badge", toNewValue);
        entries.push(installationEntry);
      }
    )
    .then(
      function(result){
        Parse.Cloud.useMasterKey();
        return Parse.Object.saveAll(entries);
      }
    )
  );
}
/**
 * retruns the current badge value of the user.
 *
 * @param  ParseUser fromUser
 *
 * @return Promise
 */
function getBadge(fromUser) {
  var promise = new Parse.Promise();
  _getQuery(fromUser).first()
  .then(function(installationEntry){
    promise.resolve(installationEntry.get("badge"));
  }, function(error) {
    promise.reject(error);
  });
  return promise;
}
