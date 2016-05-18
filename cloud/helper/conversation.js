/**
 * Helper or shortcuts for the conversation object.
 */

module.exports.getAllConversations = getAllConversations;
module.exports.findByWorkspaceItemId = findByWorkspaceItemId;
module.exports.findByWorkspaceId = findByWorkspaceId;

/**
 * finds the first conversation object by the given workspaceItemId.
 * If no conversation was found or an error occurred, we'll call the errorCallback.
 *
 * The successCallback will get the found conversation object as the first param.
 *
 * @date   2016-01-26
 *
 * @param  string     workspaceItemId  the unique identifier for the conversation you're looking for.
 * @param  function   successCallback  (optional)
 * @param  function   errorCallback    (optional)
 *
 * @return promise
 */
function findByWorkspaceItemId(workspaceItemId, successCallback, errorCallback) {
  var promise = new Parse.Promise(), errorMsg = "";

  if(errorCallback == null) {
    errorCallback = function(){};
  }

  if(successCallback == null) {
    successCallback = function(){};
  }

  if (!workspaceItemId || !workspaceItemId.hasOwnProperty("length") || workspaceItemId.length < 2) {
		errorMsg = "Invalid workspaceItemId.";
		promise.reject(errorMsg);
    errorCallback(errorMsg);
    return promise;
	}

  // 2. query conversation object with messages and authors (includeKeys), participants and users
	var Conversation = Parse.Object.extend("Conversation"),
	    query = new Parse.Query(Conversation);

	query.equalTo("workspaceItemId", workspaceItemId);
	query.include(["messages.author", "participants.user"]);

	query.first().then(function(result){
    promise.resolve(result);
    successCallback(result);
  }, function(){
    errorMsg = "Error: Did not find conversation object with workspaceItemId " + workspaceItemId;
    promise.reject(errorMsg);
    errorCallback(errorMsg);
  });

  return promise;
};

/**
 * finds all conversation objects by the given workspaceId.
 * If no conversation was found or an error occurred, we'll call the errorCallback.
 *
 * The successCallback will get the found conversation objects as the first param.
 *
 * @date   2016-01-26
 *
 * @param  string     workspaceId      the unique identifier for the conversation you're looking for.
 * @param  function   successCallback  (optional)
 * @param  function   errorCallback    (optional)
 *
 * @return promise
 */
function findByWorkspaceId(workspaceId, successCallback, errorCallback) {
  var promise = new Parse.Promise(), errorMsg = "";

  if(errorCallback == null) {
    errorCallback = function(){};
  }

  if(successCallback == null) {
    successCallback = function(){};
  }

  if (!workspaceId || !workspaceId.hasOwnProperty("length") || workspaceId.length < 1) {
		errorMsg = "Invalid workspaceId.";
		promise.reject(errorMsg);
    errorCallback(errorMsg);
    return promise;
	}

  // 2. query conversation object with messages and authors (includeKeys), participants and users
	var Conversation = Parse.Object.extend("Conversation"),
	    query = new Parse.Query(Conversation);

	query.equalTo("workspaceId", workspaceId);
  query.descending("createdAt");
	query.include(["messages.author", "participants.user"]);

	query.find().then(function(result){
    promise.resolve(result);
    successCallback(result);
  }, function(){
    errorMsg = "Error: Did not find conversation objects with workspaceId " + workspaceId;
    promise.reject(errorMsg);
    errorCallback(errorMsg);
  });

  return promise;
};

/**
 * receive all conversations from parse.
 *
 * @date   2016-01-26
 *
 * @return promise
 */
function getAllConversations() {
  var promise = new Parse.Promise(), errorMsg = "";

  // 2. query conversation object with messages and authors (includeKeys), participants and users
	var Conversation = Parse.Object.extend("Conversation");
	var query = new Parse.Query(Conversation);
	query.limit(1000); // TODO what if we get more than 1000 conversations?

	query.include(["messages", "participants.user"]);

  var responeConversationsArray = {};

	return query.find();
};
