/**
 * Helper or shortcuts for the participants.
 */

module.exports.findByUser           = findByUser;
module.exports.findByUserAndReturn  = findByUserAndReturn;
module.exports.getAllUsers          = getAllUsers;
module.exports.createParticipantFor = createParticipantFor;
module.exports.createParticipantsForWorkspace = createParticipantsForWorkspace;

var _ = require("cloud/lodash");

/**
 *
 * @date   2016-01-26
 *
 * @param  ParseUser   user            the user we compare to the participants array.
 * @param  ParseObject conversation    the object which contains an array of all participants where the given user should be found.
 * @param  function    successCallback
 * @param  function    errorCallback
 *
 * @return promise
 */
function findByUser(user, conversation, successCallback, errorCallback) {
  var promise = new Parse.Promise(),
      errorMsg = "";

  if(errorCallback == null) {
    errorCallback = function(){};
  }

  if(successCallback == null) {
    successCallback = function(){};
  }

  var participant = findByUserAndReturn(user, conversation);

  if(participant == null) {
    errorMsg = "Error 1: Did not find matching participant object.";
    promise.reject(errorMsg);
    errorCallback(errorMsg);
    return promise;
  }

  promise.resolve(participant);
  successCallback(participant);

  return promise;
};

/**
 * [function description]
 * @date   2016-01-26
 * @param  ParseUser   user            the user we compare to the participants array.
 * @param  ParseObject conversation    the object which contains an array of all participants where the given user should be found.
 * @return ParseObject                 the found participant or null.
 */
function findByUserAndReturn(user, conversation) {
  var participants = conversation.get("participants");
  var participant  = null;
  for(var i = 0 ; i < participants.length; i++) {
    participant = participants[i];

    if(participant == null) continue;
    if(participant.get("user").id === user.id) {
      break;
    }

    participant = null;
  }

  return participant
};

/**
 * @date   2016-01-26
 *
 * @param  array conversations    array of conversation objects
 * @param  ParseUser   user            the new user 
 * 
 * @return Promise
 */
function createParticipantsForWorkspace(conversations, user) {
  // parallel
  var promises = [];
  _.each(conversations, function(conversation) {
    // Start this delete immediately and add its promise to the list.
    promises.push(createParticipantFor(conversation, user));
  });
  // Return a new promise that is resolved when all of the deletes are finished.
  return Parse.Promise.when(promises);
}

/**
 * @date   2016-01-26
 *
 * @param  ParseObject conversation    the object which contains an array of all participants where the given user should be found.
 * @param  ParseUser   user            the new user 
 * 
 * @return Promise for saving the conversation
 */
function createParticipantFor(conversation, user) {
  var Participant = Parse.Object.extend("ConversationParticipant"),
      participant = new Participant(),
      promise = new Parse.Promise();

  participant.set("readMessageCount", 0);
  participant.set("user", user);
  participant.save()
  .then(function(_participant) {
    conversation.add("participants", _participant);
    return conversation.save();
  }, function() {
    promise.reject("failed to save new participant.");
  })
  .then(function(_conversation) {
    promise.resolve(_conversation);
  }, function() {
    promise.reject("failed to save conversation with new participant.");
  });

  return promise;
}

/**
 * Returns all users as an array from the given conversation.
 * So instead of having the participant, you'll get a list of users.
 *
 * @date   2016-01-26
 *
 * @param  ParseObject   conversation the conversation containing some participants of us.
 *
 * @return array         an array of users or false if the conversation object is invalid.
 */
function getAllUsers(conversation) {
  if(conversation == null) return false

  var participants = conversation.get("participants"),
      users = [], participant, tmpUser;

  if(participants == null) return users;

  for(var i=0,_l=participants.length; i < _l; i++) {
    participant = participants[i];
    if(participant == null) continue;
    tmpUser = participant.get("user");
    if(tmpUser == null) continue;

    users.push(tmpUser);
  }

  return users;
};
