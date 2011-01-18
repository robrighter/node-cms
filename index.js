(function(){
  exports.CMS = function(settings){
    require(__dirname + "/lib/setup").ext( __dirname + "/lib");
    var Datastore = require('./datastore').Datastore;
    var sys = require('sys');
    var fs = require('fs');
    console.log('fs = ' + sys.inspect(fs));
    var ds = new Datastore(settings);
    var form = require('connect-form');
    this.content = ds;
    
    //grab the list of templates:
    var frontEndTemplates = [];
    fs.readdir(settings.FrontEndViews, function(err, files){
      if(!err){
        frontEndTemplates = files;
        console.log('Got the template list: ' + sys.inspect(frontEndTemplates));
      }
    });

    /////////////////////////////////////////////////////
    //           setup Routes
    /////////////////////////////////////////////////////
    this.setupExpressJSRoutes = function(server){

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
      
      //REST Resources
      server.put("/_content", function(req,res,next){
        var doc = req.body;
        if(!doc.hasOwnProperty('__hidden_from_navigation')){
         doc['__hidden_from_navigation'] = 'false';
        }
        if(doc['__hidden_from_navigation'] == 'true'){
          doc['__hidden_from_navigation'] = true;
        }
        else{
          doc['__hidden_from_navigation'] = false;
        }
        console.log(sys.inspect(doc));
        console.log('About to call ds.updateContent with id of ' + doc.__id);
        ds.updateContent(doc.__id, doc, function(result){
          if(result){
             res.send({status: true});
           }
           else{
             res.send({status: false})
           }
          });
      });
      
      //main admin page loader route
      server.get(new RegExp("^\/_admin\/([a-zA-Z0-9\-\/]*)$"), function(req,res,next){
        findContentOrPassToNext(req.params[0], next, function(result){
          prepareModelResultForAdmin(result, function(locals){
            locals.adminassets = settings.AdminAssetsWebPath;
            locals.sys = sys;
            res.render(settings.AdminAssetsFilePath + '/views/edit.ejs', {
              layout: false,
              locals : locals,
            });
          });
        });
      });

      //user login route

      //admin create new item route

      //admin update existing item route 
    }
    
    function prepareModelResultForAdmin(result, callback){
      var toreturn = {};
      toreturn.content = result.content;
      toreturn.location = result.location;
      toreturn.id = JSON.stringify(result.location._id).replace(/"/g, '');
      console.log('DOC ID = ' + toreturn.id);
      toreturn.templates = frontEndTemplates;
      //get children from location
      result.location.getChildren(function(children){
        toreturn.children = children;
        //run the preRenderingTasks if the model creator made them
        if(result.content.hasOwnProperty('preRenderingTasks')){
          result.content.preRenderingTasks(function(taskresults){
            toreturn.prerendertasks = taskresults;
            //setup form inputs
            callback(toreturn);
          });
        }
        else{
          callback(toreturn);
        }
      });
    }
    
    function prepareModelResultForFrontEnd(result,callback){
      //grab navigation lists
      
      //preRenderingTasks
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
  }
  
  
  
  
})();
