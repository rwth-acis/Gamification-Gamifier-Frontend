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
    gameId,
    epURL = "http://gaudi.informatik.rwth-aachen.de:8086/",
    roleURL = "http://gaudi.informatik.rwth-aachen.de:8073/",
    gitHubURLGroup = "https://github.com/CAE-Gamified/",
    visualizationWidgetURL = "https://rwth-acis.github.io/Gamification-Visualization-Frontend/widget.xml",
    eventdata = [],
    actiondata = [],
    feedbackTimeout,
    loadedModel = null,
    repoName,
    notification;

function miniMessageAlert(msgObj,message,type){
  var msg = msgObj.createTimerMessage(message, 5);
  switch(type){
    case "danger": msg.style.backgroundColor = "red";
    break;
    case "success": msg.style.backgroundColor = "green";
    break;
    default: msg.style.backgroundColor = "blue";
  }
  msg.style.color = "white";
}

var init = function() {
  var iwcCallback = function(intent) {
    console.log(intent);
  };
  client = new Las2peerWidgetLibrary(epURL, iwcCallback);
  notification = new gadgets.MiniMessage("GAMEGAMIFIER");

  $('#load-data').on('click', function() {
    if($("#gameid").val()){    
      loadData();
    }
    else{
      feedback("Game ID is not defined");
    }
  });


  $('#go-next-integrate-phase').on('click', function() {
    setActiveTab(3);
  });
  // $('#generate-json').on('click', function() {
  //   var generatedJSON = generateJSON();
  //   saveJSONfile(generatedJSON);
  // });
  $('#generate-repo').on('click', generateButtonListener);
  

}

