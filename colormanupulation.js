// TEST - FOR CHCK
console.log("connected");

boxes = document.getElementsByClassName("box");

/* This is the first Function to be called */

var colorsetup = function () {

   document.getElementById("top").style.background = "rgb(224,224,224)";

   for (var i = 0; i < boxes.length; i++) {
     boxes[i].style.display = "flex";
     boxes[i].style.backgroundColor = generatecolor();
   }

    x = boxes[selection()].style.backgroundColor;

       $(".box").click(function () {
         if ( this.style.backgroundColor == x ){
            correctcolor();
         }else {
           console.log(this.style.backgroundColor);
           document.getElementById("myModal1").style.display= "block" ;
           this.style.display = "none";
           return;
         }
       });
    }

function selection() {

    var tar = Math.floor(Math.random() * 6);

      for (var i = 0; i < boxes.length; i++) {
        if (i == tar) {
          var q = document.getElementById("colorCode");
          q.innerText = boxes[i].style.backgroundColor;
        }
      }

      return tar;

}


function correctcolor() {
    document.getElementById("myModal2").style.display= "block" ;
    document.getElementById("top").style.backgroundColor = x;
    console.log("GAME WON");
}


function originalstate() {

   document.getElementById("myModal1").style.display= "none" ;
   document.getElementById("myModal2").style.display= "none" ;

}

var generatecolor = function (){

  var a = Math.floor(Math.random() * 256);
  var b = Math.floor(Math.random() * 256);
  var c = Math.floor(Math.random() * 256);


  var bgcolor = "rgb(" + a + "," + b + "," + c + ")";

  return bgcolor;

 }

/*setInterval(function(){

  colorsetup();

}, 4000);*/

/*for(var i=0;i <x.length;i++){
  x[i].addEventListener("click", function(){
    this.style.color = "pink";
    console.log(this.style.backgroundColor);
  });
}*/
