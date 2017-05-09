// edit_styles.js

function onStart_() {

var taskId = 0, inValue = null, textChanged = false, lastSchemaJson = '';

var editor = document.getElementById('edit-editor');
var editorInfo = document.getElementById('edit-info');
var editorButtons = document.querySelectorAll('#edit-btn > button');
var cancelBtn = editorButtons[2];

var editorInfoId_ = 0;
editorButtons[0].onclick = function(event) {  // Check JSON
  editorInfoId_ += 1;
  var nowId = editorInfoId_;
  
  try {
    var s = editor.value;
    var v = window.eval('(' + s.replace(/(\n|\r)+/g,' ') + ')');
    if (v === null)
      ;  // is valid value
    else if (typeof v != 'object') {
      editorInfo.style.color = 'red';
      editorInfo.innerHTML = '"{path:{style}}" is required.';
    }
    else {
      editorInfo.style.color = '#222';
      editorInfo.innerHTML = 'Check JSON successful.';
    }
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

editorButtons[1].onclick = function(event) {  // Restore
  editor.value = lastSchemaJson;
};

cancelBtn.onclick = function(event) {  // Cancel
  closeDialog(true,true,false);
};

editor.onchange = function(event) {
  textChanged = true;
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
  var linkStyles = inValue[0], sPath = inValue[1] || '', sTag = inValue[2] || '';
  
  document.getElementById('edit-tagname').textContent = sTag? sTag+': ': '';
  document.getElementById('edit-path').textContent = sPath + '';
  editor.style.height = Math.min(window.innerHeight - 130, Math.floor(window.innerHeight * 0.8)) + 'px';
  editor.value = lastSchemaJson = JSON.stringify(linkStyles,null,2);
  
  document.getElementById('edit-area').style.display = 'block';
  textChanged = false;
}

function closeDialog(isClose,isCancel,byParent) {
  var outValue = null, changed = true;
  if (isCancel || !textChanged)
    changed = false;
  else {
    try {
      outValue = window.eval('(' + editor.value.replace(/(\n|\r)+/g,' ') + ')');
      if (!outValue || typeof outValue != 'object')
        outValue = null; // means remove whole props.styles
    }
    catch(e) {
      console.log(e);
      changed = false;
      
      alert(e);
      return;
    }
  }
  
  var s = '[PROJECT_NAME]' + JSON.stringify({method:'onDialogExit',param:[isClose,changed,taskId,[changed,outValue]]});
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
      initGui();
    }
    else if (msg.method == 'close') {
      cancelBtn.focus();  // trigger editor.onchange
      setTimeout( function() {
        closeDialog(!!msg.param[0],false,true);
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
