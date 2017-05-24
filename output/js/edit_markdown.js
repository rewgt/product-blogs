// edit_markdown.js

function location__(href) {
  var location = document.createElement('a');
  location.href = href;
  if (location.host == '')
    location.href = location.href;
  return location;
}

function getAsynRequest(sUrl,callback) {  // callback must passed
  var xmlHttp = null;
  if (window.XMLHttpRequest)      // Firefox, Opera, IE7, etc
    xmlHttp = new XMLHttpRequest();
  else if (window.ActiveXObject)  // IE6, IE5
    xmlHttp = new ActiveXObject('Microsoft.XMLHTTP');
  
  if (xmlHttp) {
    xmlHttp.onreadystatechange = function() {
      if (xmlHttp.readyState == 4) { // 4 is "loaded"
        if (xmlHttp.status == 200)   // success save
          callback(null,xmlHttp.responseText);
        else callback(new Error('XMLHttpRequest failed'));
        xmlHttp = null;
      }
    };
    xmlHttp.open('GET',sUrl,true);
    xmlHttp.send(null);
  }
}

// streamReactTree_() is ported from template.js
var WIDGET_PASTE_TAG_ = 'SHADOW_WIDGET_COMPONENT,';
var RE_UPCASE_ALL_ = /([A-Z])/g;

var allTagFlags = null;
var allIsPres = null;

