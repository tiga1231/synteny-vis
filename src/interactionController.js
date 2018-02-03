
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
    return c;
  };

  c.removeListener = function(eventName, f){
    var i = listeners[eventName].indexOf(f);
    listeners[eventName].splice(i, 1);
    return c;
  };

  c.clearListeners = function() {
    listeners = {};
    return c;
  };


  c.notifyListeners = function(eventName, args) {
    // console.log('interaction controller: ', eventName, args);
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