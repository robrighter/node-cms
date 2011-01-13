(function(){
  require(__dirname + "/lib/setup").ext( __dirname + "/lib");
  var Datastore = require('./datastore').Datastore;
  var sys = require('sys');
  var ds = new Datastore();
  
  exports.content = ds;
  
  /////////////////////////////////////////////////////
  //           setup Routes
  /////////////////////////////////////////////////////
  exports.setupExpressJSRoutes = function(server){
    //TODO: implement applying routes
    //main page loader route
    
    //main admin page loader route
    
    //user login route
    
    //admin create new item route
    
    //admin update existing item route 
  }
  
})();
