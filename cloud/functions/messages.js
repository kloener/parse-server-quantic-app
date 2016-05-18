const fs = require('fs');

var conversationHelper = require('cloud/helper/conversation.js');
var participantHelper = require('cloud/helper/participant.js');
var messageHelper = require('cloud/helper/message.js');
var pushHelper = require('cloud/helper/push.js');
var userHelper = require('cloud/helper/user.js');
var configHelper = require('cloud/config.js');
var _ = require('cloud/lodash.js');

module.exports.writeFeedbackMessage = writeFeedbackMessage;
module.exports.readFeedbackMessages = readFeedbackMessages;
module.exports.countUnreadMessages = countUnreadMessages;
module.exports.deleteAllMessages = deleteAllMessages;
module.exports.writeSystemMessageToWorkspace = writeSystemMessageToWorkspace;

function deleteAllMessages(request, response) {

	var user = request.user;
	if (!user) {
		return response.error("Error: Invalid User.");
	}

	/**
	 -> Conversation "messages" leeren
	 -> ConversationParticipant "readMessageCount" auf 0 setzen
	 -> Messages leeren
	*/

	var Conversation = Parse.Object.extend("Conversation"), ConversationParticipant = Parse.Object.extend("ConversationParticipant"), Message = Parse.Object.extend("Message"),
	    conversationQuery = new Parse.Query(Conversation);
	conversationQuery.exists("messages");

	conversationQuery
	.find()
	.then(function(conversations){
    	for(var i=0,l=conversations.length; i<l; i++) {
    		conversations[i].unset("messages");
    	}

    	return Parse.Object.saveAll(conversations);
	}, function(error){
		response.error(error);
	})
	.then(function(){
		var messageQuery = new Parse.Query(Message);
		return messageQuery.find();
	}, function(error){
		response.error(error);
	})
	.then(function(messages){
    	return Parse.Object.destroyAll(messages);
	}, function(error){
		response.error(error);
	})
	.then(function(){
		var participantQuery = new Parse.Query(ConversationParticipant);
		participantQuery.greaterThan("readMessageCount", 0);
		return participantQuery.find();

	}, function(error){
		response.error(error);
	})
	.then(function(participants){
		for(var i=0,l=participants.length; i<l; i++) {

			var participant = participants[i];
			participant.set({
				readMessageCount: 0
			});
		}
		return Parse.Object.saveAll(participants);
	}, function(error){
		response.error(error);
	})
	.then(function(){
		response.success("messages resetted.");
	});
}

/**
 * writes a system message to a bunch of conversations (a complete workspace).
 *
 * @date   2016-03-18
 *
 * @param  {[type]}   request  [description]
 * @param  {[type]}   response [description]
 * @return {[type]}            [description]
 */
function writeSystemMessageToWorkspace(request, response) {
	var auth = request.params.auth;
	var message = request.params.message;
	var workspaceId = request.params.workspaceId;

	if(auth !== configHelper.SYSTEM_MESSAGE_AUTH) {
		response.error("Unauthenticated!");
		return;
	}
	if (!message || !workspaceId) {
		return response.error("Error: Invalid Params.");
	}

	var _conversations = null, _userObj = null;
	userHelper.findUserByEmail(configHelper.SYSTEM_USER_NAME)
	.then(function(userObj){
		_userObj = userObj;
		return conversationHelper.findByWorkspaceId(workspaceId);
	},
	function(error){
		response.error(error);
	})
	.then(function(results) {
		// Collect one promise for each delete into an array.
		var promises = [];
		_conversations = results;
		// _.each(results, function(result) {
			// promises.push(writeSystemMessageToConversation(result, message, _userObj));
		// });
		promises.push(writeSystemMessageToConversation(results[0], message, _userObj)); // 2016-03-21 only push a message to the newest conversation
		// Return a new promise that is resolved when all finished.
		return Parse.Promise.when(promises);
	},
	function(error){
		response.error(error);
	})
	.then(function() {
		return pushHelper.pushConversationMessage(_conversations[0], message, null);
	},
	function(error){
		response.error(error);
	})
	.then(function(){
		response.success("SUCCESS: Message created.");
	},
	function(error){
		response.error(error);
	});
}

/**
 * writes a single system message to a conversation
 *
 * @date   2016-03-18
 *
 * @param  {[type]}   conversation [description]
 * @param  {[type]}   _message      [description]
 * @param  {[type]}   user         [description]
 * @return {[type]}                [description]
 */
