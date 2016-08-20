/*
 * Copyright (c) 2015 Advanced Community Information Systems (ACIS) Group, Chair
 * of Computer Science 5 (Databases & Information Systems), RWTH Aachen
 * University, Germany All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * Redistributions of source code must retain the above copyright notice, this
 * list of conditions and the following disclaimer.
 *
 * Redistributions in binary form must reproduce the above copyright notice,
 * this list of conditions and the following disclaimer in the documentation
 * and/or other materials provided with the distribution.
 *
 * Neither the name of the ACIS Group nor the names of its contributors may be
 * used to endorse or promote products derived from this software without
 * specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */

 // global variables
var client,
    appId,
    epURL = "http://localhost:8081/",
    eventdata = [],
    actiondata = [],
    feedbackTimeout,
    loadedModel = null,
    repoName;
    
var init = function() {
  var iwcCallback = function(intent) {
    console.log(intent);
  };
  client = new Las2peerWidgetLibrary(epURL, iwcCallback);

  $('#load-data').on('click', function() {
    if($("#appid").val()){    
      loadData();
    }
    else{
      feedback("App ID is not defined");
    }
  });
  // $('#generate-json').on('click', function() {
  //   var generatedJSON = generateJSON();
  //   saveJSONfile(generatedJSON);
  // });
  $('#generate-repo').on('click', function() {
    var generatedJSON = generateJSON();
    generateJSfile(generatedJSON);
  });
  // $('#clear-data').on('click', function() {
  //   resetCurrentModel();
  // })
  // $('#store-data').on('click', function() {
  //   storeModel();
  // })
}

var useAuthentication = function(rurl){
    if(rurl.indexOf("\?") > 0){ 
      rurl += "&access_token=" + window.localStorage["access_token"];
    } else {
      rurl += "?access_token=" + window.localStorage["access_token"];
    }
    return rurl;
  }

function signinCallback(result) {
    if(result === "success"){
      memberId = oidc_userinfo.preferred_username;
        
      console.log(oidc_userinfo);
      init();
    } else {
      console.log(result);
      console.log(window.localStorage["access_token"]);
    }
    if(result === "success"){
      $("#login-text").find("h4").html("Welcome " + memberId + "!");
    } else {
      $("#login-text").find("h4").html("You are not authenticated, try to login using Open ID Learning Layers.");
    }
}

function generateJSON(){
  // input validation
  var relRows = $("#relation").find("tbody tr");
  console.log(relRows);

  // convert rows data to JSON
  var arr = [];
  _.forEach(relRows,function(row){
    if($(row).find("td.action").html()){
      var obj = {
        eltype : $(row).find("td.eltype").html(),
        elidname : $(row).find("td.elidname").html(),
        eventCause : $(row).find("td.eventCause").html(),
        functionName : $(row).find("td.functionName").html(),
        action : $(row).find("td.action").html()
      };
      arr.push(obj);     
    }

  });
  
  console.log(JSON.stringify(arr));
  return arr;
  // data preparation
  // file generation
}

function saveJSONfile(generatedJSON){
  if(generatedJSON.length > 0){
     var link = document.createElement('a');
      link.download = "gamifier.json";
      link.href = 'data:,' + encodeURI(JSON.stringify(generatedJSON, null, 4));
      link.click();
  }
}

function loadData(){
  appId = $("#appid").val();
  console.log("GET JSON");
  $.when(getActionData(),getModelData()).done(function(adata,jdata){
    renderTable(adata[0].rows,jdata);
  }).fail(function(error){
    feedback("Error retrieving actions and event. " + error.responseText);
  });
}

var getActionData = function(){
  var endPointURL = epURL + "gamification/actions/" + appId;
  var query = "?current=1&rowCount=-1&searchPhrase=";
  return $.get(useAuthentication(endPointURL+query));
};

