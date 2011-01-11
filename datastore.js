(function(){
  /////////////////////////////////////////////////////
  //           inital setup
  ////////////////////////////////////////////////////
  require(__dirname + "/lib/setup").ext( __dirname + "/lib"); 
  var mongoose = require('mongoose/mongoose').Mongoose;
  var crypto = require('crypto');
  var sys = require('sys');
  //setup the db
  var db = mongoose.connect('mongodb://username:password@host:port/database'); //TODO: Get this out into a settings file
  //setup the contentgraph model
  mongoose.model('NodeCMSContentGraph', {
      properties: ['slug', 'template', 'parentid', 'contentid'],
      indexes: ['id', 'slug', 'contentid', 'parentid'],
  });
  var NodeCMSContentGraph = db.model('NodeCMSContentGraph');
  
  /////////////////////////////////////////////////////
  //           content creation
  ////////////////////////////////////////////////////
  
  exports.createContentType = function(name, details){
    var properties = ['updated_at', 'title'];
    properties = properties.concat( (details.hasOwnProperty('properties')?details.properties:[]) );
    mongoose.model(name, {
        properties: properties,
        indexes: ['id'],
        cast: (details.hasOwnProperty('cast')?details.cast:{}),
        methods: {
            save: function(fn){
                this.updated_at = new Date();
                this.__super__(fn);
            }
        }
    });
  }
  
  exports.makeContent = function(type){
    var ContentClass = db.model(type);
    return (new ContentClass());
  };
  
  exports.addContentToSitemap = function(content, parentid, template, callback){
    var toadd = new NodeCMSContentGraph();
    toadd.slug = slugify(content.title);
    toadd.parentid = parentid;
    toadd.template = template;
    toadd.contentid = content._id;
    toadd.save(function(){
      callback();
    });
  }
  
  /////////////////////////////////////////////////////
  //           queries
  //////////////////////////////////////////////////// 
  exports.getRoot = function(callback){
    NodeCMSContentGraph.find({ parentid: '' }).first(function(result){
      if(result){
        //found it, go ahead and return it
        callback(result);
      }
      else{
        //this database does not have a root, I guess we need to make one
        throw "Error: No Root Item";
      }
    });
  }
  
  exports.getContentItemForPath = function(path, callback){
    path = path.split('/');
    var i = 0;
    //recursive function that goes until we get to the end of the page
    var iter = function(cursor){
      if(!cursor){
        //we got nothing, this is a 404
        return false;
      }
      else if(i == (path.length-1)){
        //we found it, lets return it in the callback
        callback(cursor);
      }
      else{
        //still going keep iterating
        i++;
        NodeCMSContentGraph.find({ parentid: cursor.parentid }).first(iter);
      }
    };
    //alright lets kick it off
    exports.getRoot(function(root){
      iter(root);  
    });
  }

  /////////////////////////////////////////////////////
  //           primatives
  ////////////////////////////////////////////////////
  var fieldTypes = { //TODO: make real classes for each primative type (image uploads and whatnot)
    Text: String,
  }
  
  function setupPrimativeContentTypes(){ //TODO: finish up these primative content types
    //folder
    
    //simple page
  }
  
  /////////////////////////////////////////////////////
  //           utils
  ////////////////////////////////////////////////////  
  function slugify(text) {
    text = text.replace(/[^-a-zA-Z0-9,&\s]+/ig, '');
    text = text.replace(/\s/gi, "-");
    return text.toLowerCase();
  }
  
})()