function writeSystemMessageToConversation(conversation, _message, user) {
	var Message = Parse.Object.extend("Message");
	var message = new Message();
	var promise = new Parse.Promise();
	// message.increment("messageCount"); // message does not have/need a messageCount
	var data = {
		contentText: _message,
		author: user
	};

	message.save(data)
	.then(function(msg) {
		conversation.add("messages", msg);
		return conversation.save();
	},function(err){promise.reject(err);})
	.then(function(_conv){
		promise.resolve(_conv);
	},function(err){promise.reject(err);});

	return promise;
}

/**
 * Required Parameter keys
			- contentText (String)
			- workspaceItemId (String)
			- file (File)

 * @date   2016-01-26
 *
 * @param  object   request
 * @param  object   response
 *
 * @return void
 */
function writeFeedbackMessage(request, response) {
	// request keys
	var user = request.user;
	var contentText = request.params.contentText;
	var workspaceItemId = request.params.workspaceItemId;
	// added file link to apply screenshots to messages
	// var fileLink = request.params.file;
	var files = request.files; // expressjs style

	// 1. check if valid user (params.user)
	if (!user) {
		return response.error("Error: Invalid User.");
	}

	if (!contentText || !workspaceItemId) {
		return response.error("Error: Invalid Params.");
	}

	var conversationObject = null, messageObj = null;
	conversationHelper.findByWorkspaceItemId(workspaceItemId)
  .then(function(_conversationObject) {
		// store the value to access it in other callbacks, too.
		conversationObject = _conversationObject;
		return participantHelper.findByUser(user, conversationObject);
	})
	.then(function(participant) {
		participant.increment("readMessageCount");
		participant.save();

		// 4. create new message object, set attributes, save
		var Message = Parse.Object.extend("Message");
		var message = new Message();
		// message.increment("messageCount"); // message does not have/need a messageCount
		var data = {
			contentText: contentText,
			author: user
		};

		// check for uploaded files. If the is a "messageFile" we will apply it to the message..
		if(files != null && files.messageFile != null) {

			var file = files.messageFile;
			var promise = new Parse.Promise();

			// we want to read the bytes from the file so we use "fs.readFile" from the temporary path.
			fs.readFile(file.path, function (err, fileContents) {
				// now we can create the file object and store it into parse.
				var parseFile = new Parse.File(file.name, fileContents, file.type);
				parseFile.save()
				.then(function(_parseFile){
					// the file is now stored. We can now link it to the message and save the message.
					data.file = _parseFile;
					return message.save(data);
				}, function(error) {
					response.error(error);
				})
				.then(function(messageObject) {
					// the message was saved successfully. Resolve the promise
					// -> add the messagen now to the conversation.
					promise.resolve(messageObject);
				}, function(error) {
    				response.error(error);
				});
			});

			// we have async calls with fs.readFile so return a new promise.
			return promise;
		}

		// if now file was found, we can directly return the save-promise of the message.
		return message.save(data);
	})
	.then(function(messageObject){
		// 5. add new message object to the conversation message array
		conversationObject.add("messages", messageObject);
		messageObj = messageObject;
		return conversationObject.save();
	})
	.then(function(_conversationObject) {
		// 6. fire push notification
		return pushHelper.pushConversationMessage(conversationObject, messageObj, user);
	})
	.then(function() {
		response.success("SUCCESS: Message created.");
	},
  function() {
		response.error(JSON.stringify(arguments));
	});
};

/**
 * Required parameter keys:
 *   - workspaceItemId (String)
 *
 * Response example:
 *
		 {
			"result": [{
				"senderId": value:String,
				"senderDisplayName": value:String,
				"messageDate": value:Date,
				"messageText": value:String
				},
				{
				"senderId": value:String,
				"senderDisplayName": value:String,
				"messageDate": value:Date,
				"messageText": value:String
				}]
			}
		 }
 *
 * @date   2016-01-26
 *
 * @param  object   request
 * @param  object   response
 *
 * @return void
 */
function readFeedbackMessages(request, response) {
	// 1. check if request params and user
	var user = request.user;
	var workspaceItemId = request.params.workspaceItemId;

	if (!user) {
		return response.error("Error: Invalid User.");
	}

	var conversationObject = null;
	conversationHelper.findByWorkspaceItemId(workspaceItemId)
  .then(function(_conversationObject) {
		// store the value to access it in other callbacks, too.
		conversationObject = _conversationObject;

		// 3. find the participant object that refers to the user
		return participantHelper.findByUser(user, conversationObject);
	})
	.then(function(participant) {
		// 4. set participants readMessagesCount equal to conversation messages.length
		participant.set("readMessageCount", messageHelper.getMessageCountOf(conversationObject));
		participant.save();

		// 5. on success return the messages
		// response.success(JSON.stringify(responseMessages));
		response.success(messageHelper.getMessagesOf(conversationObject));
	},
	function(errorMsg) {
		response.error(errorMsg);
	});
};

