/* */

var config = require('cloud/config.js');

module.exports.findUserByEmail = findUserByEmail;
module.exports.signUpUserWith  = signUpUserWith;

/**
 * finds a user by his email address in the parse table.
 *
 * @date   2016-01-27
 *
 * @param  String   email
 *
 * @return Promise
 */
function findUserByEmail(email) {
  var query = new Parse.Query(Parse.User);
	query.equalTo("email", email);
  return query.first();
}

/**
 * sign up user with the given email and return the promise.
 *
 * @date   2016-02-10
 *
 * @param  String   email
 *
 * @return Promise
 */
function signUpUserWith(email) {
  var user = new Parse.User();
  user.set("username", email);
  user.set("password", config.DEFAULT_USER_PASS);
  user.set("email", email);

  return user.signUp();
}