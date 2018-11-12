var saveSelection, restoreSelection;

if (window.getSelection && document.createRange) {
    saveSelection = function(containerEl) {
        var range = window.getSelection().getRangeAt(0);
        var preSelectionRange = range.cloneRange();
        preSelectionRange.selectNodeContents(containerEl);
        preSelectionRange.setEnd(range.startContainer, range.startOffset);
        var start = preSelectionRange.toString().length;

        return {
            start: start,
            end: start + range.toString().length
        };
    };

    restoreSelection = function(containerEl, savedSel) {
        var charIndex = 0, range = document.createRange();
        range.setStart(containerEl, 0);
        range.collapse(true);
        var nodeStack = [containerEl], node, foundStart = false, stop = false;

        while (!stop && (node = nodeStack.pop())) {
            if (node.nodeType == 3) {
                var nextCharIndex = charIndex + node.length;
                if (!foundStart && savedSel.start >= charIndex && savedSel.start <= nextCharIndex) {
                    range.setStart(node, savedSel.start - charIndex);
                    foundStart = true;
                }
                if (foundStart && savedSel.end >= charIndex && savedSel.end <= nextCharIndex) {
                    range.setEnd(node, savedSel.end - charIndex);
                    stop = true;
                }
                charIndex = nextCharIndex;
            } else {
                var i = node.childNodes.length;
                while (i--) {
                    nodeStack.push(node.childNodes[i]);
                }
            }
        }

        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
    }
} else if (document.selection) {
    saveSelection = function(containerEl) {
        var selectedTextRange = document.selection.createRange();
        var preSelectionTextRange = document.body.createTextRange();
        preSelectionTextRange.moveToElementText(containerEl);
        preSelectionTextRange.setEndPoint("EndToStart", selectedTextRange);
        var start = preSelectionTextRange.text.length;

        return {
            start: start,
            end: start + selectedTextRange.text.length
        }
    };

    restoreSelection = function(containerEl, savedSel) {
        var textRange = document.body.createTextRange();
        textRange.moveToElementText(containerEl);
        textRange.collapse(true);
        textRange.moveEnd("character", savedSel.end);
        textRange.moveStart("character", savedSel.start);
        textRange.select();
    };
}


$(function() {

  // Helper functions

  var divToBr = function(node) {
    return $('<div></div>').html(node.html().replace(/<div>/gi,'\n').replace(/<\/div>/gi,'')).text();
  }

  var brToDiv = function(string) {
    splits = string.split(/\n/g);
    var result = '';
    for(i in splits) {
      var t = (splits[i].length === 0) ? '<br />' : splits[i];

      if(i > 0) {
        result += '<div>' + t + '</div>';
      } else {
        result += t;
      }
    }
    return result;
  }

  // MAIN

  var errors = [];

  var spellingPopup = $('.spelling-popup');

  // popup menu handling
  $(window).click(function() {
    //Hide the menus if visible
    spellingPopup.removeClass('is-up');
  });

  $('body').on('click', '.spelling-error', function(e) {
    e.stopPropagation();
    var me = $(this);
    var key = me.data().key;
    spellingPopup.css({ left: me.offset().left + me.width() + 5, top: me.offset().top });
    var options = '';
    errors[key].suggestions.option.forEach(function(option) {
      options += '<a class="panel-block spelling-option" data-key="'+key+'">' + option + '</a>';
    })
    spellingPopup.children('div').html(options);
    spellingPopup.addClass('is-up');
  });

  $('body').on('click', '.spelling-option', function(e) {
    var option = $(this);
    var key = option.data().key;
    $('#spelling-error-' + key).replaceWith(option.text());
    spellingPopup.removeClass('is-up');
  });

  var host = 'https://fairlanguage2.dev-star.de/';
  var checkUrl = host + 'checkDocument';

  var tArea = $('#editor');
  tArea.focus();
  // Init a timeout variable to be used below
  var timeout = null;

  // Listen for keystroke events
  tArea[0].onkeyup = function (e) {
    // reset timeout on any keystroke
    clearTimeout(timeout);

    timeout = setTimeout(function () {
      var text = divToBr(tArea);
      if (text.length > 0) {
        var sel = saveSelection(tArea[0]);
        $.post(checkUrl, { data: text, json: true }, function(result) {
          var markers = [];
          var newText = '';
          var start = 0;
          errors = result;
          for(i in result) {
            var r = result[i];
            newText += text.substring(start, r.position);
            newText += '<span class="spelling-error" id="spelling-error-'+i+'" data-key="'+i+'">' + text.substr(r.position, r.string.length) + '</span>';
            start = r.position + r.string.length;
          };
          newText += text.substr(start);
          tArea.html(brToDiv(newText));
          restoreSelection(tArea[0], sel);
        });
      }
    }, 500);
  };

});
