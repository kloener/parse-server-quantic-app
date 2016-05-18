
var messagesFunctions = require('cloud/functions/messages.js');
var participantsFunctions = require('cloud/functions/participants.js');
var pushsFunctions = require('cloud/functions/pushs.js');

// define the Parse API here:

// Params: {contentText}, {workspaceItemId}
Parse.Cloud.define("writeFeedbackMessage", messagesFunctions.writeFeedbackMessage);
// Params: {contentText}, {workspaceItemId}, {auth}
Parse.Cloud.define("writeSystemMessageToWorkspace", messagesFunctions.writeSystemMessageToWorkspace);
// Params: {workspaceItemId}
Parse.Cloud.define("readFeedbackMessages", messagesFunctions.readFeedbackMessages);
// Params: -
Parse.Cloud.define("countUnreadMessages", messagesFunctions.countUnreadMessages);
// Params: -
Parse.Cloud.define("deleteAllMessages", messagesFunctions.deleteAllMessages);

// Params: {workspaceItemId}
Parse.Cloud.define("getParticipantsOfConversation", participantsFunctions.getParticipantsOfConversation);
// Params: {workspaceId}
Parse.Cloud.define("getParticipantsOfWorkspace", participantsFunctions.getParticipantsOfWorkspace);
// Params: {workspaceItemId}, {email}
Parse.Cloud.define("addParticipantToConversation", participantsFunctions.addParticipantToConversation);
// Params: {workspaceId}, {email}
Parse.Cloud.define("addParticipantToWorkspace", participantsFunctions.addParticipantToWorkspace);

// Params: -
Parse.Cloud.define("resetAppBadge", pushsFunctions.resetAppBadge);
// Params: {newValue}
Parse.Cloud.define("setAppBadge", pushsFunctions.setAppBadge);
// Params: -
Parse.Cloud.define("getAppBadge", pushsFunctions.getAppBadge);
