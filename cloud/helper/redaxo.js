/*

  call the deprecated redaxo api with some easy methods.

 */

var base_url          = process.env.REDAXO_URL || '';
var projects_base_url = base_url + "?chameleon_project_request=";
var user_base_url     = base_url + "?chameleon_user=";

// imported:
var API = {
  "project": {
    "base"   : projects_base_url,
    "receive": projects_base_url + "receiveProject"
  },
  "user": {

    "base"               : user_base_url,
    "share"              : user_base_url + "user/share",
    "sharedWith"         : user_base_url + "user/sharedWith",
    "auth"               : user_base_url + "user/login",
    "logout"             : user_base_url + "user/logout",
    "sync"               : user_base_url + "user/sync",
    "recover"            : user_base_url + "user/recover",
    "update"             : user_base_url + "user/update",
    "validateActivation" : user_base_url + "user/validateActivation",
    "getUserData"        : user_base_url + "user/getUserData",
    "getDevices"         : user_base_url + "user/devices",
    "streams"            : user_base_url + "user/streams",

    // extension for PARSE:
    "parseShare"         : user_base_url + "user/parseShare"
  }
};
var defaultOptions = {
  method: "POST",
  followRedirects: false,
  headers: {
    "X-Parse-Access-Token": process.env.REDAXO_PARSE_AUTH_TOKEN,
    "Content-Type": "application/x-www-form-urlencoded"
  },
  params: {}
};

// Module Exports
module.exports.API = API;
module.exports.inviteUserToConversation = inviteUserToConversation;

/**
 * initiate a http request to the redaxo api to invite a user to the given conversation.
 *
 * @date   2016-01-27
 *
 * @param  ParseUser   user             The User who shares a conversation
 * @param  String      invitedUserEmail the user we wanna invite.
 * @param  ParseObject conversation     the conversation you wanna share.
 *
 * @return promise
 */
function inviteUserToConversation(user, invitedUserEmail, conversation) {
  // copy object
  var options = Object.create(defaultOptions);

  // set additonal options
  options.method = "POST";
  options.url = base_url;
  options.params = {
    "shareWith": invitedUserEmail,
    "projectId": conversation.get("workspaceId"),
    "sharer"   : user.get("email"),
    // append api here because otherwise parse returns an Error
    "chameleon_user": "user/parseShare"
  };

  return Parse.Cloud.httpRequest(options);
}
