var Datastore = require('../datastore').Datastore;
var sys = require('sys');
var ds = new Datastore();
//add content
try{
  ds.getRoot(function(root){
    console.log('got a result: '  + sys.inspect(root));
    if(!root){
      console.log("No root item we need to make one...");
      newroot = ds.makeContent('Folder');
      newroot.title = "Test Root";
      newroot.hidden_from_navigation = false;
      newroot.article = 'This is the body copy of the article';
      ds.addContentToSitemap(newroot, 0, 'homepagetemplate.ejs', function(result){
        console.log('...Root Folder Added');
      });
    }
    else{
      //we got a root item
      console.log(root.content.title);
      console.log(root.content.article);
      root.content.getChildren(function(result){
        console.log(sys.inspect(result));
      });

    }
  });
}
catch(e){
  console.log('No Root Item');
}


//console.log(sys.inspect(ds.mixin({one: 1, two: 2}, {three: 3, four: 4}, {fn: function(){console.log('boosh');}})));

//query out the content by url