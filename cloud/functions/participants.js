/**
  All about participants
  - read
  - add
*/

var conversationHelper = require('cloud/helper/conversation.js');
var participantHelper = require('cloud/helper/participant.js');
var redaxoHelper = require('cloud/helper/redaxo.js');
var pushHelper = require('cloud/helper/push.js');
var userHelper = require('cloud/helper/user.js');
var config = require('cloud/config.js');

module.exports.getParticipantsOfConversation = getParticipantsOfConversation;
module.exports.getParticipantsOfWorkspace    = getParticipantsOfConversation;

module.exports.addParticipantToConversation = addParticipantToConversation;
module.exports.addParticipantToWorkspace    = addParticipantToConversation;

/**
 * Required parameters
 *   - workspaceItemId (String) OR workspaceId (String) (We can use both to receive the participants)
 *
 * returns an array of all users-objects, containing the email address, first and lastnames:
 *   [{"email":"illies@handspiel.net", "firstname":"Christian", "surname":"Illies"},{...}]
 *
 * NOTE This is and should be the same format as the REDAXO API returns the users.
 *
 * @date   2016-01-26
 *
 * @param  object   request
 * @param  object   response
 *
 * @return void
 */
function getParticipantsOfConversation(request, response) {
  var workspaceItemId = request.params.workspaceItemId,
      workspaceId = request.params.workspaceId,
      resultUsers = [];

  getConversationFrom(workspaceItemId, workspaceId)
  .then(function(conversation) {
    response.success(_getParticipantsOfConversation(conversation));
  },
  function() {
    response.error(JSON.stringify(arguments));
  });
};

/**
 * you'll get a conversation returned. If workspaceItemId is set and workspaceId null
 * we'll find the conversation by the itemId.
 * Otherwise we'll look up all conversation with the given workspaceId and return the first one.
 *
 * @date   2016-02-05
 *
 * @param  string   workspaceItemId the workspaceItemId you wanna receive or NULL
 * @param  string   workspaceId     the workspaceId you wanna look up or NULL
 *
 * @return Promise
 */
function getConversationFrom(workspaceItemId, workspaceId) {
  if(workspaceItemId == null && workspaceId == null) {
    return null;
  }
  if(workspaceItemId != null) {
    return conversationHelper.findByWorkspaceItemId(workspaceItemId);
  }

  var promise = new Parse.Promise();
  getConversationsFrom(workspaceId)
  .then(function(conversations) {
    promise.resolve(conversations[0]);
  },
  function(error){
    promise.reject(error);
  });

  return promise;
}

/**
 * [getConversationsFrom description]
 * 
 * @param  String workspaceItemId the workspaceItemId or workspaceId to receive ALL conversations of that workspace.
 * 
 * @return Promise
 */
function getConversationsFrom(workspaceItemId) {
  var filteredWorkspaceId = workspaceItemId.match(config.FILTER_WORKSPACE_ITEM_ID_REGEX)
    /**
     * Get the workspace Id from the given param {workspaceItemId}. 
     * If the {workspaceItemId} is already the workspaceId we'll use it direclty.
     * 
     * @type String
     */
      workspaceId = filteredWorkspaceId == null ? workspaceItemId : filteredWorkspaceId[1];

  return conversationHelper.findByWorkspaceId(workspaceId);
}

/**
 * returns an array of all participant users in the given conversation.
 *
 * @date   2016-02-05
 *
 * @param  ParseObject   conversation
 * @return array
 */
function _getParticipantsOfConversation(conversation) {
  var users = participantHelper.getAllUsers(conversation),
      user, resultUsers = [];

  for(var i=0, _l=users.length; i<_l; i++) {
    user = users[i];
    if(user == null) continue;

    resultUsers.push({
      "email": user.get("email"),
      "firstname": user.get("firstName"),
      "surname": user.get("lastName")
    });
  }
  return resultUsers;
}

/**
 * Required parameter:
 *   - workspaceItemId (String) OR workspaceId (String) (We can use both to add a participant)
 *   - email (String) // the new user for this conversation
 *
 * returns:
     on success we'll return a dictionary with the user infos:
       {"email": "illies@handspiel.net", "firstname": "Christian", "surname": "Illies"}

     on error:
       errorMessage:string

 * @date  2016-01-27
 *
 * @param object   request
 * @param object   response
 */
function addParticipantToConversation(request, response) {
  var workspaceItemId = request.params.workspaceItemId,
      workspaceId = request.params.workspaceId,
      userEmail = request.params.email,
      user = request.user;

  if (!user) {
		return response.error("Error: Invalid User.");
	}

  // we overgive a single param to `getConversationsFrom` so
  // if one isn't set, we'll use the other value.
  if(workspaceItemId == null) workspaceItemId = workspaceId;

  var conversationObjects = null;
  getConversationsFrom(workspaceItemId)
  .then(function(conversations) {
    // conversationObject = conversations[0];
    conversationObjects = conversations;

    var promise = new Parse.Promise();
    userHelper.findUserByEmail(userEmail)
    .then(function(_user){
      // unfortuantely it's possible that the user object is null here.
      // so we've to check it.
      if(_user == null) {
        promise.reject(null);
        return;
      }

      promise.resolve(_user);
    }, function(error) {
      promise.reject(null);
    });

    return promise;
  }, function(error) {
    response.error("ParseError: Invalid conversation");
  })
  .then(function(inviteUser) {

    // user known, but does he have the conversation?
    var participant = participantHelper.findByUserAndReturn(inviteUser, conversationObjects[0]);
    if(participant == null) {
      return Parse.Promise.when(
        [
          participantHelper.createParticipantsForWorkspace(conversationObjects, inviteUser),
          redaxoHelper.inviteUserToConversation(user, userEmail, conversationObjects[0])
        ]
      );
    }

    response.error("User is subscribed to this workspace!");
  }, function() {

    // user does not exist? perfect! Invite him.
    var promise = new Parse.Promise();

    userHelper.signUpUserWith(userEmail)
    .then(function(inviteUser) 
    {
      return participantHelper.createParticipantsForWorkspace(conversationObjects, inviteUser);
    }, function(error) 
    {
      promise.reject("Couldn't sign up new user. Error: "+JSON.stringify(error));
    })
    .then(function() 
    {
      return redaxoHelper.inviteUserToConversation(user, userEmail, conversationObjects[0]);
    }, function(error) 
    {
      promise.reject("Couldn't create participant. Error: "+JSON.stringify(error));
    })
    .then(function(result) 
    {
      promise.resolve(result);
    }, function(error) 
    {
      promise.reject(error);
    });

    return promise;
  })

  .then(function() 
  {
    // TODO: the request should return the user info if possible. I.e. it's an existing user, we could use his name directly.
    return pushHelper.pushConversationAdded(conversationObjects[0], userEmail);
  }, function(error) 
  {
    console.error(JSON.stringify(error));
    response.error("HTTP " + error.code + ": " + error.text);
  })

  .then(function() 
  {
    response.success({"email": userEmail, "firstname": "", "surname": ""});
  }, function(error) 
  {
    console.error(JSON.stringify(error));
  });
};
