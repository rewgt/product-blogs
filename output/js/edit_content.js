// edit_content.js

function onStart_() {

var taskId = 0, inValue = null, textChanged = false;

var editor = document.getElementById('edit-editor');
var cancelBtn = document.querySelector('#edit-btn > button');

cancelBtn.onclick = function(event) {  // Cancel
  closeDialog(true,true,false);
};

editor.onchange = function(event) {
  textChanged = true;
};

function initGui() {
  var sText = inValue[0] || '', sPath = inValue[1] || '', sTag = inValue[2] || '';
  document.getElementById('edit-tagname').textContent = sTag? sTag+': ': '';
  document.getElementById('edit-path').textContent = sPath + '';
  editor.style.height = Math.min(window.innerHeight - 130, Math.floor(window.innerHeight * 0.8)) + 'px';
  editor.value = sText;
    
  document.getElementById('edit-area').style.display = 'block';
  textChanged = false;
}

function closeDialog(isClose,isCancel,byParent) {
  var outValue = null, changed = true;
  if (isCancel || !textChanged)
    changed = false;
  else outValue = editor.value;
  
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