var getModelData = function() {
  var d = $.Deferred();
    openapp.resource.get(openapp.param.space(), (function(space){
      console.log("Space " + JSON.stringify(space));
      var resourceUri, resourceObj, values;
      var listOfDataUris = [];
      for(resourceUri in space.data){
        if(space.data.hasOwnProperty(resourceUri)){
          resourceObj = space.data[resourceUri];
          if(resourceObj['http://www.w3.org/1999/02/22-rdf-syntax-ns#type'] &&
              _.isArray(resourceObj['http://www.w3.org/1999/02/22-rdf-syntax-ns#type'])){

            values = _.map(resourceObj['http://www.w3.org/1999/02/22-rdf-syntax-ns#type'],function(e){
              return e.value;
            });

            if(_.contains(values,"http://purl.org/role/terms/Data") && _.contains(values,"my:ns:model")){
              listOfDataUris.push(resourceUri);
            }

          }
        }
      }
      console.log("List " + listOfDataUris);
      if(listOfDataUris.length > 0){
        
      
          $.get(listOfDataUris[0]+"/:representation").done(function(data){
                   // add name, version and type to model
           //console.log("MODEL :" + JSON.stringify(data));
           // COLLECT HTML ELEMENT - EVENTS AND EVENTS - FUNCTIONS RELATIONS
             processJSONdata(d,data);
            
         });
       }else {
         feedback("No model!");
         d.reject();
       }

    })); 
    return d.promise();
};

var renderTable = function(actiondata,eventdata){
    console.log("JDATA " + JSON.stringify(eventdata));
    console.log("ADATA " + JSON.stringify(actiondata));
  if(actiondata.length > 0 && eventdata.length > 0){
    eventdata = simplifyJSONdata(eventdata);


    var newRow;
     $("table#relation").find("tbody").empty();
     console.log("EVENT LENGTH " + eventdata.length);
     newRow = "";
    for(var i = 0; i < eventdata.length; i++){
      newRow += "<tr>";
      newRow += "<td class='eltype'>"+eventdata[i].eltype+"</td>";
      newRow += "<td class='elidname'>"+eventdata[i].elidname+"</td>";
      newRow += "<td class='eventCause'>"+eventdata[i].eventCause+"</td>";
      newRow += "<td class='functionName'>"+eventdata[i].functionName+"</td>";
      newRow += "<td class='action'></td>";
      newRow += "<td>";
      newRow += "<div class='dropdown'>\
      <button class='btn btn-primary dropdown-toggle' type='button' data-toggle='dropdown'>Action\
      <span class='caret'></span></button>\
      <ul class='dropdown-menu'>";
        _.forEach(actiondata, function(data){
          newRow += "<li><a href='#'>"+ data.id+"</a></li>";
        });
      newRow += "</ul></td>";
      newRow += "<td><a class='clear'>clear</a></td>";
    }
    newRow += "<tr class=\"text-center\"><td colspan=\"7\"><a id='clearall'>clear all</a></td>";
    $("table#relation").find("tbody").append(newRow);
    tableListener();
  }
  else{
    feedback("Failed to  render table");
  }
};

var tableListener = function(){
  $("table#relation").find("tbody").on("click",".dropdown-menu li",function(e){
    var action = $(e.target).html();
    console.log("Action selected : " + action);
    var node = $(e.target).parent().parent().parent().parent().parent().find(".action");
    $(node).html(action);
  });
  $("table#relation").find("tbody").on("click",".clear",function(e){
    console.log("clear");
    var node = $(e.target).parent().parent().find(".action");
    console.log(node);
    $(node).html("");
  });
  $("table#relation").find("tbody").on("click","#clearall",function(e){
    console.log("clear all");
    var actionNodes = $("tbody").find(".action");
    _.forEach(actionNodes,function(node){
    console.log(node);
      $(node).html("");
    });
  });
};

