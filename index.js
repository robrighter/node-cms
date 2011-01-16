(function(){
  exports.CMS = function(settings){
    require(__dirname + "/lib/setup").ext( __dirname + "/lib");
    var Datastore = require('./datastore').Datastore;
    var sys = require('sys');
    var ds = new Datastore(settings);
    var form = require('connect-form');

    this.content = ds;

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
    
    // function prepareAdminInputs(info, contentproperties){
    //       console.log('--------------------------------------------------');
    //       console.log('READY TO PREPARE ADMINS:');
    //       console.log(sys.inspect(info));
    //       console.log('The Properties for this model are:');
    //       console.log(sys.inspect(info.content.getProperties()));
    //       //prepare the input list
    //       return info;
    //     }


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
