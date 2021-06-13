$(document).ready(function() {

  // initialization TODO review later
  // maybe the type on "First Performance" should be 'date' or something
  var coreData = {
    'Work Title':         {'required': true,  'type': 'str', 'category': false, 'pieceAttr': false},
    'Duration':           {'required': true,  'type': 'int', 'category': false, 'pieceAttr': true},
    'Concert Title':      {'required': true,  'type': 'str', 'category': false, 'pieceAttr': false},
    'Program Position':   {'required': true,  'type': 'int', 'category': false, 'pieceAttr': true},
    'Composer':           {'required': false, 'type': 'str', 'category': true, 'pieceAttr': true},
    'Act':                {'required': false, 'type': 'int', 'category': false, 'pieceAttr': true},
    'First Performance':  {'required': false, 'type': 'str', 'category': false, 'pieceAttr': false}
  }

  var colorPalette = {
    highlight1: "#BBBBBB",
    highlight2: "#4477AA",
    highlight3: "#66CCEE",
    highlight4: "#228833",
    highlight5: "#CCBB44",
    highlight6: "#EE6677",
    highlight7: "#AA3377",
  };

  // used to remember UI color selections
  window.colorUI = {};

  // file submission handler; parse config
  $('#files').on("change", function(e) {
    e.preventDefault();

    // see papaparse docs for details on config options
    $('#files').parse({
      config: {
        delimiter: "",
        quoteChar: '"',
        header: true,
        skipEmptyLines: 'greedy',
        complete: buildChart,
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

  // graph builder
  function buildChart(results, graphConfig) {
    var data = results.data;
    var buildContainer = [];
    var concertData = {};
    var csvHeadings = Object.keys(data[0]); // duplicated below?
    console.log("csv headings", csvHeadings);

    // get data map for CSV headings
    dataMapUIBuilder(csvHeadings);

    // trigger build if data map form submitted
    $('#csv-options-form').submit(function(e){
      e.preventDefault();
      var validationFlag = true;
      $('#csv-options-form select[required]').each(function(index, selectItem) {
        if (selectItem.value === "null") {
          $(selectItem).addClass("is-invalid");
          validationFlag = false;
        } else $(selectItem).removeClass("is-invalid");
      });
      if (validationFlag === false) return;
      var headingKeyInput = $(this).serializeArray();
      $('#csvOptionsModal').modal("hide");
      buildChart2(headingKeyInput);
    });

    // TODO remove - temporary heading key & builder - just dismiss modal
    // var headingKeyInput = [{name: "Work Title", value: "WorkTitle"}, {name: "Duration", value: "Duration"}, {name: "Concert Title", value: "ConcertTitle"}, {name: "Program Position", value: "ProgramPosition"}, {name: "Composer", value: "Composer"}, {name: "Act", value: "null"}, {name: "First Performance", value: "null"}, {name: "highlight-include-6", value: "Living"}, {name: "highlight-include-7", value: "Women"}, {name: "highlight-include-8", value: "Heritages"}];
    // buildChart2(headingKeyInput);

    function buildChart2(headingKeyInput){
      var hKey = {};
      for (i in headingKeyInput) {
        Object.assign(hKey, {[headingKeyInput[i]['name']]: headingKeyInput[i]['value']});
      }
      console.log("heading key", hKey);


      // DATA HANDLING
      // rebuild data in nested form
      for (i in data) {
        row = data[i];

        // first time each concert is created
        if (concertData[row[hKey['Concert Title']]] == undefined) {
          concertData[row[hKey['Concert Title']]] = {pieces: {}};
        }

        // build piece attributes
        var newPiece = {};
        for (key in hKey) {
          // check if it's in coreData; check if it's a piece attribute
          if (coreData[key] === undefined) {
            Object.assign(newPiece, {[hKey[key]]: row[hKey[key]]});
          } else if (coreData[key]['pieceAttr'] === true) {
            // check data type
            if (coreData[key]['type'] === "int") {
              Object.assign(newPiece, {[key]: parseInt(row[hKey[key]])});
            } else {
              Object.assign(newPiece, {[key]: row[hKey[key]]});
            }
          }
        }

        // add the piece to the concert
        Object.assign(concertData[row[hKey['Concert Title']]]['pieces'], {[row[hKey['Work Title']]]: newPiece});
      }

      // create concert metadata
      for (concert in concertData) {
        // max sequence number in csv can warn if pieces != max sequence (missing data case); think about how to handle WorkCount; can add other properties too (e.g. first performance, times performed)

        // total duration (another option: to array, and then array reduce)
        totalDuration = 0;
        for (piece in concertData[concert]['pieces']) {
          totalDuration += concertData[concert]['pieces'][piece]['Duration'];
        }
        Object.assign(concertData[concert], {'TotalDuration': totalDuration});

        // TODO first performance, times performed
      }

      // GRAPH BUILDING
      // find max concert duration & sort concerts by duration
      var totalDurations = [];
      for (concert in concertData) {
        totalDurations.push([concert, concertData[concert]['TotalDuration']]);
      }
      var totalDurationValues = totalDurations.map(a => a[1]);
      var maxConcertDuration = Math.max(...totalDurationValues);
      totalDurations.sort((a, b) => b[1] - a[1]); // largest to smallest

      // chart container, heading, TODO legend container
      buildContainer.push(
        `<div class="chart-container">`,
        `<h2 class="chart-title" id="chart-title">Untitled Chart</h2>`,
        `<div class="bars-container">`
      );

      // build divs for individual concerts
      for (i in totalDurations) {
        var concert = totalDurations[i][0];
        // label, bar holder

        buildContainer.push(
          `<div class="bar-container">`,
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
        var concertDuration = concertData[concert]['TotalDuration'];

        var infoDivs = [`<div class="bar-info-container d-none">`];

        // build divs for individual pieces
        for (i in pieceIndex) {
          var piece = pieceIndex[i][0];
          var pieceObj = concertData[concert]['pieces'][piece];

          // set width of bars - TODO consider adding a manual width scale option
          var pieceDuration = pieceObj['Duration'];
          var left = Math.round(previous / maxConcertDuration * (100 * 10000)) / 10000;
          var right = Math.round(((maxConcertDuration - (previous + pieceDuration)) / maxConcertDuration) * (100 * 10000)) / 10000;
          previous += pieceDuration;

          // unique IDs
          var pieceDivID = idGenerator("piece-", buildContainer);
          concertData[concert]['pieces'][piece]['ID'] = pieceDivID;
          var infoDivID = idGenerator("info-", buildContainer);

          // build info divs
          infoDivs.push(
            `<div class="bar-info-segment d-none" id="${infoDivID}">`,
            `<span class="piece-composer-name">${pieceObj['Composer']}: </span>`,
            `<span class="piece-title">${piece}</span>`,
            `</div>`
          );

          buildContainer.push(
            `<div class="bar-segment" id="${pieceDivID}" infoid="${infoDivID}" style="left: ${left}%; right: ${right}%;">`,
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
      buildContainer.push(`</div></div>`); // chart-container and bars-container

      // add graph to DOM
      $('#graph-insert').html(buildContainer.join(""));

      // make concertData a global variable
      window.concertData = concertData;
      console.log("concert data object: ", concertData);

      // reveal options form
      $('#options-form').removeClass("d-none");

      // event handler to open info panels
      $('.bar-segment').click(function(e) {
        var infoID = "#" + $(this).attr("infoid");
        $(infoID).siblings().addClass("d-none");
        $(this).siblings().removeClass("bar-segment-selected");
        $(infoID).toggleClass("d-none");
        $(this).toggleClass("bar-segment-selected");
        if ($(infoID).siblings().addBack().filter(':not(.d-none)').length > 0) {
          $(infoID).parent("div").removeClass("d-none");
        } else {
          $(infoID).parent("div").addClass("d-none");
        }
      });

      // $(infoID).parent("div").toggleClass("d-none");


        // CATEGORY HIGHLIGHT UI
        // category highlight - selector input
        var highlightCategories = [`<li><option value="null"></option></li>`];
        for (key in hKey) {
          if (coreData[key] === undefined || coreData[key]['category'] === true) {
            highlightCategories.push(`<li><option>${hKey[key]}</option></li>`);
            window.colorUI[hKey[key]] = {};
          }
        }
        $('#select-highlight-category').html(highlightCategories.join(""));

        // category highlight - generate new options on change
        $('#select-highlight-category').change(function() {
          categoryHighlightMenuChange(data);
        });

      }

      // refreshes graph on form submit
      $('#options-form').submit(function(e){
        e.preventDefault();
        var newConfig = configBuilder($(this).serializeArray());
        updateChart(newConfig, window.concertData);
      });

      // utility to build data map UI
      function dataMapUIBuilder(csvHeadings) {
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
        // TODO clear the file input? But not when successful?
        $('#csvOptionsModal').on('hidden.bs.modal', function(){
          // console.log("modal finished");
        });

        // $('#csv-options-form').submit(function(e){
        //   e.preventDefault();
        //   $('#csvOptionsModal').modal("hide");
        //   console.log($(this).serializeArray());
        //   return $(this).serializeArray(); // TODO make mapping object
        // });
      }
    }

    // UTILITIES START HERE

    // utility to update chart after first build
    function updateChart(graphConfig, concertData) {
      // chart title update
      if (graphConfig['chartTitle']) {
        $('#chart-title').text(graphConfig['chartTitle']);
      }

      // COLOR UPDATING
      if (graphConfig['categoryHighlightVariable']) {

        // build or update stylesheet
        var styleContainer = [];
        var styleKey = {};
        let i = 0;
        for (category in graphConfig['categoryHighlight']) {
          let styleClass = `category-highlight${i}`;
          styleContainer.push(`.bar-segment.${styleClass} { background-color: ${graphConfig['categoryHighlight'][category]};} `);
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
      // TODO make it a bit more robust than just "running after" prev 2 checks?
      if(graphConfig['compactFormat']) {
        $('.bar-container, .bar-graphic, .bar-segment').addClass('short-bar');
        $('div.bar-segment-label').addClass("d-none");
        $('div.bar-label').addClass("d-none");
      } else {
        $('.bar-container, .bar-graphic, .bar-segment').removeClass('short-bar');
      }

      // TODO option to sort in a different order

    }

    // utility for creating and updating category highlight UI
    function categoryHighlightMenuChange(data) {
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

      var valueList = [`<div>`];
      for (value in uniqueValues) {
        valueList.push(colorPicker(value, blankToggle(uniqueValues[value], "readable"),"categoryHighlight"));
      }
      valueList.push(`</div>`);

      $('#highlight-category-list').removeClass("d-none");
      $('#highlight-category-list').html(valueList.join(""));

      // restores previously selected colors
      if (window.colorUI[attribute] !== {}) {
        for (variable in window.colorUI[attribute]) {
          $(`#highlight-category-list label:contains(${variable})`).siblings("input").val(window.colorUI[attribute][variable]);
        }
      }

      // remember color selections
      $('.highlight-category-color-picker').change(function(e){
        var highlightCategory = $('#select-highlight-category').val();
        var selectedColor = $(this).val();
        var selectedVariable = $(this).siblings("label").text();
        Object.assign(window.colorUI[highlightCategory], {[selectedVariable]: selectedColor});
      });

      // TODO - after chart update routine is written - try to make it update on change, e.g.
      // $('#highlight-category-list input').change(function() {
      //   // run update chart routine
      // });
    }

    // color picker UI generator, uses provided palette
    function colorPicker(number, name, section) {
      var pickerBuilder = [];
      pickerBuilder.push(
        `<div class="row align-items-center mb-2">`,
        `<input type="color" class="highlight-category-color-picker form-control form-control-color col-lg-auto" name="${[section,name].join(";")}" value="${colorPalette.highlight1}" list="colors${number}">`,
        `<label for="catColor${number}" class="form-label col">${name}</label>`,
        `<datalist id="colors${number}">`
      );
      for (color in colorPalette) {
        pickerBuilder.push(`<option>${colorPalette[color]}</option>`);
      }
      pickerBuilder.push(`</datalist></div>`);
      return pickerBuilder.join("");
    }

    // utility function for handing blank strings in data - in "backend", we want it to match the data, but in frontend, blank values need a label. There's probably a better way to write this function.
    function blankToggle(value, mode) {
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
    function configBuilder(formResults) {
      var graphConfig = {};

      for (result in formResults) {
        var value = formResults[result]['value'];
        var keyArr = formResults[result]['name'].split(";").map(x => blankToggle(x, "data")); // blank -> back into -> ""

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
    function idGenerator(prefix, array) {
      do {
        var id = prefix + Math.round(Math.random() * 10**8);
        for (i in array) {
          if (array[i].includes(id)) var arrayflag = true;
        }
      } while ( $("#" + id).length > 0 || arrayflag );
      return id;
    }

});
