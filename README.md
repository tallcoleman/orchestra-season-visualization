# Orchestra Season Visualization
 An interactive data visualization creator for orchestra seasons.

 Live app: [osv.tallcoleman.me](https://osv.tallcoleman.me)

<img src="https://github.com/tallcoleman/orchestra-season-visualization/blob/main/assets/example-orchestra-season-visualization.png" alt="Example Orchestra Season Visualization Chart" width="400">

## Instructions

### Required Data

You will need to have a CSV file with data on an orchestra season to use this app. This [Google Sheets template](https://docs.google.com/spreadsheets/d/1vjnSCB0-PcOmk-7fNMT2whfK8Xjfdpagd5BBSe9RwMg/edit?usp=sharing) shows the required and optional data you will need along with some example rows.

The app requires the following minimum data to output a chart:

* **Work Title**: text, the title of each piece of music
* **Duration**: integer, in minutes
* **Concert Title**: text, used to group pieces into bars
* **Program Position**: integer, the order a piece appears on the concert program

You can also provide the following optional data:

* **Composer**: text, can be used for colour coding; will be displayed when a piece is selected on the chart
* **Act**: integer, required if you want to sort by time to first intermission
* **First Performance**: date in YYYY-MM-DD format, required if you want to sort by first performance
* **Performances Count**: integer, currently unused. Indicates the number of times a concert program was performed.

Any other data provided in the csv can be used to colour-code pieces in the chart. Column headings can be customized - they will be matched to the right data field when the data is loaded.

### Loading Data

1. Select "Choose File" and select your CSV

2. You will be presented with the Data Options menu. In the Required Data and Optional Data sections, select the appropriate column headings from your CSV for each data field. Optional data fields can be left blank.

3. In the Style Categories section, select the data columns you want to use to colour-code the pieces in your chart.

4. Select "Load Data" to build the initial chart.

### Customizing the Chart

You can customize the chart output using the "Chart Options" menu. The chart will update after you press "Update Chart".

To colour-code pieces, select an option under "Highlight Categories". The form will then list all of the unique values for that data field with a colour picker and legend label input for each. The colour picker varies by browser and includes a default colourblind-safe palette.

The "Use compact format" option under "Display Options" overrrides the options to show duration labels and concert titles.

### Interacting With the Chart

When a bar segment on the chart is selected, it will show information about that piece, including its title and composer (if composer is included in your data). You can select the bar segment again to close this information.

### Embedding the Chart

After "Update Chart" has been selected at least once, embedding code will be displayed below the chart.

To embed the chart in another webpage, follow the instructions provided on the page. The embed option currently requires you to save and serve the graph html from your own url and to insert an iframe which loads the graph.

## Bugs / Feature Requests

Please submit any bugs or requests for functionality using the [Issues tab in Github](https://github.com/tallcoleman/orchestra-season-visualization/issues).