/**
 * No params required because we'll return all converation counts.
 *
 * Response example:
 *
		 {
			"workspaceId": {
				"countAll": value:int,
				"items": {
					"workspaceItemId": count:int,
					"workspaceItemId": count:int,
					"workspaceItemId": count:int
				}
			}
		 }

		 2016-01-22 Alternative Response (for better usage in Swift-lang)
		 TODO: may be we should add a format param to response both types

		 [
			{
				"workspaceId": "4",
				"unreadMessages": "120",
				"workspaceItems": [
					{
						"workspaceItemId": "4P12",
						"unreadMessages": "60"
					},{
						"workspaceItemId": "4P13",
						"unreadMessages": "60"
					}
				]
			},
			{
				...
			}
		 ]
 *
 * @date   2016-01-26
 *
 * @param  object   request
 * @param  object   response
 *
 * @return void
 */
function countUnreadMessages(request, response) {
	// 1. check if request params and user
	var user = request.user;

	if (!user) {
		return response.error("Error 1: Invalid User.");
	}

	// 2. query conversation object with messages and authors (includeKeys), participants and users
	var responeConversationsArray = {};
	conversationHelper.getAllConversations()
	.then(function(conversationArray) {
        for(var y=0, _l=conversationArray.length; y<_l; y++) {

          var conversationObject = conversationArray[y];
          var workspaceId        = conversationObject.get("workspaceId");
          var workspaceItemId    = conversationObject.get("workspaceItemId");

					var participant = participantHelper.findByUserAndReturn(user, conversationObject);
    			if(participant == null) {
            /*
              Continue the conversationArray, because the current user
              hasn't participated to this conversation, yet.
            */
            continue;
          }

          // After this line, we're sure that the user is a participant of the conversation.

          // Create an empty object for the current `workspaceId`
          if(!responeConversationsArray.hasOwnProperty(workspaceId)) {
            responeConversationsArray[workspaceId] = {
              "countAll": 0,
              "items": {
                // to fill
              },
              "messageCountOfItem": {},
              "messageCountAll": 0
            };
          }
          // Create an empty object for the current `workspaceItemId`
          if(!responeConversationsArray[workspaceId].items.hasOwnProperty(workspaceItemId)) {
            responeConversationsArray[workspaceId].items[workspaceItemId] = 0;
          }
          // Create an empty object for the current `workspaceItemId`
          if(!responeConversationsArray[workspaceId].messageCountOfItem.hasOwnProperty(workspaceItemId)) {
            responeConversationsArray[workspaceId].messageCountOfItem[workspaceItemId] = 0;
          }

    			// count the sum of all
          // 2016-01-21: do not use messageCount anymore. We can simply calculate the real value.
          var conversationMessageCount = messageHelper.getMessageCountOf(conversationObject),
              participantsReadMessageCount = participant.get("readMessageCount"),
              difference = (conversationMessageCount - participantsReadMessageCount);


          // set the message count for this workspace to the right value:
          responeConversationsArray[workspaceId].items[workspaceItemId] = difference < 0 ? 0 : difference;
          responeConversationsArray[workspaceId].messageCountOfItem[workspaceItemId] = conversationMessageCount;
          // increase the sum of all messages count:
          responeConversationsArray[workspaceId].countAll += difference;
          responeConversationsArray[workspaceId].messageCountAll += conversationMessageCount;
    		} // end for all conversations

        /**
         * 2016-01-22 Convert response object-array to a normal array for better handling in the client logic.
         */

        swiftResponsePreparation = [];
        // prepare each stream:
        for(var workspaceId in responeConversationsArray) {
          if(!responeConversationsArray.hasOwnProperty(workspaceId)) continue;

          // workspaceItems should returned as an array.
          var workspaceItems = responeConversationsArray[workspaceId].items,
              workspaceItemArray = [];
          for(var workspaceItemId in workspaceItems) {
            if(!workspaceItems.hasOwnProperty(workspaceItemId)) continue;
            workspaceItemArray.push({
              "workspaceItemId": ""+workspaceItemId,
              "unreadMessages": ""+workspaceItems[workspaceItemId],
              "messageCount": ""+responeConversationsArray[workspaceId].messageCountOfItem[workspaceItemId]
            });
          }

          swiftResponsePreparation.push({
            "workspaceId": ""+workspaceId,
            "unreadMessages": ""+responeConversationsArray[workspaceId].countAll,
            "messageCount": ""+responeConversationsArray[workspaceId].messageCountAll,
            "unreadItemMessages": workspaceItemArray
          });
        }

        response.success(swiftResponsePreparation);
  		}
			, function () {
  			response.error(JSON.stringify(arguments));
  		}
	);
};
