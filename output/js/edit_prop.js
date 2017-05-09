// edit_prop.js

function location__(href) {
  var location = document.createElement('a');
  location.href = href;
  if (location.host == '')
    location.href = location.href;
  return location;
}

function onStart_() {

function loadCssModule(bCss,callback) {
  var cssNum = bCss.length, loaded = 0;
  if (cssNum) {
    bCss.forEach( function(sUrl) {
      var node = document.createElement('link');
      if ('onload' in node) {
        if (callback) {
          node.onload = function(event) {
            loaded += 1;
            if (loaded >= cssNum) callback();
          };
        }
        node.setAttribute('rel','stylesheet');
        node.setAttribute('href',sUrl);
        document.head.appendChild(node);
      }
      else { // for old browser version
        node = document.createElement('img');
        if (callback) {
          node.onerror = function(event) {
            loaded += 1;
            if (loaded >= cssNum) callback();
          };
        }
        node.setAttribute('src',sUrl);
        document.body.appendChild(node);
      }
    });
  }
  else {
    if (callback) callback();
  }
}

var taskId = 0, inValue = null, cssList = [];
var orgSchemaData = null, lastSchemaJson = '', schemaJsonChanged = false;

var editor = document.getElementById('edit-editor');
var editorInfo = document.getElementById('edit-info');
var editorButtons = document.querySelectorAll('#edit-btn > button');
var cancelBtn = editorButtons[2];

function transferHasType(transfer,sType) { // transfer.types.contains() for firefox, but not for chrome
  if (!transfer.types) return false;
  var i, iLen = transfer.types.length;
  for (i=0; i < iLen; i += 1) {
    if (transfer.types[i] == sType) return true;
  }
  return false;
}

editor.addEventListener('drop', function(event) {
  var insTxt = '';
  
  if (transferHasType(event.dataTransfer,'application/json')) {
    var sUrl, dOpt = null, sJson = event.dataTransfer.getData('application/json') || '{}';
    try {
      dOpt = JSON.parse(sJson);
    }
    catch(e) { console.log(e); }
    
    if (dOpt && dOpt.dragType == 'image' && (sUrl=dOpt.dragUrl)) {
      var appBase = location__('./').pathname;
      if (appBase[0] != '/') appBase = '/' + appBase; // avoid bug of IE10
      var urlPath = location__(sUrl).pathname;
      if (urlPath[0] != '/') urlPath = '/' + urlPath;
      if (urlPath.startsWith(appBase))
        insTxt = urlPath.slice(appBase.length);
      else insTxt = urlPath;
    }
  }
  else if (transferHasType(event.dataTransfer,'text/uri-list')) {
    var sUrl = event.dataTransfer.getData('text/uri-list') || '';
    if (sUrl) {
      var appBase = location__('./').pathname;
      if (appBase[0] != '/') appBase = '/' + appBase; // avoid bug of IE10
      var urlPath = location__(sUrl).pathname;
      if (urlPath[0] != '/') urlPath = '/' + urlPath;
      if (urlPath.startsWith(appBase))
        insTxt = urlPath.slice(appBase.length);
      else insTxt = urlPath;
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

var editorInfoId_ = 0;
editorButtons[0].onclick = function(event) {  // 'Check JSON' button
  editorInfoId_ += 1;
  var nowId = editorInfoId_;
  
  try {
    var s = editor.value;
    var v = window.eval('(' + s.replace(/(\n|\r)+/g,' ') + ')');
    editorInfo.style.color = '#222';
    editorInfo.innerHTML = 'Check JSON successful.';
    lastSchemaJson = s;
    editor.value = JSON.stringify(v,null,2);
  }
  catch(e) {
    editorInfo.style.color = 'red';
    editorInfo.innerHTML = 'window.eval(json) failed!';
    console.log(e);
  }
  
  setTimeout( function() {
    if (nowId == editorInfoId_)
      editorInfo.innerHTML = '';
  },4000);
};
editorButtons[1].onclick = function(event) {  // Restore button
  editor.value = lastSchemaJson;
};
cancelBtn.onclick = function(event) {  // Cancel button
  closeDialog(true,true,false);
};

editor.onchange = function(event) {
  schemaJsonChanged = true;
};
editor.onkeypress = function(event) {
  if (event.keyCode == 13) {
    setTimeout( function() {
      var startPos = editor.selectionStart, endPos = editor.selectionEnd;
      if (startPos || startPos === 0) {
        var sHead = editor.value.slice(0,startPos), sIndent = getIndent(sHead.trim());
        if (sIndent) {
          editor.value = editor.value.slice(0,startPos) + sIndent + editor.value.slice(endPos);
          editor.selectionStart = editor.selectionEnd = startPos + sIndent.length;
        }
      }
      // else, ignore // not support old IE that using document.selection
    },0);
  }
  
  function getIndent(s) {
    var s2 = s.split('\n').pop(), iLen = s2.length, sRet = '';
    for (var i=0; i < iLen; i += 1) {
      if (s2[i] == ' ')
        sRet += ' ';
      else break;
    }
    return sRet;
  }
};

function initGui() {
  var sPath = inValue[1] || '', option = inValue[2];
  orgSchemaData = inValue[0] || null;
  if (!orgSchemaData) {
    var infoNode = document.createElement('h3');
    infoNode.innerHTML = 'Error: scan property of widget (' + sPath + ') failed';
    document.body.appendChild(infoNode);
    return;
  }
  
  loadCssModule(cssList, function() {
    var sTag = option? option.name: '';
    document.getElementById('edit-tagname').textContent = sTag? sTag+': ': '';
    document.getElementById('edit-path').textContent = sPath + '';
    editor.style.height = Math.min(window.innerHeight - 130, Math.floor(window.innerHeight * 0.8)) + 'px';
    editor.value = lastSchemaJson = JSON.stringify(orgSchemaData,null,2);
    
    document.getElementById('edit-area').style.display = 'block';
    schemaJsonChanged = false;
  });
}

function closeDialog(isClose,isCancel,byParent) {
  var outData = null, changed = true;
  if (isCancel || !orgSchemaData || !schemaJsonChanged)
    changed = false;
  else {
    outData = orgSchemaData;
    try {
      outData = window.eval('(' + editor.value.replace(/(\n|\r)+/g,' ') + ')');
    }
    catch(e) {
      var sMsg = 'Error: window.eval(json) failed';
      if (byParent) {
        alert(sMsg);
        return;  // ignore closing
      }
      changed = false;
      alert(sMsg + ', modification will be ignored.');
    }
  }
  
  var bRmv = [];
  if (changed) {
    Object.keys(orgSchemaData).forEach( function(item) {
      if (!outData.hasOwnProperty(item))
        bRmv.push(item);
    });
  }
  var s = '[PROJECT_NAME]' + JSON.stringify({method:'onDialogExit',param:[isClose,changed,taskId,[changed,outData,bRmv]]});
  window.parent.window.postMessage(s,'*');
}

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
      cssList = msg.param[2] || [];
      initGui();
    }
    else if (msg.method == 'close') {
      var isClose = msg.param[0];
      cancelBtn.focus();       // trigger editor.onchange
      setTimeout( function() { // cancelBtn.focus() take effect first, then closeDialog()
        closeDialog(isClose,false,true); // isCancel=false, byParent=true
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
