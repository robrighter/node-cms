/* Author: 

*/

$(document).ready(function() {   
   //$( ".cta").button();
   //$( ".cta").button();
   
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
            showConfirmMessage("Success! Save complete.");
          }
          else{
            showWarningMessage('Sorry, unable to save this item.');
          }
        }
      });
      return false;
    });
   
   
   function showConfirmMessage(message){
     $('.message').removeClass('warning').addClass('confirm').html(message).slideDown('fast');
   }
   
   function showWarningMessage(message){
      $('.message').removeClass('confirm').addClass('warning').html(message).slideDown('fast');
    }
   
   
   
});






















