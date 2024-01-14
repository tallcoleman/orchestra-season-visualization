$(document).ready(function() {
  
  // ***************************************************************************
  // Configuration
  // ***************************************************************************
  
  // assumptions: piece and concert names are unique

  // configuration for data handling
  // maybe the type on "First Performance" should be 'date' or something
  var coreData = {
    'Work Title':         {'required': true,  'type': 'str', 'category': false, 'attrLevel': 'pieceTitle'},
    'Duration':           {'required': true,  'type': 'int', 'category': false, 'attrLevel': 'piece'},
    'Concert Title':      {'required': true,  'type': 'str', 'category': false, 'attrLevel': 'concertTitle'},
    'Program Position':   {'required': true,  'type': 'int', 'category': false, 'attrLevel': 'piece'},
    'Composer':           {'required': false, 'type': 'str', 'category': true, 'attrLevel': 'piece'},
    'Act':                {'required': false, 'type': 'int', 'category': false, 'attrLevel': 'piece'},
    'First Performance':  {'required': false, 'type': 'date', 'category': false, 'attrLevel': 'concert'},
    'Performances Count':    {'required': false, 'type': 'int', 'category': false, 'attrLevel': 'concert'}
  }

  // default colour palette
  var colorPalette = {
    highlight1: "#BBBBBB",
    highlight2: "#4477AA",
    highlight3: "#66CCEE",
    highlight4: "#228833",
    highlight5: "#CCBB44",
    highlight6: "#EE6677",
    highlight7: "#AA3377",
  };

  // intermissions are handled differently than regular pieces
  var intermissionKey = ["intermission", "Intermission"];

  // used to remember UI color selections
  window.colorUI = {};
  window.colorUILabels = {};

  // used to hold a unique embed ID for each category highlight variable
  window.categoryIDs = {};

  var graphID = IdGenerator("", []);

  // ***************************************************************************
  // Input Handling
  // ***************************************************************************
  
  // triggered by file input
  $('#files').on("change", function(e) {
    e.preventDefault();

    // parse csv using papaparse
    $('#files').parse({
      config: {
        delimiter: "",
        quoteChar: '"',
        header: true,
        skipEmptyLines: 'greedy',
        complete: MapData,
      },
      before: function(file, inputElem) {
        //console.log("Parsing file...", file);
      },
      error: function(err, file) {
        console.log("ERROR:", err, file);
      },
      complete: function() {
        //console.log("Done with all the files");
      }
    });
  });

  // ***************************************************************************
  // Graph Builder
  // ***************************************************************************
  
  // matches headings in user data to their roles
  function MapData(results, graphConfig) {
    var data = results.data;
    var csvHeadings = Object.keys(data[0]);
    console.log("csv headings", csvHeadings);

    // user input - get data mappings for CSV headings
    DataMapUIBuilder(csvHeadings);

    // check data mapping input for validity; build graph
    $('#csv-options-form').submit(function(e){
      e.preventDefault();

      var inputIsValid = true;
      $('#csv-options-form select[required]').each(function(index, selectItem) {
        if (selectItem.value === "null") {
          $(selectItem).addClass("is-invalid");
          inputIsValid = false;
        } else $(selectItem).removeClass("is-invalid");
      });
      if (inputIsValid === false) return;

      var headingKeyInput = $(this).serializeArray();
      $('#csvOptionsModal').removeAttr("clearInputOnClose");
      $('#csvOptionsModal').modal("hide");

      var hKey = {}; // heading key
      for (i in headingKeyInput) {
        Object.assign(hKey, {[headingKeyInput[i]['name']]: headingKeyInput[i]['value']});
      }
      console.log("heading key", hKey);

      BuildChart(hKey);
    });

    function BuildChart(hKey){

      // -----------------------------------------------------------------------
      // Data Handling
      // -----------------------------------------------------------------------
      var concertData = {};
      // rebuild data in nested form

      // add attributes which are copied from data
      for (i in data) {
        row = data[i];

        // first time each concert is created
        if (concertData[row[hKey['Concert Title']]] == undefined) {
          concertData[row[hKey['Concert Title']]] = {pieces: {}};
        }

        // process each value in the row
        var newPiece = {};
        for (key in hKey) {

          if (coreData[key] === undefined) {
            // assume attributes that aren't in coreData are string piece attributes
            Object.assign(newPiece, {[hKey[key]]: row[hKey[key]]});
          } else {
            // add attributes that are in coreData
            // convert data to correct type
            if (coreData[key]['type'] === "int") {
              var keyValue = parseInt(row[hKey[key]]);
            } else if (coreData[key]['type'] === "str") {
              var keyValue = row[hKey[key]];
            } else if (coreData[key]['type'] === "date") {
              var keyValue = row[hKey[key]];
            } else {
              var keyValue = row[hKey[key]];
            }

            // add attribute to right place in concertData
            if (coreData[key]['attrLevel'] === 'piece') {
              Object.assign(newPiece, {[key]: keyValue});
            } else if (coreData[key]['attrLevel'] === 'concert' && concertData[row[hKey['Concert Title']]][key] === undefined) {
              Object.assign(concertData[row[hKey['Concert Title']]], {[key]: keyValue});
            }
          }
        }

        // add the piece to the concert
        Object.assign(concertData[row[hKey['Concert Title']]]['pieces'], {[row[hKey['Work Title']]]: newPiece});
      }

      // add attributes which are calculated from data
      for (concert in concertData) {
        // total duration; time to first intermission (only if Act is included in data)
        totalDuration = 0;
        timeToIntermission = 0;
        for (piece in concertData[concert]['pieces']) {
          let pieceDuration = concertData[concert]['pieces'][piece]['Duration'];
          totalDuration += pieceDuration;
          if (hKey['Act'] !== "null" && concertData[concert]['pieces'][piece]['Act'] === 1) {
            timeToIntermission += pieceDuration;
          }
        }
        Object.assign(concertData[concert], {
          'Total Duration': totalDuration,
          'Time to Intermission': timeToIntermission
        });
      }

      // -----------------------------------------------------------------------
      // Graph Building
      // -----------------------------------------------------------------------
      var buildContainer = [];
      // find max concert duration & sort concerts by duration
      var totalDurations = [];
      for (concert in concertData) {
        totalDurations.push([concert, concertData[concert]['Total Duration']]);
      }
      var totalDurationValues = totalDurations.map(a => a[1]);
      var maxConcertDuration = Math.max(...totalDurationValues);
      totalDurations.sort((a, b) => b[1] - a[1]); // largest to smallest

      // graph navigation ui
      let graphNavUIHTML = `<div class="graph-ui-container mt-2">
      <button type="button" class="btn btn-outline-secondary gu-explore-open">Explore</button>
      <div class="btn-group d-none gu-explore-close" role="group" aria-label="Explore">
        <button type="button" class="btn btn-secondary">Explore</button>
        <button type="button" class="btn btn-outline-secondary" aria-label="close">✕</button>
      </div>
      <div class="input-group d-none mt-2 gu-explore-options">
        <span class="align-middle">
          <label>Concert:</label>
          <div class="btn-group px-2" role="group" aria-label="Browse Concerts">
            <button type="button" class="btn btn-outline-secondary gu-explore-prevconcert">↑</button>
            <button type="button" class="btn btn-outline-secondary gu-explore-nextconcert">↓</button>
          </div>
          <label>Piece:</label>
          <div class="btn-group px-2" role="group" aria-label="Browse Pieces">
            <button type="button" class="btn btn-outline-secondary gu-explore-prevpiece">←</button>
            <button type="button" class="btn btn-outline-secondary gu-explore-nextpiece">→</button>
          </div>
        </span>
      </div>
    </div>`;


      // chart container, heading, legend container (blank)
      buildContainer.push(
        `<div class="chart-container">`,
        `<h2 class="chart-title" id="chart-title">Untitled Chart</h2>`,
        `<div class="legend-container"></div>`,
        `<div class="bars-container">`);

      // build divs for individual concerts
      for (i in totalDurations) {
        var concert = totalDurations[i][0];
        // label, bar holder

        var concertID = IdGenerator("concert-", buildContainer);
        Object.assign(concertData[concert], {'ID': concertID});

        buildContainer.push(
          ` <div class="bar-container" id="${concertID}">`,
          `<div class="bar-label">${concert}</div>`,
          `<div class="bar-graphic">`
        );

        // sort pieces by index
        pieceIndex = []
        for (piece in concertData[concert]['pieces']) {
          pieceIndex.push([piece, concertData[concert]['pieces'][piece]['Program Position']]);
        }
        pieceIndex.sort((a, b) => a[1] - b[1]); // smallest to largest

        var previous = 0;
        var concertDuration = concertData[concert]['Total Duration'];

        var infoDivs = [`<div class="bar-info-container d-none">`];

        // build divs for individual pieces
        for (i in pieceIndex) {
          var piece = pieceIndex[i][0];
          var pieceObj = concertData[concert]['pieces'][piece];

          // set width of bars
          var pieceDuration = pieceObj['Duration'];
          var left = Math.round(previous / maxConcertDuration * (100 * 10000)) / 10000;
          var right = Math.round(((maxConcertDuration - (previous + pieceDuration)) / maxConcertDuration) * (100 * 10000)) / 10000;
          previous += pieceDuration;

          // unique IDs
          var pieceDivID = IdGenerator("piece-", buildContainer);
          concertData[concert]['pieces'][piece]['ID'] = pieceDivID;
          var infoDivID = IdGenerator("info-", buildContainer);

          // check for intermission in data
          var intermissionClass = "";
          if (intermissionKey.includes(piece)) {
            intermissionClass = " invisible";
          }

          // build info divs
          infoDivs.push(
            `<div class="bar-info-segment d-none" id="${infoDivID}">`,
            `<span class="piece-composer-name">${pieceObj['Composer']}: </span>`,
            `<span class="piece-title">${piece}</span>`,
            `</div>`
          );

          buildContainer.push(
            `<div class="bar-segment${intermissionClass}" id="${pieceDivID}" infoid="${infoDivID}" style="left: ${left}%; right: ${right}%;">`,
            `<div class="bar-segment-label">${pieceDuration}</div>`,
            `</div>`
          );
        }
        buildContainer.push(
          `</div>`, // bar-graphic
          infoDivs.join(""),
          `</div>`, // bar-info-container
          `</div>`  // bar-container
        );
      }

      buildContainer.push(
        `</div>`, // bars-container
        graphNavUIHTML,
        `</div>` // chart-container
      );

      // add graph to DOM
      $('#graph-insert').html(buildContainer.join(""));

      // make concertData a global variable
      window.concertData = concertData;
      console.log("concert data object: ", concertData);

      // sort by concert name a-z
      var sortArray = [];
      for (concert in concertData) {
        var concertItem = [];
        concertItem.push(concert);
        concertItem.push(concertData[concert]['ID']);
        sortArray.push(concertItem);
      }
      SortConcerts(sortArray);


      // reveal options form; show certain sort options if the proper data is supplied
      if (hKey['Act'] !== "null") {
        $('#sort-option').children('option:contains("Time to Intermission")').removeAttr("disabled");
      } 
      if (hKey['First Performance'] !== "null") {
        $('#sort-option').children('option:contains("First Performance")').removeAttr("disabled");
      }
      $('#options-form').removeClass("d-none");

      // -----------------------------------------------------------------------
      // Exploration UI (Embed Script)
      // -----------------------------------------------------------------------

      // utility: adjust iframe size - UNCOMMENT FOR EMBED SCRIPT
      function updateIframe () {
        // parent.alertsize(document.getElementsByClassName('chart-container')[0].scrollHeight, document.body.getAttribute("iframeID"));
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



        // CATEGORY HIGHLIGHT UI
        // category highlight - selector input and embed ID generation
        var highlightCategories = [`<li><option value="null"></option></li>`];
        for (key in hKey) {
          if (coreData[key] === undefined || coreData[key]['category'] === true) {
            highlightCategories.push(`<li><option>${hKey[key]}</option></li>`);
            window.colorUI[hKey[key]] = {};
            window.colorUILabels[hKey[key]] = {};
            window.categoryIDs[hKey[key]] = IdGenerator("", Object.values(window.categoryIDs).concat([graphID]));
          }
        }
        $('#select-highlight-category').html(highlightCategories.join(""));

        // category highlight - generate new options on change
        $('#select-highlight-category').change(function() {
          CategoryHighlightMenuChange(data);
        });

      }

      // refreshes graph on form submit
      $('#options-form').submit(function(e){
        e.preventDefault();
        var newConfig = ConfigBuilder($(this).serializeArray());
        UpdateChart(newConfig, window.concertData);
      });

      // utility to build data map UI
      function DataMapUIBuilder(csvHeadings) {
        // DATA MAPPING
        // make selection UI for data mapping
        var dataMapUI = [];

        var csvHeadingOptions = [`<option value="null"></option>`];
        for (i in csvHeadings) {
          csvHeadingOptions.push(`<option>${csvHeadings[i]}</option>`);
        }

        // build selection UI segments - required data
        dataMapUI.push(`<legend>Required Data</legend>`);
        for (dataField in coreData) {
          if (coreData[dataField]['required'] === true) {
            dataMapUI.push(
              `<div class="mb-3">`,
              `<label for="select-${dataField}" class="form-label">${dataField}</label>`,
              `<select id="select-${dataField}" class="form-select" name="${dataField}" required>`,
              csvHeadingOptions.join(""),
              `</select>`,
              `<div class="invalid-feedback">Please select a field</div>`,
              `</div>`
            );
          }
        }

        // optional fields (same as above, but no required attribute)
        dataMapUI.push(`<legend>Optional Data</legend>`);
        for (dataField in coreData) {
          if (coreData[dataField]['required'] === false) {
            dataMapUI.push(
              `<div class="mb-3">`,
              `<label for="select-${dataField}" class="form-label">${dataField}</label>`,
              `<select id="select-${dataField}" class="form-select" name="${dataField}">`,
              csvHeadingOptions.join(""),
              `</select>`,
              `</div>`
            );
          }
        }

        // category field selection
        dataMapUI.push(
          `<legend>Style Categories</legend>`,
          `<p>Select the categories you want to use for chart styling:</p>`
        );
        for (i in csvHeadings) {
          dataMapUI.push(
            `<div class="mb-2">`,
            `<input type="checkbox" id="highlight-include-${i}" class="form-check-input me-2" name="highlight-include-${i}" value="${csvHeadings[i]}">`,
            `<label for="highlight-include-${i}" class="form-check-label">${csvHeadings[i]}</label>`,
            `</div>`
          );
        }

        // put the UI in the modal
        $('#csv-options-modal-content').html(dataMapUI.join(""));

        //validation - ensure selections are unique
        $('.modal-body select').change(function(e){
          // get currently selected values
          var selectionValues = $('.modal-body select').map(function(){
            return this.value;
          }).get();
          selectionValues = selectionValues.filter(a => a !== "null");

          // disable currently selected values (except for tag selecting it); remove checkboxes for fields already spoken for
          $('.modal-body option').removeAttr("disabled");
          $('.modal-body div > input[type="checkbox"]').parent("div").removeClass("d-none");
          for (i in selectionValues) {
            $('.modal-body option').filter(function(){
              return $(this).text() === selectionValues[i] && $(this).parent("select").val() !== selectionValues[i];
            }).attr("disabled", "disabled");
            $(`.modal-body input[type="checkbox"][value="${selectionValues[i]}"]`).parent("div").addClass("d-none");
          }
        });

        // trigger modal
        $('#csvOptionsModal').modal("show");

        // clear input on close unless successful
        $('#csvOptionsModal').on('hidden.bs.modal', function(){
          if ($('#csvOptionsModal').attr('clearInputOnClose') !== undefined) {
            $('#files').val('');
          }
        });
      }
    }

    // *************************************************************************
    // Utilities
    // *************************************************************************

    // utility to update chart after first build
    function UpdateChart(graphConfig, concertData) {

      // chart title update
      if (graphConfig['chartTitle']) {
        var chartTitle = graphConfig['chartTitle'];
      } else {
        var chartTitle = "Untitled Chart";
      }
      $('#chart-title').text(chartTitle);

      // COLOR UPDATING
      if (graphConfig['categoryHighlightVariable']) {

        // build or update stylesheet
        var styleContainer = [];
        var styleKey = {};
        let i = 0;
        for (category in graphConfig['categoryHighlight']) {
          let styleClass = `category-highlight${i}`;
          styleContainer.push(`.bar-segment.${styleClass}, .legend-item-color.${styleClass} { background-color: ${graphConfig['categoryHighlight'][category]};} `);
          styleKey[category] = styleClass;
          i += 1;
        }
        $('#category-highlight-stylesheet').html(styleContainer.join(""));

        // match piece IDs to style classes
        var styleObj = {};
        for (concert in concertData){
          for (piece in concertData[concert]['pieces']) {
            var pieceObj = concertData[concert]['pieces'][piece];
            var highlightVariable = pieceObj[graphConfig['categoryHighlightVariable']];
            var styleClass = styleKey[highlightVariable];
            if (Array.isArray(styleObj[styleClass]) === true) {
              styleObj[styleClass].push(pieceObj['ID']);
            } else {
              styleObj[styleClass] = [pieceObj['ID']];
            }
          }
        }

        // clear old style classes and apply new ones
        $('div.bar-segment').removeClass(function(index, className) {
          return (className.match(/(^|\s)category-highlight\d+/g) || []).join(' ');
        });
        for (styleClass in styleObj) {
          var selectors = "#" + styleObj[styleClass].join(",#");
          $(selectors).addClass(styleClass);
        }

        // make and show legend items
        legendBuildContainer = [];
        for (key in styleKey) {
          if (graphConfig['legendLabel'][key].length > 0) {
            legendBuildContainer.push(
              `<div class="legend-item">`,
              `<div class="legend-item-color ${styleKey[key]}"></div>`,
              `<div class="legend-item-label">${graphConfig['legendLabel'][key]}</div>`,
              `</div>` // legend-item
            );  
          }
        }
        $('.legend-container').html(legendBuildContainer.join(""));
        
      }

      // bar labels
      if (graphConfig['barLabels']) {
        $('div.bar-label').removeClass("d-none");
      } else {
        $('div.bar-label').addClass("d-none");
      }

      // duration labels
      if (graphConfig['durationLabels']) {
        $('div.bar-segment-label').removeClass("d-none");
      } else {
        $('div.bar-segment-label').addClass("d-none");
      }

      // compact format
      if(graphConfig['compactFormat']) {
        $('.bar-container, .bar-graphic, .bar-segment').addClass('short-bar');
        $('div.bar-segment-label, div.bar-label').addClass("d-none");
      } else {
        $('.bar-container, .bar-graphic, .bar-segment').removeClass('short-bar');
      }

      // sort options
      // choose which property to sort by
      var sortProperty = "";
      if(graphConfig['sortOption'] === "Total Duration") {
        sortProperty = "Total Duration";
      } else if (graphConfig['sortOption'] === "Concert Title") {
        sortProperty = "self";
      } else if (graphConfig['sortOption'] === "Time to Intermission") {
        sortProperty = "Time to Intermission";
      } else if (graphConfig['sortOption'] === "First Performance") {
        sortProperty = "First Performance";
      }

      // build a sort array
      var sortArray = [];
      for (concert in concertData) {
        var concertItem = [];
        if (sortProperty === "self") {
          concertItem.push(concert);
        } else {
          concertItem.push(concertData[concert][sortProperty]);
        }
        concertItem.push(concertData[concert]['ID']);
        sortArray.push(concertItem);
      }
      
      // sort the concert divs
      SortConcerts(sortArray, graphConfig['sortOrder']);

      // build the embed code
      $('#embed-code-display').removeClass("d-none");

      var iframeVars = {};
      $.get("/svstyle.min.css", function(data){
        iframeVars.mainSS = data;
        GetEmbedScript(iframeVars);
      }, dataType="text");

      function GetEmbedScript(iframeVars) {
        $.get("/embedscript.js", function(data) {
          iframeVars.embedScript = data;
          UpdateEmbedCode(iframeVars);
        }, dataType="text");
      }

      function UpdateEmbedCode(iframeVars) {
        // select the embed ID which matches the category highlight variable
        var currentCategory = $('#select-highlight-category').val();
        var iframeID = "iframe-" + window.categoryIDs[currentCategory];

        var embedCode = [];
        var iframeCode = [];
        var graphHTML = $('#graph-insert').html();
        var categoryHighlightSS = $('#category-highlight-stylesheet').html();
        iframeCode.push(
          '<script>',
          `function alertsize(pixels, iframeID){pixels+=5;document.getElementById(iframeID).style.height=pixels+"px";}`,
          '</script>',
          `<iframe id="${iframeID}" title="${chartTitle}" src="YOUR_URL_HERE" frameborder="0" style="width: 0; min-width: 100% !important; border: none;">`,
          '</iframe>'
        );
        embedCode.push(
          '<html lang="en"><head><meta charset="UTF-8">',
          '<title>Document</title>',
          '<script src="https://ajax.googleapis.com/ajax/libs/jquery/3.6.0/jquery.min.js"></script>',
          '<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.1/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-+0n0xVW2eSR5OomGNYDnhzAbDsOXxcvSN1TPprVMTNDbiYZCxYbOOl7+AMvyTG2x" crossorigin="anonymous">',
          '<style>',
          iframeVars.mainSS,
          '</style>',
          '<style>',
          categoryHighlightSS,
          '</style>',
          '<script>',
          iframeVars.embedScript,
          '</script>',
          '</head>',
          `<body onload="parent.alertsize(document.body.scrollHeight, '${iframeID}');" iframeID="${iframeID}">`,
          graphHTML,
          '</body>',
          '</html>'
        );
        $('#iframe-code-text').val(iframeCode.join(""));
        $('#embed-code-text').val(embedCode.join(""));  
      }
    }

    // utility for creating and updating category highlight UI
    function CategoryHighlightMenuChange(data) {
      var attribute = $('#select-highlight-category').val();

      // no selection
      if (attribute === "null") {
        $('#highlight-category-list').html("");
        $('#highlight-category-list').addClass("d-none");
        return;
      }

      // generate color UI for each variable
      var attributeValues = [];
      for (i in data) {
        attributeValues.push(data[i][attribute]);
      }
      var uniqueValues = [...new Set(attributeValues)];
      uniqueValues.sort((a, b) => a - b); // sort smallest to largest

      var valueList = [`<p>Only labeled categories will appear in the legend:</p><div>`];
      for (value in uniqueValues) {
        valueList.push(ColorPicker(value, BlankToggle(uniqueValues[value], "readable"),"categoryHighlight"));
      }
      valueList.push(`</div>`);

      $('#highlight-category-list').removeClass("d-none");
      $('#highlight-category-list').html(valueList.join(""));

      // restores previously selected colors
      if (window.colorUI[attribute] !== {}) {
        for (variable in window.colorUI[attribute]) {
          $(`#highlight-category-list .highlight-category-color-picker[datapoint="${variable}"]`).val(window.colorUI[attribute][variable]);
        }
      }

      // restores previously selected labels
      if (window.colorUILabels[attribute] !== {}) {
        for (variable in window.colorUILabels[attribute]) {
          $(`#highlight-category-list .legend-label[datapoint="${variable}"]`).val(window.colorUILabels[attribute][variable]);
        }
      }

      // remember color selections
      $('.highlight-category-color-picker').change(function(e){
        var highlightCategory = $('#select-highlight-category').val();
        var selectedColor = $(this).val();
        var selectedVariable = $(this).attr("datapoint");
        Object.assign(window.colorUI[highlightCategory], {[selectedVariable]: selectedColor});
      });

      // remember legend labels
      $('.legend-label').change(function(e){
        var highlightCategory = $('#select-highlight-category').val();
        var selectedLabel = $(this).val();
        var selectedVariable = $(this).siblings("span").text();
        Object.assign(window.colorUILabels[highlightCategory], {[selectedVariable]: selectedLabel});

      });
    }

    // color picker UI generator, uses provided palette
    function ColorPicker(number, name, section) {
      var pickerBuilder = [];
      pickerBuilder.push(
        `<div class="row align-items-center mb-2">`,
        `<input type="color" class="highlight-category-color-picker form-control form-control-color col-lg-auto" name="${[section,name].join(";")}" value="${colorPalette.highlight1}" datapoint="${name}" list="colors${number}">`,
        `<div class="input-group col">`,
        `<span class="input-group-text legend-datapoint">${name}</span>`,
        `<input type="text" class="form-control legend-label" placeholder="label" name="legendLabel;${name}" datapoint="${name}">`,
        `</div>`,
        `<datalist id="colors${number}">`
      );
      for (color in colorPalette) {
        pickerBuilder.push(`<option>${colorPalette[color]}</option>`);
      }
      pickerBuilder.push(`</datalist></div>`);
      return pickerBuilder.join("");
    }

    // utility function for handing blank strings in data - in "backend", we want it to match the data, but in frontend, blank values need a label.
    function BlankToggle(value, mode) {
      if (mode === "readable") {
        if (value === "") {
          return "blank";
        } else {
          return value;
        }
      } else if (mode === "data") {
        if (value === "blank") {
          return "";
        } else {
          return value;
        }
      } else {
        return value;
      }
    }

    // utility to turn options form output (flat, array of objects) into single config object that is nested where required
    function ConfigBuilder(formResults) {
      var graphConfig = {};

      for (result in formResults) {
        var value = formResults[result]['value'];
        var keyArr = formResults[result]['name'].split(";").map(x => BlankToggle(x, "data")); // blank -> back into -> ""

        // Seems to be the best way to handle nested levels. Not elegant.
        if (keyArr.length === 1) {
          graphConfig[keyArr[0]] = value;
        } else if (keyArr.length === 2) {
          // also not elegant
          if (graphConfig[keyArr[0]] === undefined) {
            graphConfig[keyArr[0]] = {};
          }
          graphConfig[keyArr[0]][keyArr[1]] = value;
        } else {
          console.log("ERROR: invalid graphConfig item: ", result);
        }
      }
      return graphConfig;
    }

    // utility to generate unique IDs
    // checks passed array and DOM for matches to ensure uniqueness
    function IdGenerator(prefix, array) {
      do {
        var id = prefix + Math.round(Math.random() * 10**8);
        for (i in array) {
          if (array[i].includes(id)) var arrayflag = true;
        }
      } while ( $("#" + id).length > 0 || arrayflag );
      return id;
    }

    // utility to sort concerts
    function SortConcerts(sortArray, order) {
      if (sortArray === "" || sortArray === undefined) return;
      // sort array
      if (order === "descending") {
        if (typeof(sortArray[0][0]) === "number") {
          sortArray.sort((a, b) => b[0] - a[0]); // largest to smallest
        } else {
          sortArray.sort().reverse();
        }
      } else {
        if (typeof(sortArray[0][0]) === "number") {
          sortArray.sort((a, b) => a[0] - b[0]); // smallest to largest
        } else {
          sortArray.sort();
        }
      }

      // move divs around
      // i is a string? don't know why, but using `==` works... probably because each item in the array is itself an array, and arrays are technically objects??
      for (i in sortArray) {
        if (i == 0) {
          $('#' + sortArray[i][1]).insertAfter('.bars-container');
        } else {
          $('#' + sortArray[i][1]).insertAfter('#' + sortArray[i-1][1]);
        }
      }
    }

});