var simplifyJSONdata = function(jsondata){
  var resArray = [];
  _.forEach(jsondata, function(data){
    var resObj = {};
    for (var key in data.el.attributes) {
      if (data.el.attributes.hasOwnProperty(key)) {
        console.log("this " + JSON.stringify(data.el.attributes[key]));
        if(data.el.attributes[key].name == "type"){
          resObj.eltype = data.el.attributes[key].value.value;
        }
        if(data.el.attributes[key].name == "id"){
          resObj.elidname = data.el.attributes[key].value.value;
        }
      }
    }
    for (var key in data.event.attributes) {
      if (data.event.attributes.hasOwnProperty(key)) {
        if(data.event.attributes[key].name == "eventCause"){
          resObj.eventCause = data.event.attributes[key].value.value;
        }
        if(data.event.attributes[key].name == "id"){
          resObj.eventName = data.event.attributes[key].value.value;
        }
      }
    }
    for (var key in data.func.attributes) {
      if (data.func.attributes.hasOwnProperty(key)) {
        if(data.func.attributes[key].name == "name"){
          resObj.functionName = data.func.attributes[key].value.value;
        }
      }
    }
    resArray.push(resObj);
  });
  return resArray;
};

var processJSONdata = function(def,data){

  var html2event = [], event2function = [];
  
  repoName = data.attributes.label.value.value;
  repoName = repoName.replace(/ /g,"-");
  repoName = "frontendComponent-" + repoName;
  console.log("REPONAME : " + repoName);

  console.log("E2F ");
  for (var key in data.edges) {
    if (data.edges.hasOwnProperty(key)) {
      if(data.edges[key].type == "Event to Function Call"){
        event2function.push({
          source: data.edges[key].source,
          target: data.edges[key].target
        });
         console.log(key + " -> " + JSON.stringify(data.edges[key]));
      }
     
    }
  }
  if(event2function.length > 0){

    console.log("H2E ");
    _.forEach(event2function, function(relObj) {

      for (var key in data.edges) {
        if (data.edges.hasOwnProperty(key)) {
          if(data.edges[key].type == "HTML Element to Event" && data.edges[key].target == relObj.source){
            html2event.push({
              source: data.edges[key].source,
              target: data.edges[key].target
            });
             console.log(key + " -> " + JSON.stringify(data.edges[key]));
             break;
          }
         
        }
      }
    });

    // Parse event-function pair, connect three pair
    var pairid = [];
    if(html2event.length > 0){
        _.forEach(html2event, function(h2e) {
          _.forEach(event2function, function(e2f) {
              if(h2e.target == e2f.source){
                pairid.push({
                  el: h2e.source,
                  event: h2e.target,
                  func: e2f.target
                });
                return true;
              }
          });
        });

      if(pairid.length > 0){
        // Collect node name

        // console.log("PAIRID " + JSON.stringify(pairid));
        var pairdata = [];
        _.forEach(pairid, function(id) {
          var resObj = {};
          // search element
          for (var key in data.nodes) {
            if (data.nodes.hasOwnProperty(key)) {
              // console.log("IDEL " + id.el + " " + JSON.stringify(id));
              // console.log("KEL " + key + " " + JSON.stringify(data.nodes[key]));
              if(key == id.el){
                // console.log("MATCH " + JSON.stringify(data.nodes[key]));
                resObj.el = data.nodes[key];
                break;
              }
            }
          }
          // console.log("res " + JSON.stringify(resObj));
          // search event
          for (var key in data.nodes) {
            if (data.nodes.hasOwnProperty(key)) {
              if(key == id.event){
                resObj.event = data.nodes[key];
                break;
              }
            }
          }
          // search function
          for (var key in data.nodes) {
            if (data.nodes.hasOwnProperty(key)) {
              if(key == id.func){
                resObj.func = data.nodes[key];
                break;
              }
            }
          }

          if(resObj.el && resObj.event && resObj.func){
            pairdata.push(resObj);
          }
          else{
            console.log(JSON.stringify(pairdata));
            feedback("Failed to find the nodes");
          }
        });

        if(pairdata.length > 0){
          eventdata = pairdata;
          def.resolve(eventdata);
          console.log("PAIRDATA " + JSON.stringify(pairdata));
        }
        else{
          def.reject();
        }
      }
      else{
         feedback("No Connection between HTML Element - Event - Function");
          def.reject();
      }

    }
    else{
      feedback("No HTML Element to Event Relation");
    def.reject();
    }
  }
  else{
    feedback("No Event to Function Relation");
    def.reject();
  }
  return false;
};

