(function(){
  exports.CMS = function(settings){
    require(__dirname + "/lib/setup").ext( __dirname + "/lib");
    var Datastore = require('./datastore').Datastore;
    var sys = require('sys');
    var fs = require('fs');
    var ds = new Datastore(settings);
    var form = require('connect-form');
    this.content = ds;
    
    //grab the list of templates:
    var frontEndTemplates = [];
    fs.readdir(settings.FrontEndViews, function(err, files){
      if(!err){
        frontEndTemplates = files;
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
        var doc = processIncomingBody(req.body);
        ds.updateContent(doc.__id, doc, function(result){
           if(result){
             res.send({status: true});
           }
           else{
             res.send({status: false})
           }
        });
      });
    
      server.post("/_content", function(req,res,next){
        var doc = processIncomingBody(req.body);
        //make our content item and populate it with the form field values
        var content = ds.makeContent(doc.__contenttype);
        content.getProperties().forEach(function(item){
          if(doc.hasOwnProperty(item.name)){
            content[item.name] = doc[item.name];
          }
        });
        ds.addContentToSitemap(content, doc.__parentid, doc.__template, function(result){
          if(result){
             res.send({status: true, newslug: result.slug});
           }
           else{
             res.send({status: false})
           }
        });
      });
      
      function processIncomingBody(body){
        var doc = body;
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
        return doc;
      }
      
      //main admin page loader route
      server.get(new RegExp("^\/_admin\/([a-zA-Z0-9\-\/]*)$"), function(req,res,next){
        console.log('The Query String is: ' + sys.inspect(req.query));
        findContentOrPassToNext(req.params[0], next, function(result){
          prepareModelResultForAdmin(result, function(locals){
            locals.adminassets = settings.AdminAssetsWebPath;
            locals.contenttypes = ds.contentTypes;
            locals.sys = sys;
            locals.confirm = (req.query['confirm'] || '');
            locals.warning = (req.query['warning'] || '');
            res.render(settings.AdminAssetsFilePath + '/views/edit.ejs', {
              layout: false,
              locals : locals,
            });
          });
        });
      });
      
      //admin create new item route
      server.get(new RegExp("^\/_admin\/([a-zA-Z0-9\-\/]*)/?_new/([a-zA-Z0-9\-\/]*)$"), function(req,res,next){
        var contenttype = req.params[1];
        if(ds.contentTypes.indexOf(contenttype) < 0 ){
          //move on, this is a 404. That content type is not valid
          console.log('tried to go to a create new content page with an invalid content type');
          next();
        }
        findContentOrPassToNext(req.params[0], next, function(result){
          var locals = {};
          locals.adminassets = settings.AdminAssetsWebPath;
          locals.sys = sys;
          locals.templates = frontEndTemplates;
          locals.confirm = (req.params['confirm'] || '');
          locals.warning = (req.params['warning'] || '');
          locals.location = {}
          locals.location.template = result.location.template;
          locals.location.parentid = ds.convertIdToString(result.location._id);
          locals.location.contenttype = contenttype;
          locals.content = ds.makeContent(contenttype);
          locals.content.title = 'New ' + contenttype;
          res.render(settings.AdminAssetsFilePath + '/views/edit.ejs', {
            layout: false,
            locals : locals,
          });
        });
      });

      //user login route

      //admin update existing item route 
    }
    
    function prepareModelResultForAdmin(result, callback){
      var toreturn = {};
      toreturn.content = result.content;
      toreturn.location = result.location;
      toreturn.id = ds.convertIdToString(result.location._id);
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
