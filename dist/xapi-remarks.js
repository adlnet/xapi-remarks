(function(ADL){

  // global variables
  var baseuri = "http://example.com/";
  // ADL verbs
  var verbs = ['answered','asked','attempted','attended','commented','completed','exited','experienced','failed','imported','initialized','interacted','launched','mastered','passed','preferred','progressed','registered','responded','resumed','scored','shared','suspended','terminated','voided'];
  // uri regex pattern
  var re_uri = /[-a-zA-Z0-9@:%_\+.~#?&//=]{2,256}\.[a-z]{2,4}\b(\/[-a-zA-Z0-9@:%_\+.~#?&//=]*)?/gi;


  // Merge two JSON object
  function mergeJSON(obj1, obj2, result) {
    result = {};
    for(var key in obj1) result[key]=obj1[key];
    for(var key in obj2) result[key]=obj2[key];
    return result;
  }

  XAPIRemarks = function() {
    
    /* 
     * Convert a Remark String into an array
     * @param {string} remark formated string
     * @return {array} javascript array with xAPI Statement properties
     */
    this.remarkToArray = function(remark) {
      var re = /(<.+>) (<.+>) (<.+>)(\s?(\(.+\)))?(\s?(\{.+\}))?(\s?(\[.+\]))?/;
      var raw = remark.match(re);
      if (raw) {
        var arr = [];
        var i=0;
        //console.log(raw);
        raw.forEach(function(val) {
          // throw out "duplicates" created by the regex groupings
          if (i != 0 && i != 4 && i != 6 && i != 8) {
            // throw out empty groups
            if (val != undefined)
              arr.push(val);
          }
          i++;
        });
        return arr;
      }
    };

    /*
     * Convert an array with xAPI Statement properties
     * @param {array} array of xAPI Statement properties
     * @return {object} an xAPI Statement Object
     */
    this.remarkArrayToStatement = function(array) {
      //console.log(array);
      if (array.length > 3) {
        var avo = array.slice(0,3);
        var ex  = array.slice(3);
      } else {
        var avo = array;
      }
      var actor = avo[0].slice(1).slice(0,-1);
      var verb = avo[1].slice(1).slice(0,-1);
      var object = avo[2].slice(1).slice(0,-1);

      // Check if full URI or in ADL verb list
      if (verbs.indexOf(verb) != -1) {
        verburi = 'http://adlnet.gov/expapi/verbs/' + verb;
      } else if (verb.match(re_uri) == null) {
        verburi = baseuri + 'verbs/' + verb;
      } else {
        verburi = verb;
        verb = verburi.split(/\//).pop();
      }

      // Check if full URI or needs to be made into one
      if (object.match(re_uri) == null) {
        objecturi = baseuri + 'activities/' + encodeURI(object);
      } else {
        objecturi = object;
      }

      var stmt = {
        'actor': {
          'mbox': 'mailto:' + actor,
          'objectType': 'Agent'
        },
        'verb': {
          'display': {
            'en-US': verb
          },
          'id': verburi
        },
        'object': {
          'id': objecturi,
          'objectType': 'Activity'
        }
      };
      // If more than an Actor, Verb and Object exist
      if (ex) {
        var stmt_ex = {};
        ex.forEach(function(o) {
          var type = o.substring(0,1);
          switch (type) {
            // result
            case "(":
              // turn it into JSON
              obj = JSON.parse(o.replace(/\(/g,"{").replace(/\)/g,"}").replace(/([sdrwc]{1}): (\[|"|true|false)/g,'"$1": $2').trim());
              stmt_ex = { 'result': {} };
              for(var key in obj) {
                switch (key) {
                  case 's':
                    var s = obj[key];
                    stmt_ex.result.score = {
                      'raw': s[0],
                      'min': s[1],
                      'max': s[2]
                    };
                  break;
                  case 'w': // success / win (s taken for score)
                    var w = obj[key];
                    stmt_ex.result.success = w;
                  break;
                  case 'c':
                    var c = obj[key];
                    stmt_ex.result.completion = c;
                  break;
                  case 'r':
                    var r = obj[key];
                    stmt_ex.result.response = r;
                  break;
                  case 'd':
                    var d = obj[key];
                    stmt_ex.result.duration = d;
                  break;
                  default:
                }
              }


            break;
            // context
            case "{":
              obj = JSON.parse(o.replace(/\(/g,"{").replace(/\)/g,"}").replace(/([pg]{1}): (\[|")/g,'"$1": $2').trim());
              stmt_ex = { 'context': { 'contextActivities' : {} } };
              for(var key in obj) {
                switch (key) {
                  case 'p':
                    var ps = obj[key];
                    var parent_arr = [];
                    ps.forEach(function(p) {
                      
                      if (p.match(re_uri) == null) {
                        puri = baseuri + 'activities/' + encodeURI(p);
                      } else {
                        puri = p;
                        p = puri.split(/\//).pop();
                      }

                      parent_arr.push({
                       "definition": {
                            "name": {
                                "en-US": p
                            }
                        },
                        'id': puri,
                        'objectType': 'Activity'
                      });
                    });
                    stmt_ex.context.contextActivities['parent'] = parent_arr;
                  break;
                  case 'g':
                    var gs = obj[key];
                    var grouping_arr = [];
                    gs.forEach(function(g) {
                      
                      if (g.match(re_uri) == null) {
                        guri = baseuri + 'activities/' + encodeURI(g);
                      } else {
                        guri = g;
                        g = puri.split(/\//).pop();
                      }

                      grouping_arr.push({
                       "definition": {
                            "name": {
                                "en-US": g
                            }
                        },
                        'id': guri,
                        'objectType': 'Activity'
                      });
                    });
                    stmt_ex.context.contextActivities['grouping'] = grouping_arr;
                  break;
                  default:
                }
              }
            break;
            // attachments
            case "[":
            break;
            default:
          }
          stmt = mergeJSON(stmt, stmt_ex);
        });
      }
      return stmt;
    };

  };
 
  ADL.XAPIRemarks = new XAPIRemarks;
  
}(window.ADL = window.ADL || {}));