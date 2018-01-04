
var controller = undefined;

function createController() {
  var c = {};
  var listeners = {};

  //add a function to the list
  c.addListener = function(eventName='any', f=d=>d) {
    if(  !(eventName in listeners)  ){
      listeners[eventName] = [];
    }
    if(listeners[eventName].indexOf(f) == -1){
      listeners[eventName].push(f);
    }

  };


  c.clearListeners = function() {
    listeners = {};
  };


  c.notifyListeners = function(eventName, args) {

    if ('any' in listeners){
      listeners['any'].forEach(f => f(args));
    }

    if(eventName!== 'any' && eventName in listeners){
      listeners[eventName].forEach(f => f(args));
    }


  };

  controller = c;
  return c;

}


exports.getController = function(){
  if(controller !== undefined){
    return controller;
  }else{
    return createController();
  }
};