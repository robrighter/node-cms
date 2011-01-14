(function(){
  require(__dirname + "/lib/setup").ext( __dirname + "/lib");
  var Datastore = require('./datastore').Datastore;
  var sys = require('sys');
  var ds = new Datastore();
  var form = require('connect-form');
  
  exports.content = ds;
  
  /////////////////////////////////////////////////////
  //           setup Routes
  /////////////////////////////////////////////////////
  exports.setupExpressJSRoutes = function(server){
    
    //add in the form handler
    server.use(form({ keepExtensions: true }));
    
    //TODO: implement applying routes
    //main page loader route
    server.get(new RegExp("^([a-zA-Z0-9\-\/]*)$"), function(req,res,next){
      console.log('Got a request at path: ' + req.params[0])
      ds.getContentItemForPath(req.params[0], function(result){
        if(result){
          console.log('I DID FIND A MATCH:' + result.content.article);
          res.render(result.location.template, {
              layout: true,
              locals : {
                title: result.content.title,
                article: result.content.article
              }
          });
        }
        else{
          //didnt find anything pass it off to next
          console.log('Didnt find a match');
          res.send('DONE');
          //next();
        }
        
      });
      
    });
    
    //main admin page loader route
    
    //user login route
    
    //admin create new item route
    
    //admin update existing item route 
  }
  
})();
