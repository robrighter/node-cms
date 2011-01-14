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
    
    //main page loader route
    server.get(new RegExp("^([a-zA-Z0-9\-\/]*)$"), function(req,res,next){
      findContentOrPassToNext(req.params[0], next, function(result){
        res.render(result.location.template, {
          layout: true,
          locals : {
            title: result.content.title,
            article: result.content.article
          }
        });
      });
    });
    
    //main admin page loader route
    server.get(new RegExp("^\/_admin\/([a-zA-Z0-9\-\/]*)$"), function(req,res,next){
      findContentOrPassToNext(req.params[0], next, function(result){
        res.render(result.location.template, {
          layout: true,
          locals : {
            title: result.content.title,
            article: result.content.article
          }
        });
      });
    });
    
    //user login route
    
    //admin create new item route
    
    //admin update existing item route 
  }
  
  
  function findContentOrPassToNext(path, next, callback){
    console.log('Got a request at path: ' + path)
    ds.getContentItemForPath(path, function(result){
      if(result){
        callback(result)
      }
      else{
        next();//didnt find anything pass it off to next
      }
    });
  }
  
})();
