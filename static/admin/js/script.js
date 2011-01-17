/* Author: 

*/

$(document).ready(function() {   
   //$( ".cta").button();
   //$( ".cta").button();
   
   
   $('#editor').submit( function(){
     var formvals = $('#editor').serialize();
     $.ajax({
       type: "PUT",
       url: "/_content",
       data: formvals,
       success: function(msg){
         alert( "Data Saved: " + msg );
       }
     });
     return false;
   });
   
   
   
   
   
   
});






