function generateButtonListener() {
  var generatedJSON = generateJSON();
  generateJSfile(generatedJSON);
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
  var contentTemplate = _.template($("#content").html());
  var contentElmt = $(".content-wrapper");

    if(result === "success"){
      memberId = oidc_userinfo.preferred_username;
        
      console.log(oidc_userinfo);

      contentElmt.html(contentTemplate);
      init();
    } else {

      contentElmt.html("<div class=\"text-center\"><b>Unauthorized</b></div>");
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
  gameId = $("#gameid").val();
  console.log("GET JSON");
  $.when(getActionData(),getModelData()).done(function(adata,jdata){
    renderTable(adata[0],jdata);
    // Notify user and go to next section

    feedback("Data loaded. Now match the data.")
    setActiveTab(2)

  }).fail(function(error){
    feedback("Error retrieving actions and event. " + error.responseText);
  });
}

function setActiveTab(tabNumber){
  $('.tab-pane').removeClass("in");
  $('.tab-pane').removeClass("active");
  $('.tab-content').find('#'+tabNumber).addClass("in");
  $('.tab-content').find('#'+tabNumber).addClass("active");


  $('ul.pagination li').removeClass("active");
  $('ul.pagination').find('a[href$="'+tabNumber+'"]').parent().addClass('active');
}

var getActionData = function(){
  var endPointURL = epURL + "gamification/gamifier/actions/" + gameId;
  //var query = "?current=1&rowCount=-1&searchPhrase=";
  feedback("Get Action Data..");
  return $.get(useAuthentication(endPointURL));
};

var getModelData = function() {
  feedback("Get Model Data..");
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
    newRow += "<tr class=\"text-center\"><td colspan=\"7\" style=\"background-color:#ffffff\"><a id='clearall'>clear all</a></td>";
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
  // $("#clearall")on("click",function(e){
  //   console.log("clear all");
  //   var actionNodes = $("tbody").find(".action");
  //   _.forEach(actionNodes,function(node){
  //   console.log(node);
  //     $(node).html("");
  //   });
  // });
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
  $("#newRepoName").val(repoName);
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
  var aopScript = "";

  _.forEach(generatedJSON,function(JSONdata){
    aopScript += "\
      $.aop.after( {target: window, method: '"+ JSONdata.functionName +"'},\
        function() { \
          advice('"+ JSONdata.action +"');\
        }\
      );"
  });

  aopScript = js_beautify(aopScript, { indent_size: 2 });

  var newRepoName;

  if($("#newRepoName").val()){
    newRepoName = $("#newRepoName").val();
  }
  else{
    newRepoName = repoName;
  }

  // post to github
  var dataJSON = {
    originRepositoryName: repoName, 
    newRepositoryName: newRepoName,
    gameId : gameId,
    epURL : epURL,
    aopScript : aopScript
  };
  $("#status").val("Uploading files...");
  var dataJSON = JSON.stringify(dataJSON); 


  $('#generate-repo').off('click');
  $.post(
    useAuthentication(epURL + "gamification/gamifier/repo"),
    dataJSON,
    function(data, status){
      console.log("Github upload success");
      feedback("Github upload success");
      //   var blob = new Blob([mainScript], {type: "text/plain;charset=utf-8"});
      // saveAs(blob, "gamifier.js");

      $("a#urlRepo").html(gitHubURLGroup+newRepoName);
      $("a#urlRepo").attr("href", gitHubURLGroup+newRepoName);

      // Generate Space
      console.log($("#generate-space").prop("checked"));
      if($("#generate-space").prop("checked")){

        generateSpace(newRepoName);
      }
      else{

        $("a#urlSpace").html(" - ");
      }
    }).always(function(){

      $('#generate-repo').on('click', generateButtonListener);
    });
}

// Space

function createSpace(spaceLabel,spaceTitle){
    var url = roleURL + "spaces/" + spaceLabel;
    var deferred = $.Deferred();
    var innerDeferred = $.Deferred();

    //Delete space if already exists
    openapp.resource.get(url,function(data){
        if(data.uri === url){
            openapp.resource.del(url,function(){
                innerDeferred.resolve();
            });
        } else {
            innerDeferred.resolve();
        }
    });

    //Create space
    innerDeferred.then(function(){
        openapp.resource.post(
                roleURL + "spaces",
                function(data){
                    deferred.resolve(data.uri);
                },{
                    "http://www.w3.org/1999/02/22-rdf-syntax-ns#predicate":"http://purl.org/role/terms/space",
                    "http://purl.org/dc/terms/title":spaceTitle,
                    "http://www.w3.org/2000/01/rdf-schema#label": spaceLabel
                }
        );
    });
    return deferred.promise();
}

function addWidgetToSpace(spaceURI,widgetURL){
    var deferred = $.Deferred();
    openapp.resource.post(
            spaceURI,
            function(data){
                deferred.resolve(data.uri);
            },{
                "http://www.w3.org/1999/02/22-rdf-syntax-ns#predicate":"http://purl.org/role/terms/tool",
                "http://www.w3.org/1999/02/22-rdf-syntax-ns#type":"http://purl.org/role/terms/OpenSocialGadget",
                "http://www.w3.org/2000/01/rdf-schema#seeAlso":widgetURL
            }
    );
    return deferred.promise();
}


function generateSpace(newRepoName){
  console.log("Generate Space : " + newRepoName);
  var _spaceLabel = newRepoName;
  var _spaceURI = roleURL + "spaces/" + newRepoName;
  var _applicationWidgetURL = "https://cae-gamified.github.io/"+newRepoName+"/widget.xml";

  $.when(
    createSpace(_spaceLabel,_spaceLabel)
  ).then(function(){
    return addWidgetToSpace(_spaceURI, visualizationWidgetURL)
    .then(function(){
      return addWidgetToSpace(_spaceURI, _applicationWidgetURL)
      .done(function(){
        feedback("New Space Created");

        feedback("Done");
        $("a#urlSpace").html(_spaceURI);
        $("a#urlSpace").attr("href", _spaceURI);
      }).fail(function(error){
        feedback("Error creating new space. " + error);
      });
    });
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

