/**
 * Message helper
 */
module.exports.getMessageCountOf = getMessageCountOf;
module.exports.getMessagesOf = getMessagesOf;
/**
 * [function description]
 * @date   2016-01-26
 *
 * @param  ParseObject      a parseObject with the array-field "messages".
 *
 * @return integer          the real message count as integer.
 */
function getMessageCountOf(conversation) {
  var messages = [];
  if(conversation != null) {
    messages = conversation.get("messages");
  }
  if(messages == null) messages = [];

  var validMessages = []
  for(var i=0,l=messages.length; i<l; i++) {
    if(messages[i] != null) {
      validMessages.push(messages[i]);
    }
  }

  return validMessages.length;
}

/**
 * [function description]
 * @date   2016-01-26
 *
 * @param  PaseObject   conversation the conversation/object where we'll find the messages.
 *
 * @return array                     an array of all messages of the conversation.
 */
function getMessagesOf(conversation) {
  var messages = conversation.get("messages");
  if(!messages) messages = [];

  var responseMessages = [];
  var message = null;

  for(var i=0, _l=messages.length; i<_l; i++) {
    message = messages[i];

    if(message == null) continue; // occurred if messages were deleted but the conversation.messsages field not.

    var author = message.get("author");

    var senderId = "0";
    var senderDisplayName = "User (gelöscht)";
    var messageDate = message.get("createdAt");
    var messageText = message.get("contentText");
    var fileLink    = message.get("file");

    if(author != null) {
      senderId = author.id;
      senderDisplayName = author.get("email"); // TODO use full name instead (if set)
    }

    responseMessages.push({
      "senderId": senderId,
      "senderDisplayName": senderDisplayName,
      "messageDate": messageDate,
      "messageText": messageText,
      "messageFile": fileLink || ""
    });
  }
  return responseMessages;
}
