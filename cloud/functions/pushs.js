
var pushHelper = require('cloud/helper/push.js');

module.exports.resetAppBadge = resetAppBadge;
module.exports.getAppBadge = getAppBadge;
module.exports.setAppBadge = setAppBadge;

/**
 * sets the push-badge value to 0
 *
 * @param  object request  
 * @param  object response 
 * @return void
 */
function resetAppBadge(request, response) {
  var user = request.user;
  pushHelper.resetBadge(user)
  .then(function(result){
    response.success("badge reset successful");
  },
  function(error) {
    response.error(error);
  });
}
/**
 * gets the push-badge value
 *
 * @param  object request  
 * @param  object response 
 * @return void
 */
function getAppBadge(request, response) {
  var user = request.user;
  pushHelper.getBadge(user)
  .then(function(result){
    response.success(result);
  },
  function(error) {
    response.error(error);
  });
}
/**
 * sets the push-badge value to {request.params.newValue}.
 * Params: 
 * - newValue
 *
 * @param  object request  
 * @param  object response 
 * @return void
 */
function setAppBadge(request, response) {
  var user = request.user,
   newValue = request.params.newValue;

  pushHelper.setBadge(newValue, user)
  .then(function(result){
    response.success("badge set successful");
  },
  function(error) {
    response.error(error);
  });
}
