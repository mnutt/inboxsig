// Clipboard
//
// Jquery plugin that links a "copy to clipboard" to a textarea. Call
// .clipboard on the "copy" button, with the textarea as an argument.
//

(function() {
  $.fn.clipboard = function(target) {
    $.each(this, function() {
      var container = $(this);
      var button = $(this).find("button.clip_button");
      clip = new ZeroClipboard.Client();

      if(typeof(target) == "string") {
        target = $(target);
      } else if(typeof(target) == "undefined" || target.length == 0) {
        target = $("textarea.embed");
      }

      clip.setText(target.val());

      clip.setHandCursor( true );
      clip.glue(button.get(0), container.get(0));
      clip.addEventListener( 'onComplete', function() {
        button.find("span").text("Copied!");

        var parent = target.parent();
        if(parent.hasClass('embed_container')) {
          var scan = $('<div class="scan"></div>');
          scan.css({height: target.height(),
                    width: target.outerWidth(),
                    top: -1 * target.height(),
                    left: 0});
          scan.prependTo(parent);
          scan.animate({top: target.outerHeight() + 10}, 200).animate({top: -1 * target.height()}, 200);
        }

        setTimeout(function() {
          button.find('span').text("Copy to Clipboard");
        }, 2000);
        try {
          mpq.metrics.track("Copy Embed");
        } catch(e) {}
      });
    });
  };
})(jQuery);
