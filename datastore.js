(function(){
  /////////////////////////////////////////////////////
  //           inital setup
  ////////////////////////////////////////////////////
  exports.Datastore = function(settings){
    require(__dirname + "/lib/setup").ext( __dirname + "/lib"); 
    var mongoose = require('mongoose/mongoose').Mongoose;
    var underscore = require('underscore')._;
    var crypto = require('crypto');
    var sys = require('sys');
    var that = this;
    //setup the db
    var db = mongoose.connect(settings.MongoConnectionString);
    this.contentTypes = [];
    
    //////////////////////////////////////////////////
    //            System Models
    /////////////////////////////////////////////////
    //contentgraph model
    mongoose.model('NodeCMSContentGraph', {
        properties: ['slug', 'template', 'parentid', 'contentid', 'contenttype', 'hidden_from_navigation'],
        indexes: ['slug', 'contentid', 'parentid', 'contenttype'],
        methods : {
          getChildren: function(callback){
            NodeCMSContentGraph.find({ parentid: that.convertIdToString(this._id) }).all(function(result){
                console.log(sys.inspect(result));
                callback(result);
              });
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
    
    /////////////////////////////////////////////////////
    //           content creation
    ////////////////////////////////////////////////////
    
    this.createContentType = function(name, fields, methods, preRenderingTasks){
      //add the universal fields
      fields.updated_at = fieldTypes.SingleDate("Last Updated",2,true);
      fields.title = fieldTypes.Text("Title", 1);
      var properties = Object.keys(fields);
      
      //setup the model
      mongoose.model(name, {
          properties: properties,
          indexes: ['slug'],
          setters: fields,
          methods: mixin(
          { 
            save: function(fn){
                this.updated_at = new Date();
                this.__super__(fn);
            },
            getProperties: function(){
              var thismodel = this;
              return underscore.sortBy(properties.map(function(item){
                if(thismodel[item] == null){
                  thismodel[item] = '';
                }
                return { name: item, value: thismodel[item]};
              }), function(item){
                item.value.adminOrder;
              }).reverse();
            },
            preRenderingTasks: preRenderingTasks
          },methods)});
        //add it to the content type list
        this.contentTypes.push(name);
        
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
        toadd.slug = slugify(content.title.text);
        toadd.parentid = parentid;
        toadd.template = template;
        toadd.contentid = content._id;
        toadd.contenttype = content.contenttype;
        console.log('Adding this content to the sitemap of type: ' + toadd.contenttype);
        toadd.save(function(){
          callback(toadd);
        });
      });
      
    }

    /////////////////////////////////////////////////////
    //           content update
    ////////////////////////////////////////////////////
    this.updateContent = function(id, doc, callback){
      console.log('Trying to find node graph of id = ' + id);
      NodeCMSContentGraph.findById(id).first(function(cg){
        if(!cg){
          //didnt find it, just return false
          callback(false);
        }
        //found it
        //set the template and hidden fields on the contentgraph item
        cg.template = doc.__template;
        cg.hidden_from_navigation = doc.__hidden_from_navigation;
        //grab the content type and make the model
        var contentmodel = db.model(cg.contenttype);
        //run the save for the template
        cg.save(function(){console.log('Content Saved')});
        //delete the non-content related items from the doc
        delete doc['__template'];
        delete doc['__id'];
        //run the content update
        contentmodel.findById(cg.contentid, function(content){
          content.getProperties().forEach(function(p){
            if(doc.hasOwnProperty(p.name)){
              content[p.name] = doc[p.name];
            }
          });
          content.save(function(){
            callback(true);
          });
        });    
      });    
    }

    /////////////////////////////////////////////////////
    //           content Deletion
    ////////////////////////////////////////////////////
  
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
      console.log('Looking for the this path in the database: ' + sys.inspect(path));
      var i = 0;
      //recursive function that goes until we get to the end of the page
      var iter = function(cursor){
        if(!cursor){
          //we got nothing, this is a 404
          callback(false);
        }
        else if(i == (path.length)){
          //we found it, lets return it in the callback
          processFoundResult(cursor,callback);
        }
        else{
          //still going keep iterating
          var tofind = { parentid: that.convertIdToString(cursor._id), slug: path[i++] };
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
      Text: function(adminlabel, adminorder, uneditable){ 
        function Text(value){
          this.adminLabel = adminlabel;
          this.adminOrder = adminorder;
          this.text = value;
          this.uneditable = uneditable;
          this.type = this.constructor.name;
        }
        return function(v){ return new Text(v); };
      },
      RichText: function(adminlabel, adminorder, uneditable){ 
        function RichText(value){
          this.adminLabel = adminlabel;
          this.adminOrder = adminorder;
          this.markdownValue = value;
          this.uneditable = uneditable;
          this.htmlValue = 'not yet implemented';
          this.type = this.constructor.name;
        }
        return function(v){ return new RichText(v); };
      },
      SingleDate:  function(adminlabel, adminorder, uneditable){ 
        function SingleDate(value){
          this.adminLabel = adminlabel;
          this.adminOrder = adminorder;
          this.uneditable = uneditable;
          this.date = value;
          this.type = this.constructor.name;
        }
        return function(v){ return new SingleDate(v); };
      },
      Image: function(adminlabel, adminorder, uneditable){ 
        function Image(value){
          this.adminLabel = adminlabel;
          this.adminOrder = adminorder;
          this.url = value;
          this.alt = '';
          this.type = this.constructor.name;
        }
        return function(v){ return new Image(v); };
      },
      File: function(adminlabel, adminorder, uneditable){ 
        function File(value){
          this.adminLabel = adminlabel;
          this.adminOrder = adminorder;
          this.url = value.url;
          this.title = value.title;
          this.type = this.constructor.name;
        }
        return function(v){ return new Image(v); };
      }, 
      //TODO: Select,
      //TODO: Boolean
      //TODO: DateRange  
    }
  
    function setupInitialContentTypes(){
      //folder
      that.createContentType('Folder', {
        article: fieldTypes.RichText("Article", 3)
      });
      
      //simple page
      that.createContentType('Page', {
          article: fieldTypes.RichText("Article", 5),
          teaser: fieldTypes.Text("Summary", 3),
          hero: fieldTypes.Image('Hero Image', 4) 
      });
    }
    
    //setup the initial content types
    setupInitialContentTypes();
    
    
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
        if(objs[objkey]){
          Object.keys(objs[objkey]).forEach(function(item){
            toreturn[item] = objs[objkey][item];
          });
        }
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
    
    function createInitialRootIfDoesntExist(){
      that.getRoot(function(root){
        if(!root){
          //The database has no Root folder, lets make a new one
          newroot = that.makeContent('Folder');
          newroot.title = "Home";
          newroot.hidden_from_navigation = false;
          newroot.article = '';
          that.addContentToSitemap(newroot, 0, 'index.ejs', function(result){
            console.log('Database had no Root Folder so it was created.');
          });
        }
      });
    }
    
    this.convertIdToString = function(id){
      return JSON.stringify(id).replace(/"/g, '');
    }
    
    //////////////////////////////////////////////////
    //           Make Initials
    /////////////////////////////////////////////////
    createInitialAdminIfDoesntExist();
    createInitialRootIfDoesntExist();
  }
})()