(function(){
  /////////////////////////////////////////////////////
  //           inital setup
  ////////////////////////////////////////////////////
  exports.Datastore = function(){
    require(__dirname + "/lib/setup").ext( __dirname + "/lib"); 
    var mongoose = require('mongoose/mongoose').Mongoose;
    var settings = require('./cms-settings').settings;
    var crypto = require('crypto');
    var sys = require('sys');
    var that = this;
    //setup the db
    var db = mongoose.connect(settings.MongoConnectionString); //TODO: Get this out into a settings file
    //setup the contentgraph model
    mongoose.model('NodeCMSContentGraph', {
        properties: ['slug', 'template', 'parentid', 'contentid', 'contenttype'],
        indexes: ['id', 'slug', 'contentid', 'parentid', 'contenttype'],
    });
    var NodeCMSContentGraph = db.model('NodeCMSContentGraph');
  
    /////////////////////////////////////////////////////
    //           content creation
    ////////////////////////////////////////////////////
    
    this.createContentType = function(name, details){
      var properties = ['updated_at', 'title', 'hidden_from_navigation'];
      properties = properties.concat( (details.hasOwnProperty('properties')?details.properties:[]) );
      mongoose.model(name, {
          properties: properties,
          
          indexes: ['id'],
          
          cast: (details.hasOwnProperty('cast')?details.cast:{}),
          
          methods: mixin(
            { 
                save: function(fn){
                    this.updated_at = new Date();
                    this.__super__(fn);
                }
            },
            (details.hasOwnProperty('methods')?details.methods:{}))
      });
    }
  
    this.makeContent = function(type){
      var ContentClass = db.model(type);
      var toreturn = new ContentClass();
      toreturn.contenttype = type;
      return toreturn;
    };
  
    this.addContentToSitemap = function(content, parentid, template, callback){
      //first save the content
      content.save(function(result){
        //now save the content into the content graph
        var toadd = new NodeCMSContentGraph();
        toadd.slug = slugify(content.title);
        toadd.parentid = parentid;
        toadd.template = template;
        toadd.contentid = content._id;
        toadd.contenttype = content.contenttype;
        console.log('Adding this content to the sitemap of type: ' + toadd.contenttype);
        toadd.save(function(){
          callback();
        });
      });
      
    }
  
    /////////////////////////////////////////////////////
    //           queries
    //////////////////////////////////////////////////// 
    
    var processFoundResult = function(result, callback){
      if(result){
        //found it, now lets lookup the conntent item
        var contentmodel = db.model(result.contenttype);
        contentmodel.find({ _id: result.contentid }).first(function(contentitem){
          callback({location: result, content: contentitem});
        });
        
      }
      else{
        //this database does not have a root, return false
        callback(false);
      }
    }
    
    this.getRoot = function(callback){
      NodeCMSContentGraph.find({ parentid: 0 }).first(function(result){
        processFoundResult(result,callback);
      });
    }
  
    this.getContentItemForPath = function(path, callback){
      //turn the path into an array and strip out all of the ''s
      path = path.split('/').filter(function(item){return item!==''});
      var i = 0;
      //recursive function that goes until we get to the end of the page
      var iter = function(cursor){
        if(!cursor){
          //we got nothing, this is a 404
          throw "404";
        }
        else if(i == (path.length-1)){
          //we found it, lets return it in the callback
          processFoundResult(cursor,callback);
        }
        else{
          //still going keep iterating
          i++;
          NodeCMSContentGraph.find({ parentid: cursor.parentid }).first(iter);
        }
      };
      //alright lets kick it off
      that.getRoot(function(root){
        iter(root);  
      });
    }

    /////////////////////////////////////////////////////
    //           primatives
    ////////////////////////////////////////////////////
    var fieldTypes = { //TODO: make real classes for each primative type (image uploads and whatnot)
      Text: String,
      RichText: String
    }
  
    function setupPrimativeContentTypes(){ //TODO: finish up these primative content types
      //folder
      that.createContentType('Folder', {
        properties: ['article'],
        methods : {
          getChildren: function(callback){
            //TODO: Actually implement this
            console.log('getChildren is not implemented yet');
            callback([]);
          }
        },
        cast : {
          article: fieldTypes.Text
        }
      });
      //simple page
      that.createContentType('Page', {
        properties: ['article','teaser'],
        cast: {
          article: fieldTypes.RichText,
          teaser: fieldTypes.Text
        }
      });
    }
    
    //setup the initial content types
    setupPrimativeContentTypes();
  
    /////////////////////////////////////////////////////
    //           utils
    ////////////////////////////////////////////////////  
    function slugify(text) {
      text = text.replace(/[^-a-zA-Z0-9,&\s]+/ig, '');
      text = text.replace(/\s/gi, "-");
      return text.toLowerCase();
    }
    
    function mixin(){
      //take all of the objects passed in and mix them into a single object
      var toreturn = {};
      var objs = arguments;
      Object.keys(objs).forEach(function(objkey){
        Object.keys(objs[objkey]).forEach(function(item){
          toreturn[item] = objs[objkey][item];
        });
      });
      return toreturn
    }
    
    
  }
})()