/**
 * Config values and constants
 */

module.exports.DEFAULT_USER_PASS = process.env.DEFAULT_USER_PASS || "";
module.exports.FILTER_WORKSPACE_ITEM_ID_REGEX = /^(\d+)([a-z]{1})(\d+)$/i;
module.exports.SYSTEM_USER_NAME = process.env.SYSTEM_USER_NAME || "";
module.exports.SYSTEM_MESSAGE_AUTH = process.env.SYSTEM_MESSAGE_AUTH || "";
