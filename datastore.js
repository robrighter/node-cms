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
    var db = mongoose.connect(settings.MongoConnectionString);
    
    //////////////////////////////////////////////////
    //            System Models
    /////////////////////////////////////////////////
    //contentgraph model
    mongoose.model('NodeCMSContentGraph', {
        properties: ['slug', 'template', 'parentid', 'contentid', 'contenttype'],
        indexes: ['slug', 'contentid', 'parentid', 'contenttype'],
        methods : {
          getChildren: function(callback){
            NodeCMSContentGraph.find({ parentid: this._id }).all(callback);
          }
        }
    });
    var NodeCMSContentGraph = db.model('NodeCMSContentGraph');
    //user model
    mongoose.model('_User', {
        properties: ['username', 'password', 'firstname', 'lastname', 'email', 'permissions' ],
        indexes: ['username', 'email'],
        methods: {
          getPassKey: function(){
            return crypto.createHash('sha1').update(this.username+this.password+settings.SecretKey).digest('hex');
          },
          validatePassword: function(thepassword){
            if(crypto.createHash('sha1').update(thepassword).digest('hex') == this.password){
              //the password is correct, send back a key
              return this.getPassKey();
            }
            else{
              //the password was incorrect
              return false;
            }
          }
        },
        setters: {
          password: function(v){
            return crypto.createHash('sha1').update(v).digest('hex');
          }
        },
        
    });
    var User = db.model('_User');
    createInitialAdminIfDoesntExist();
    
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
        console.log('Found result: ' + result.contentid);
        setTimeout(function(){
          contentmodel.find({ _id: result.contentid }).first(function(contentitem){
            console.log(sys.inspect({location: result, content: contentitem}));
            callback({location: result, content: contentitem});
          });
        }, 100)
        
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
      console.log('Looking for the this path in the database: ' + sys.inspect(path));
      var i = 0;
      //recursive function that goes until we get to the end of the page
      var iter = function(cursor){
        
        console.log('Currently the cursor is at: ' + (cursor? cursor.slug : 'NOTHING') );
        console.log('here ? (path.length) = '+ (path.length) + " i="+i);
        if(!cursor){
          //we got nothing, this is a 404
          console.log('here 2');
          callback(false);
        }
        else if(i == (path.length)){
          console.log('here 3');
          //we found it, lets return it in the callback
          console.log('ok I think we found it:');
          console.log(sys.inspect(cursor));
          processFoundResult(cursor,callback);
        }
        else{
          console.log('here 4');
          //still going keep iterating
          var tofind = { parentid: cursor._id, slug: path[i++] };
          console.log('Still not there, now we are looking for: ' + sys.inspect(tofind));
          NodeCMSContentGraph.find(tofind).first(iter);
        }
      };
      //alright lets kick it off by grabing the root item (the one with a parentid of 0)
      NodeCMSContentGraph.find({ parentid: 0 }).first(iter);
    }
    
    function getUserByUsername(username, callback){
      User.find({ username: username }).first(function(result){
        callback(result);
      });
    }
    
    function getUserByEmail(email, callback){
      User.find({ email: email }).first(function(result){
        callback(result);
      });
    }
    
    this.authenticateByUsername = function(username, password, callback){
      getUserByUsername(username, function(user){
        if(user){
          callback(user.validatePassword(password));
        }
        else{
          callback(false);
        }
      });
    }
    
    this.authenticateByEmail = function(email, password, callback){
      getUserByEmail(email, function(user){
        if(user){
          callback(user.validatePassword(password));
        }
        else{
          callback(false);
        }
      });
    }
    

    /////////////////////////////////////////////////////
    //           primatives
    ////////////////////////////////////////////////////
    var fieldTypes = {
      Text: String,
      RichText: String
    }
  
    function setupPrimativeContentTypes(){
      //folder
      that.createContentType('Folder', {
        properties: ['article'],
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
      //uploaded Image:TODO
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
    
    function createInitialAdminIfDoesntExist(){
      if(settings.InitialUser){
        getUserByUsername(settings.InitialUser.username, function(user){
          if(!user){
            //the Initial Admin User does not exist, so we should create it
            var u = new User();
            u.username = settings.InitialUser.username;
            u.password = settings.InitialUser.password;
            u.firstname = settings.InitialUser.firstname;
            u.lastname = settings.InitialUser.lastname;
            u.email = settings.InitialUser.email;
            u.permissions = ['admin'];
            u.save(function(){console.log('Created Initial Admin User: ' + u.username);});
          }
        });
      }
    }
    
    
  }
})()