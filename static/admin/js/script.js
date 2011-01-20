/* Author: 

*/

$(document).ready(function() {   
   
   $("select, input:checkbox, input:radio, input:file").uniform();
   
   $('#editor').submit( function(){
     $('.message').slideUp('fast');
     var formvals = $('#editor').serialize();
     $.ajax({
       type: "PUT",
       url: "/_content",
       data: formvals,
       success: function(result){
         if(result.status == true){
           showConfirmMessage("Success! Save complete.");
         }
         else{
           showWarningMessage('Sorry, unable to save this item.');
         }
       }
     });
     return false;
   });
   
   $('#makenew').submit( function(){
      $('.message').slideUp('fast');
      var formvals = $('#makenew').serialize();
      $.ajax({
        type: "POST",
        url: "/_content",
        data: formvals,
        success: function(result){
          if(result.status == true){
            var currenturl = getCurrentUrl();
            window.location = removeDoubleSlashInUrl(currenturl.substr(0, currenturl.indexOf('_new')) + result.newslug + '?confirm=Success!+The+new+page+was+created.');
          }
          else{
            showWarningMessage('Sorry, unable to save this item.');
          }
        }
      });
      return false;
    });
    
    $('.subpageadder button').click(function(){
      url = '/_new/' + $('.subpageadder .contenttypeselector').val();
      window.location = removeDoubleSlashInUrl(getCurrentUrl() + url);
    });
   
   
   function showConfirmMessage(message){
     $('.message').removeClass('warning').addClass('confirm').html(message).slideDown('fast');
   }
   
   function showWarningMessage(message){
      $('.message').removeClass('confirm').addClass('warning').html(message).slideDown('fast');
    }
    
    function getCurrentUrl(){
      var currenturl = window.location + '';
      var urlendsat = currenturl.indexOf('?');
      if(urlendsat > -1){
        currenturl = currenturl.substr(0,urlendsat);
      }
      urlendsat = currenturl.indexOf('#');
      if(urlendsat > -1){
        currenturl = currenturl.substr(0,urlendsat);  
      }
      return currenturl;
    }
    
    function removeDoubleSlashInUrl(url){
      var toreturn = url.replace(/\/\//g, '/');
      toreturn = toreturn.replace(/http:\//g, 'http://');
      toreturn = toreturn.replace(/https:\//g, 'https://');
      
      return toreturn;
    }
    
    function showMessageIfOnPage(){
      if($('.message').html() != ''){
        $('.message').slideDown('fast');
      }
    }
    
    //setup the click event for going up one level
    $('#goup').click(function(){
      window.location = '../';
    });
    
    //show the confirm or warning message if it is already embedded on the page
    showMessageIfOnPage();
    
});






















