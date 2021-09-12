// event handler to open info panels
$(document).ready(function() {
    // -----------------------------------------------------------------------
    // Exploration UI (Embed Script)
    // -----------------------------------------------------------------------
      
      // utility: adjust iframe size
      function updateIframe () {
        parent.alertsize(document.getElementsByClassName('chart-container')[0].scrollHeight, document.body.getAttribute("iframeID"));
      }

      // utility to open/close info panels (TODO not very DRY)
      function barSegmentSelect (selectedSegment, previousSelection) {
        var infoID = "#" + selectedSegment.attr("infoid");

        // direct selection actions
        if (previousSelection === undefined) {
          // hide/remove highlight from siblings
          $(infoID).siblings().addClass("d-none");
          selectedSegment.siblings().removeClass("bar-segment-selected");
          
          // close if toggled
          if (selectedSegment.hasClass("bar-segment-selected")) {
            $(infoID).parent("div").addClass("d-none");
            $(infoID).addClass("d-none");
            selectedSegment.removeClass("bar-segment-selected");
            if (selectedSegment.hasClass('short-bar')) selectedSegment.parents('.bar-graphic').siblings('.bar-label').addClass('d-none');

          // show/highlight selection
          } else {
            $(infoID).parent("div").removeClass("d-none");
            $(infoID).removeClass("d-none");
            selectedSegment.addClass("bar-segment-selected");
            if (selectedSegment.hasClass('short-bar')) selectedSegment.parents('.bar-graphic').siblings('.bar-label').removeClass('d-none');
          }

        // ui selection actions
        } else {
          let prevInfoID = "#" + previousSelection.attr("infoid");
          
          // hide/remove highlight from previous selection
          $(prevInfoID).parent("div").addClass("d-none");
          $(prevInfoID).addClass("d-none");
          previousSelection.removeClass("bar-segment-selected");
          if (previousSelection.hasClass('short-bar')) previousSelection.parents('.bar-graphic').siblings('.bar-label').addClass('d-none');

          // show/add highlight to current selection
          $(infoID).parent("div").removeClass("d-none");
          $(infoID).removeClass("d-none");
          selectedSegment.addClass("bar-segment-selected");
          if (selectedSegment.hasClass('short-bar')) selectedSegment.parents('.bar-graphic').siblings('.bar-label').removeClass('d-none');
        }

        updateIframe();
      }

      // utility: close all panels
      function barSegmentClose () {
        $('.bar-segment-selected').each( function(index, element) {
          infoID = "#" + $(this).attr("infoid");
          $(infoID).parent("div").addClass("d-none");
          $(infoID).addClass("d-none");
          $(this).removeClass("bar-segment-selected");
          if ($(this).hasClass('short-bar')) $(this).parents('.bar-graphic').siblings('.bar-label').addClass('d-none');
        });
        updateIframe();
      }

      // utility: navigation check
      // TODO a lot of this duplicates functionality of other parts
      function checkEUINavigation (currentSelection) {
        $('.gu-explore-prevconcert, .gu-explore-nextconcert, .gu-explore-prevpiece, .gu-explore-nextpiece').removeClass('disabled');

        if (currentSelection.parents('.bar-container').prev('.bar-container').find('.bar-segment').first().length === 0) {
          $('.gu-explore-prevconcert').addClass('disabled');
        }
        if (currentSelection.parents('.bar-container').next('.bar-container').find('.bar-segment').first().length === 0) {
          $('.gu-explore-nextconcert').addClass('disabled');
        }
        if (currentSelection.prev().length === 0) {
          $('.gu-explore-prevpiece').addClass('disabled');
        }
        if (currentSelection.next().length === 0) {
          $('.gu-explore-nextpiece').addClass('disabled');
        }

        updateIframe();
      }

      // utility: open the explore panel
      function openExploreUI () {
        if ( $('.bar-segment-selected').length ) {
          var currentSelection = $('.bar-segment-selected').first();
        } else {
          var currentSelection = $('.bar-segment').first();
          barSegmentSelect(currentSelection);
        }
        $('.gu-explore-open').addClass('d-none');
        $('.gu-explore-open').siblings('.gu-explore-close, .gu-explore-options').removeClass('d-none');
        checkEUINavigation(currentSelection);
      }

      $('.bar-segment').click(function(e) {
        barSegmentSelect($(this));
        if ($('.gu-explore-open').hasClass('d-none') === false) openExploreUI();
      });

      $('.gu-explore-open').click(function(e) {
        openExploreUI();
      });

      $('.gu-explore-close').click(function(e) {
        $(this).addClass('d-none');
        $(this).siblings('.gu-explore-options').addClass('d-none');
        $(this).siblings('.gu-explore-open').removeClass('d-none');
        barSegmentClose();
      });

      function exploreGUIHandler (actionType) {
        // has the user already selected anything? TODO consider removing if already handled above?
        if ( $('.bar-segment-selected').length ) {
          var currentSelection = $('.bar-segment-selected').first();
        } else {
          var currentSelection = $('.bar-segment').first();
        }

        // pick the right action
        if (actionType === "prevconcert") {
          var newSelection = currentSelection.parents('.bar-container').prev('.bar-container').find('.bar-segment').first();
        } else if (actionType === "nextconcert") {
          var newSelection = currentSelection.parents('.bar-container').next('.bar-container').find('.bar-segment').first();
        } else if (actionType === "prevpiece") {
          var newSelection = currentSelection.prev();
        } else if (actionType === "nextpiece") {
          var newSelection = currentSelection.next();
        }

        // update selection
        barSegmentSelect(newSelection, currentSelection);
        checkEUINavigation(newSelection);
      }

      $('.gu-explore-prevconcert, .gu-explore-nextconcert, .gu-explore-prevpiece, .gu-explore-nextpiece').click(function(e) {
        // maybe make this smarter, put an actiontype attribute you can read from the button instead of four classes?
        if ($(this).hasClass("gu-explore-prevconcert")) {
          var actionType = "prevconcert";
        } else if ($(this).hasClass("gu-explore-nextconcert")) {
          var actionType = "nextconcert";
        } else if ($(this).hasClass("gu-explore-prevpiece")) {
          var actionType = "prevpiece";
        } else if ($(this).hasClass("gu-explore-nextpiece")) {
          var actionType = "nextpiece";
        }

        exploreGUIHandler(actionType);
      });
});