function generateJSfile(generatedJSON){
  // Get frontendcomponent repo name
  // Post and push to github
  var URL_aop_library = "https://dl.dropboxusercontent.com/u/57683747/CAE-Example/whiteboard/gamification/aop.pack.js";
  var URL_oidc_widget = "https://dl.dropboxusercontent.com/u/57683747/CAE-Example/whiteboard/gamification/oidc-widget.js";

  var aopScript = "";

  _.forEach(generatedJSON,function(JSONdata){
    aopScript += "\
      $.aop.after( {target: window, method: '"+ JSONdata.functionName +"'},\
        function() { \
          advice('"+ JSONdata.action +"');\
        }\
      );"
  });

  // var mainScript = "\
  // var memberId, appId = '';\
  // var advice = function(actionId){\
  //    $.post(\
  //   '" + epURL + "visualization/actions/'+appId+'/'+actionId+'/'+memberId,\
  //   '',\
  //   function(data, status){\
  //     console.log('Trigger success : ' + actionId);\
  //   });\
  // };\
  // var initGamification = function(){\
  //   " + aopScript + "\
  // };\
  // function signInCallback(result){\
  //   if(result === 'success'){\
  //     memberId = oidc_userinfo.preferred_username;\
  //       console.log(oidc_userinfo);\
  //       console.log('Logged in!');\
  //       initGamification();\
  //   } else {\
  //       console.log(result);\
  //       console.log(window.localStorage['access_token']);\
  //   }\
  // }\
  // function loadScript(url, callback){\
  //     var head = document.getElementsByTagName('head')[0];\
  //     var script = document.createElement('script');\
  //     script.type = 'text/javascript';\
  //     script.src = url;\
  //     script.onreadystatechange = callback;\
  //     script.onload = callback;\
  //     head.appendChild(script);\
  // }\
  // function loadAOPLibrary(callback){\
  //   loadScript('" + URL_aop_library + "',callback);\
  // }\
  // function loadOIDCWidget(){\
  //   loadScript('" + URL_oidc_widget + "',loadLibraryCallback);\
  // }\
  // function loadLibraryCallback(){\
  //   console.log('success load library');\
  // }\
  // $(document).ready(function () {\
  //   loadAOPLibrary(loadOIDCWidget);\
  // });";


  // mainScript = js_beautify(mainScript, { indent_size: 2 });
  aopScript = js_beautify(aopScript, { indent_size: 2 });

  // post to github
  var dataJSON = {
    originRepositoryName: repoName, 
    appId : appId,
    epURL : epURL,
    aopScript : aopScript
  };
  $("#status").val("Uploading files...");
  var dataJSON = JSON.stringify(dataJSON); 
  $.post(
    useAuthentication(epURL + "gamification/applications/repo"),
    dataJSON,
    function(data, status){
      console.log("Github upload success");
      feedback("Github upload success");
      //   var blob = new Blob([mainScript], {type: "text/plain;charset=utf-8"});
      // saveAs(blob, "gamifier.js");
    });

}



$(document).ready(function() {
});


// displays a message in the status box on the screen for the time of "feedbackTimeout"
feedback = function(msg){
    $("#status").val(msg);
    clearTimeout(feedbackTimeout);
    feedbackTimeout = setTimeout(function(){
      $("#status").val("");
    },6000);
};