function streamReactTree_(bTree,iLevel,iOwnerFlag) { // iOwnerFlag must be number
  iLevel = iLevel || 0;
  function headSpace() {
    return (new Array(iLevel + 1)).join('  ');
  }
  
  var sName,dProp,iFlag, firstItem = bTree[0], iChildNum = 0;
  if (Array.isArray(firstItem)) {
    iChildNum = bTree.length - 1;
    sName = firstItem[0];
    dProp = firstItem[1];
    iFlag = firstItem[2];
  }
  else {
    sName = firstItem;
    dProp = bTree[1];
    iFlag = bTree[2];
  }
  if (typeof iFlag != 'number')
    iFlag = allTagFlags[sName] || 3;
  
  var sHeadSpace = headSpace(), sRet = sHeadSpace;
  if (!sName) {
    var bHtml = dProp.html || [];
    var sTag = iOwnerFlag <= 1? "<div class='rewgt-static'>": "<span class='rewgt-static'>";
    var sTail = iOwnerFlag <= 1? '</div>': '</span>';
    
    if (bHtml.length == 0)
      sRet = '';
    else if (bHtml.length == 1) {
      sRet += sTag + bHtml[0] + sTail + '\n';
    }
    else {
      sRet += sTag + '\n';
      bHtml.forEach( function(sItem) {
        sRet += sHeadSpace + '  ' + sItem + '\n';
      });
      sRet += sHeadSpace + sTail + '\n';
    }
    return sRet;
  }
  
  var isLink = false, isPre = false;
  if (sName == 'RefDiv') {
    isLink = true; isPre = dProp['isPre.']; iChildNum = 0;  // iFlag == 2
    sRet += (isPre?'<pre $=':'<div $=') + JSON.stringify(dProp['$'] || '');
  }
  else if (sName == 'RefSpan') {  // iFlag == 3
    isLink = true; iChildNum = 0;
    sRet += '<span $=' + JSON.stringify(dProp['$'] || '');
  }
  else {
    if (iFlag == 3)  // inline tag should not use 'isPre.'
      sRet += '<span $=' + sName;
    else {
      isPre = dProp['isPre.'];
      if (!isPre && allIsPres[sName]) isPre = true; // check MarkedDiv, MarkedTable ...
      if (isPre) iChildNum = 0;   // force to no children
      sRet += (isPre?'<pre $=':'<div $=') + sName;
    }
  }
  
  var sKey_ = dProp.key, sHtmlTxt = dProp['html.'];
  if (sKey_) sRet += " key='" + sKey_ + "'";
  
  for (var sKey in dProp) {
    if (sKey == 'key' || sKey == 'html.' || sKey == '$' || sKey == 'isPre.') continue;
    
    var value = dProp[sKey];
    if (value === undefined) continue;
    
    sRet += ' ' + sKey.replace(RE_UPCASE_ALL_,'-$1').toLowerCase() + '=';
    if (typeof value == 'string' && (sKey[0] == '$' || !value || value[0] != '{' || value.slice(-1) != '}'))
      sRet += JSON.stringify(value);
    else sRet += "'{" + JSON.stringify(value).replace(/&/g,"&amp;").replace(/'/g,"&#39;").replace(/</g,"&lt;").replace(/>/g,"&gt;") + "}'";  // '"
  }
  
  if (iChildNum) {  // isPre must be false
    var subRet = '';
    for (var i=1,item; item=bTree[i]; i+=1) {
      subRet += streamReactTree_(item,iLevel+1,iFlag);
    }
    
    if (iFlag == 3) {
      if (subRet.indexOf(sHeadSpace + '  ') == 0)
        sRet += ('>' + subRet.slice(sHeadSpace.length+2));
      else sRet += ('>' + subRet);
    }
    else sRet += ('>\n' + subRet);
  }
  else {
    sRet += '>';
    if (sHtmlTxt) {
      if (isPre)
        sRet += sHtmlTxt;
      else sRet += sHtmlTxt.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
    }
  }
  
  if (isPre)
    sRet += '</pre>\n';
  else {
    if (iFlag == 3)
      sRet += '</span>\n';
    else {
      if (sHtmlTxt || sRet.slice(-1) != '\n')
        sRet += '</div>\n';
      else sRet += (sHeadSpace + '</div>\n'); // no 'html.' and end with '\n', let it look better
    }
  }
  return sRet;
}

function insertJsonX_(node,startPos,endPos,dOpt,iLevel) { // node is textarea
  if (!Array.isArray(dOpt.widget)) return;
  
  var insTxt = streamReactTree_(dOpt.widget,iLevel,1);
  if (!insTxt) return;
  if (iLevel > 0) {
    var sPre = new Array(iLevel+1).join('  ');
    if (insTxt.indexOf(sPre) == 0) insTxt = insTxt.slice(sPre.length);
  }
  
  if (typeof startPos == 'number') {
    var s = node.value;
    node.value = s.slice(0,startPos) + insTxt + s.slice(endPos);
    node.selectionEnd = node.selectionStart = startPos + insTxt.length;
  }
  else if (document.selection) { // IE
    node.focus();
    var sel = document.selection.createRange();
    sel.text = insTxt;
  }
  else node.value += insTxt;
}

function onStart_() {
  var applyButton   = document.querySelector('#btn-apply');
  var cancelButton  = document.querySelector('#btn-cancel');
  var htmlRadio     = document.querySelector('#pg-html');
  var markedRadio   = document.querySelector('#pg-mark');
  var markedEditor  = document.querySelector('#txt-widget > .editor');
  var previewHtml   = document.querySelector('#txt-html');

  var taskId = 0, inValue = null;
  var markTextChanged = false, markAnyChanged = false;
  
  function initGui() {
    var sHtml = inValue[0];  // sPath = inValue[1]
    allTagFlags = inValue[2] || [{},{}];
    allIsPres = allTagFlags[1]; allTagFlags = allTagFlags[0];
    
    previewHtml.style.height = (window.innerHeight - 70) + 'px';
    markedEditor.parentNode.style.height = (window.innerHeight - 70) + 'px';
    markedEditor.value = sHtml;
  }
  
  function closeDialog(isClose,isCancel) {
    var outValue = null, changed = true;
    if (isCancel || !inValue || !(markTextChanged || markAnyChanged))
      changed = false;
    else outValue = [markedEditor.value,inValue[1]];
    
    var s = '[PROJECT_NAME]' + JSON.stringify({method:'onDialogExit',param:[isClose,changed,taskId,outValue]});
    window.parent.window.postMessage(s,'*');
  }
  
  applyButton.onclick = function(event) {
    if (!inValue || !markTextChanged) return;
    
    var outValue = [markedEditor.value,inValue[1]];
    var s = '[PROJECT_NAME]' + JSON.stringify({method:'onDialogExit',param:[false,true,taskId,outValue]}); // isClose=false, changed=true
    window.parent.window.postMessage(s,'*');
    
    markTextChanged = false; markAnyChanged = true;
  };
  cancelButton.onclick = function(event) {
    closeDialog(true,true);
  };
  markedEditor.onchange = function(event) {
    markTextChanged = true;
  };
  
  function transferHasType(transfer,sType) { // transfer.types.contains() for firefox, but not for chrome
    if (!transfer.types) return false;
    var i, iLen = transfer.types.length;
    for (i=0; i < iLen; i += 1) {
      if (transfer.types[i] == sType) return true;
    }
    return false;
  }
  
  markedEditor.addEventListener('drop', function(event) {
    var insTxt = '';
    if (transferHasType(event.dataTransfer,'application/json')) {
      var dOpt = null, sJson = event.dataTransfer.getData('application/json') || '{}';
      try {
        dOpt = JSON.parse(sJson);
      }
      catch(e) { console.log(e); }
      
      if (dOpt) {
        var sUrl;
        if (dOpt.dragType == 'image' && (sUrl=dOpt.dragUrl)) {
          var appBase = location__('./').pathname;
          if (appBase[0] != '/') appBase = '/' + appBase; // avoid bug of IE10
          var urlPath = location__(sUrl).pathname;
          if (urlPath[0] != '/') urlPath = '/' + urlPath;
          if (urlPath.indexOf(appBase) == 0)
            urlPath = urlPath.slice(appBase.length);
          
          var sHint = urlPath.split('/').pop();
          if (typeof dOpt.clientWidth == 'number')
            insTxt = '<img alt="' + sHint + '" style="width:' + dOpt.clientWidth + 'px; height:' + dOpt.clientHeight + 'px" src="' + urlPath + '">';
          else insTxt = '![' + sHint + '](' + urlPath + ')';
        }
        
        else if (dOpt.dragType == 'template' && (sUrl=dOpt.dragUrl)) {
          var startPos = this.selectionStart, endPos = this.selectionEnd, iLevel = 0;
          if (typeof startPos == 'number') {
            var sLastLn = this.value.slice(0,startPos).split('\n').pop();
            if (!sLastLn.trim()) iLevel = Math.floor(sLastLn.length / 2);
          }
          
          var dTempOpt = dOpt.option;
          if (dTempOpt) {
            if (dTempOpt.name)
              insertJsonX_(this,startPos,endPos,dTempOpt,iLevel);
          }
          else {
            sUrl = sUrl + '.json';
            var self = this;
            getAsynRequest(sUrl, function(err,sJson) {
              if (err) {
                rootNode.instantShow('error: read JSON failed (' + sUrl + ').');
                console.log(err);
              }
              else {
                try {
                  dTempOpt = JSON.parse(sJson);
                }
                catch(e) {
                  console.log('error: parse JSON failed (' + sUrl + ').');
                }
                if (dTempOpt && dTempOpt.name)
                  insertJsonX_(self,startPos,endPos,dTempOpt,iLevel);
              }
            });
          }
          
          event.preventDefault();
          event.stopPropagation();
          return;
        }
      }
    }
    
    else if (transferHasType(event.dataTransfer,'text/uri-list')) {
      var sUrl = event.dataTransfer.getData('text/uri-list') || '';
      if (sUrl) {
        var appBase = location__('./').pathname;
        if (appBase[0] != '/') appBase = '/' + appBase; // avoid bug of IE10
        var urlPath = location__(sUrl).pathname;
        if (urlPath[0] != '/') urlPath = '/' + urlPath;
        if (urlPath.indexOf(appBase) == 0)
          urlPath = urlPath.slice(appBase.length);
        insTxt = '[' + urlPath.split('/').pop() + '](' + urlPath + ')';
      }
    }
    
    if (insTxt) {
      event.preventDefault();
      event.stopPropagation();
      
      var startPos = this.selectionStart;
      if (typeof startPos == 'number') {
        var s = this.value;
        this.value = s.slice(0,startPos) + insTxt + s.slice(this.selectionEnd);
        this.selectionEnd = this.selectionStart = startPos + insTxt.length;
      }
      else if (document.selection) { // IE
        this.focus();
        var sel = document.selection.createRange();
        sel.text = insTxt;
      }
      else this.value += insTxt;
    }
  },false);
  
  markedEditor.addEventListener('paste', function(event) {
    var types = event.clipboardData.types, sText = '';
    for (var i=0,item; item=types[i]; i+=1) {
      if (item == 'Text' || item.indexOf('text/') == 0) {
        sText = event.clipboardData.getData(item);
        break;
      }
    }
    if (!sText || sText.indexOf(WIDGET_PASTE_TAG_) != 0) return;
    
    var iPos = sText.indexOf(',',WIDGET_PASTE_TAG_.length);
    if (iPos < 0 || iPos >= 32) return;
    var bList = null;
    try {
      bList = JSON.parse(sText.slice(iPos+1));
    }
    catch(e) { }
    if (!Array.isArray(bList) || bList.length < 1) return;
    
    event.preventDefault();  // ignore default paste text
    
    var startPos = this.selectionStart;
    iPos = (typeof startPos == 'number'? startPos: 0);
    var sLastLn = this.value.slice(0,iPos).split('\n').pop();
    
    var iLevel = 0;
    if (!sLastLn.trim()) iLevel = Math.floor(sLastLn.length / 2);
    var sHtml = '';
    bList.forEach( function(item) {
      sHtml += (sHtml && sHtml.slice(-1) != '\n'?'\n':'') + streamReactTree_(item,iLevel,1);
    });
    if (!sHtml) return;
    
    if (iLevel > 0) {
      var sPre = new Array(iLevel+1).join('  ');
      if (sHtml.indexOf(sPre) == 0) sHtml = sHtml.slice(sPre.length);
    }
    
    if (typeof startPos == 'number') {
      var ss = this.value;
      this.value = ss.slice(0,startPos) + sHtml + ss.slice(this.selectionEnd);
      this.selectionEnd = this.selectionStart = startPos + sHtml.length;
    }
    else if (document.selection) { // IE
      this.focus();
      var sel = document.selection.createRange();
      sel.text = sHtml;
    }
    else this.value += sHtml;
  },false);
  
  function showMarkEditor(isShow) {
    if (isShow) {
      previewHtml.style.display = 'none';
      markedEditor.parentNode.style.display = 'block';
      markedEditor.focus();
    }
    else {
      markedEditor.parentNode.style.display = 'none';
      previewHtml.style.display = 'block';
      
      var oldY = previewHtml.scrollTop;
      previewHtml.innerHTML = window.marked(markedEditor.value);
      setTimeout( function() {
        previewHtml.scrollTop = oldY;
      },0);
    }
  }
  markedRadio.onchange = function(event) {
    var isMark = event.target.checked;
    showMarkEditor(isMark);
  };
  htmlRadio.onchange = function(event) {
    var isMark = !event.target.checked;
    showMarkEditor(isMark);
  };
  markedRadio.checked = true;  // set default checked
  
  if (!window.parent || window.parent.window === window) return;
  window.addEventListener('message', function(msg) {
    try {
      if (typeof msg == 'object' && msg.data) {
        msg = msg.data;
        msg = JSON.parse(msg.slice(14)); // remove prefix '[PROJECT_NAME]'
      }
      else msg = null;
    }
    catch(e) {
      msg = null;
      console.log(e);
    }
    
    if (typeof msg == 'object') {
      if (msg.method == 'init') {
        taskId = msg.param[0];
        inValue = msg.param[1];
        initGui();
      }
      else if (msg.method == 'close') {
        var isClose = !!msg.param[0];
        cancelButton.focus();     // trigger markedEditor.onchange
        setTimeout( function() {
          closeDialog(isClose,false);
        },0);
      }
    }
  }, false);
  
  var sCmd = '[PROJECT_NAME]' + JSON.stringify({method:'onDialogLoad',param:[]});
  window.parent.window.postMessage(sCmd,'*');
}  // end of function onStart_

if (document.body.hasAttribute('data-loading'))
  document.body.onStart = onStart_;
else setTimeout(onStart_,600);
