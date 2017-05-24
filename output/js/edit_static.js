// edit_static.js

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
      else {
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

var cancelButton  = document.querySelector('#btn-cancel');
var poplineRadio  = document.querySelector('#pg-popline');
var htmlRadio     = document.querySelector('#pg-html');
var poplineEditor = document.querySelector('#txt-widget > div.editor');
var htmlEditor    = document.querySelector('#txt-html > textarea');
var poplineArea   = document.querySelector('#txt-widget');
var htmlArea      = document.querySelector('#txt-html');

var taskId = 0, inValue = null, cssList = [];

function initGui() {
  var sHtml = inValue[0];  // sPath = inValue[1], sStaticId = inValue[2]
  loadCssModule(cssList, function() {
    poplineEditor.innerHTML = sHtml;
  });
}

function closeDialog(isClose,isCancel) {
  var outValue = null, changed = true;
  if (isCancel || !inValue)
    changed = false;
  else {
    var sHtml;
    if (poplineRadio.checked) {
      sHtml = poplineEditor.innerHTML;
      var iPos = sHtml.lastIndexOf('<br>');
      if (iPos > 0) {
        var sTail = sHtml.slice(iPos+4).trim();
        if (sTail.search(/^<\/[a-z0-9]+>$/) == 0)  // such as: </span> </div>
          sHtml = sHtml.slice(0,iPos) + sHtml.slice(iPos+4); // remove tail '<br>'
      }
    }
    else sHtml = htmlEditor.value;
    outValue = [sHtml,inValue[1],inValue[2]];
  }
  
  var s = '[PROJECT_NAME]' + JSON.stringify({method:'onDialogExit',param:[isClose,changed,taskId,outValue]});
  window.parent.window.postMessage(s,'*');
}

cancelButton.onclick = function(event) {
  closeDialog(true,true);
};

function showPopline(isShow) {
  if (isShow) {
    htmlArea.style.display = 'none';
    poplineArea.style.display = 'block';
    poplineEditor.focus();
    poplineEditor.innerHTML = htmlEditor.value;
  }
  else {
    poplineArea.style.display = 'none';
    htmlArea.style.display = 'block';
    htmlEditor.focus();
    htmlEditor.value = poplineEditor.innerHTML;
  }
}
poplineRadio.onchange = function(event) {
  var isPopline = event.target.checked;
  showPopline(isPopline);
};
htmlRadio.onchange = function(event) {
  var isPopline = !event.target.checked;
  showPopline(isPopline);
};
poplineRadio.checked = true;  // set default checked

function transferHasType(transfer,sType) { // transfer.types.contains() for firefox, but not for chrome
  if (!transfer.types) return false;
  var i, iLen = transfer.types.length;
  for (i=0; i < iLen; i += 1) {
    if (transfer.types[i] == sType) return true;
  }
  return false;
}

function adjustPath(sUrl) {
  var appBase = location__('./').pathname;
  if (appBase[0] != '/') appBase = '/' + appBase; // avoid bug of IE10
  var urlPath = location__(sUrl).pathname;
  if (urlPath[0] != '/') urlPath = '/' + urlPath;
  if (urlPath.indexOf(appBase) == 0)
    urlPath = urlPath.slice(appBase.length);
  return urlPath;
}

function isOrContainsNode(ancestor,node) {
  while (node) {
    if (node === document) return false;
    if (node === ancestor) return true;
    node = node.parentNode;
  }
  return false;
}

poplineArea.ondrop = function(event) {
  event.preventDefault();
  event.stopPropagation();
};
poplineEditor.addEventListener('drop', function(event) {
  if (transferHasType(event.dataTransfer,'application/json')) {
    var sUrl, dOpt = null, sJson = event.dataTransfer.getData('application/json') || '{}';
    try {
      dOpt = JSON.parse(sJson);
    }
    catch(e) { console.log(e); }
    
    if (dOpt && dOpt.dragType == 'image' && (sUrl=dOpt.dragUrl)) {
      event.preventDefault();
      event.stopPropagation();
      
      var range, sel = null;
      if (window.getSelection)
        sel = window.getSelection();
      else if (document.selection)
        sel = document.selection.createRange();
      if (sel && (range=sel.getRangeAt(0)) && isOrContainsNode(poplineEditor,range.startContainer)) {
        var urlPath = adjustPath(sUrl), sHint = urlPath.split('/').pop();
        var imgNode = document.createElement('img');
        imgNode.setAttribute('alt',sHint);
        imgNode.setAttribute('src',urlPath);
        
        range.deleteContents();
        range.insertNode(imgNode);
      }
    }
  }
},false);

htmlEditor.addEventListener('drop', function(event) {
  if (transferHasType(event.dataTransfer,'application/json')) {
    var sUrl, dOpt = null, sJson = event.dataTransfer.getData('application/json') || '{}';
    try {
      dOpt = JSON.parse(sJson);
    }
    catch(e) { console.log(e); }
    
    if (dOpt && dOpt.dragType == 'image' && (sUrl=dOpt.dragUrl)) {
      var urlPath = adjustPath(sUrl);
      var sStyle = '', sHint = urlPath.split('/').pop();
      if (typeof dOpt.clientWidth == 'number')
        sStyle = '" style="width:' + dOpt.clientWidth + 'px; height:' + dOpt.clientHeight + 'px';
      urlPath = '<img alt="' + sHint + sStyle + '" src="' + urlPath + '">';
      
      event.preventDefault();
      event.stopPropagation();
      
      var startPos = this.selectionStart;
      if (typeof startPos == 'number') {
        var s = this.value;
        this.value = s.slice(0,startPos) + urlPath + s.slice(this.selectionEnd);
        this.selectionEnd = this.selectionStart = startPos + urlPath.length;
      }
      else if (document.selection) { // IE
        this.focus();
        var sel = document.selection.createRange();
        sel.text = urlPath;
      }
      else this.value += urlPath;
    }
  }  
},false);

document.execCommand('defaultParagraphSeparator', false, 'p');
$(poplineEditor).popline({position: "fixed"});  // 'fixed' or 'relative'

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
      var isClose = !!msg.param[0];
      closeDialog(isClose,false);
    }
  }
}, false);

var sCmd = '[PROJECT_NAME]' + JSON.stringify({method:'onDialogLoad',param:[]});
window.parent.window.postMessage(sCmd,'*');

}  // end of function onStart_

if (document.body.hasAttribute('data-loading'))
  document.body.onStart = onStart_;
else setTimeout(onStart_,600);
