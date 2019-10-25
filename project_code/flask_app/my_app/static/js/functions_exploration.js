// Functions specific to the "exploration" task
// Vars in the function_main file are accessible in this file

//This will display the graph evenly
function displayGraphEvenly(){
    var numNodes = nodes.get().length, degree = ((2*Math.PI)/(numNodes-1)), increment = 0;
    var maxDistance = 500;

    // Add the plus one to account for the possible removal of a duplicate table after first taking in a table in user exploration
    for(i = 2; i <= numNodes + 1; i++){
        if (nodes.get(i)) {
            distance = radius*((1/nodes.get(i).columnsMatching) + 2.5);
            if (distance > maxDistance) distance = maxDistance;
            nodes.update({id: i, x: Math.cos((degree*increment))*distance});
            nodes.update({id: i, y: Math.sin((degree*increment))*distance});
            increment++;

        }
    }
    var fitOptions = { offset: { x: 0, y: 0 }, duration: 0, easingFunction: "easeInOutQuad" };
    network.fit({ animation: fitOptions });
}

function displayLevelHierarchy() {
    var w = document.documentElement.clientWidth, h = document.documentElement.clientHeight,
    numNodes = nodes.get().length, i, y = 150, x = 100, currentLevel=0;
    network.moveTo({
        position: {x: 0, y: 0},
        offset: {x: -w/2, y: -h/2},
        scale: 1,
    });
    for(i=1;i<=numNodes;i++){
        if (currentLevel != nodes.get(i).level){
            currentLevel = nodes.get(i).level;
            y = y + 150;
            x = 100;
        }
        nodes.update({id: i, y: y});
        nodes.update({id: i, x: x});
        x = x + 200;
    }
    var fitOptions = { offset: { x: 0, y: 0 }, duration: 0, easingFunction: "linear" };
    network.fit({ animation: fitOptions });
}


//call this function to get the dropwdown menu information and also to reset (always reset when starting over or starting fresh)
//returns complete list of column names (can be used to make dropdown list)
function resetAndGetInfoForDropDown(){
    resetVariables();
    $.getJSON($SCRIPT_ROOT + '/get_all_cols', {},
        function(data) {
            if(data){
                columns = data;
                var newHtml = "";
                for (var i = 0; i < columns.length; i++) {
                    newHtml = newHtml + '<li><a href="#" onclick="onClickDropdown(this)">' + columns[i] + '</a></li>';
                }
                $(document.getElementById('dropdown-ul')).html(newHtml);
                $(document.getElementById('dropdown-ul-left')).html(newHtml);
                $(document.getElementById('dropdown-ul-right')).html(newHtml);
            }else{
            }
        });
    //make call to backend function /get_all_cols, which takes no parameters and returns a list of column names
    //return list of column names
}


// Also used for computer-guided exploration
function onClickDropdown(clicked) {
    var text = clicked.innerHTML;
    var columnID = clicked.parentElement.parentElement.getAttribute("id");
    if (columnID == "dropdown-ul-left") {
        dropdownColumnLeft = text;
        $(document.getElementById('dropdown-menu-left')).html(text + ' <span class="caret">');
        $("#loading-text").html("");
    } else if (columnID == "dropdown-ul-right") {
        dropdownColumnRight = text;
        $(document.getElementById('dropdown-menu-right')).html(text + ' <span class="caret">');
        $("#loading-text").html("");
    } else if (columnID == "dropdown-ul") {
        dropdownColumn = text;
        $(document.getElementById('dropdown-menu')).html(text + ' <span class="caret">');
        $("#loading-text").html("");
    } else if (columnID == "dropdown-ul-saved") {
        dropdownColumnSaved = text;
        $(document.getElementById('dropdown-menu-saved')).html(text + ' <span class="caret">');
    }
}

// Helper function for function below, turns a list into a newline string
function listOfColsToString(listOfCols) {
    var colString = "";
    for(var i = 0; i < listOfCols.length-1; i++) {
        colString = colString + listOfCols[i] + "\n";
    }
    colString = colString + listOfCols[i];
    return colString;
}

function fitGraph() {
    var fitOptions = { offset: { x: 0, y: 0 }, duration: 1000, easingFunction: "easeInOutQuad" };
    network.fit({ animation: fitOptions });
}

//call /get_tables_with_cols, pass in required_cols and optional_cols
//replace main-div with graph display of result
function displayTablesAsGraph(requiredCols) { //requiredCols is a list
  if (currentTableName == null) {
    if (dropdownColumn == null) {
      $("#loading-text").html("No dropdown column name was selected. Please select a column name.");
    } else {
      var requiredCols = JSON.stringify(requiredCols);
      var optionalCols = JSON.stringify([]);
      $.getJSON($SCRIPT_ROOT + '/get_tables_with_cols', {required_cols: requiredCols, optional_cols: optionalCols},
          function(data) {
            if(data){
              var allTables = data; // [[table_name, [related_col_names], [all_col_names], ingest_date], ...]
              nodes = new vis.DataSet([]);
              edges = new vis.DataSet([]);
              for (var i = 0; i < allTables.length; i++) {
                var relatedCols = allTables[i][1];
                var allCols = allTables[i][2];
                var colsMatching = relatedCols.length / currentTableColumns.length;
                nodes.add({id: i+2, group: 'surrounding', label: allTables[i][0]+'\n\n'+dropdownColumn, data: allTables[i][0]+'\n\n'+listOfColsToString(allCols)+'\n\n'+"Ingest date: "+allTables[i][3],
                    columnsMatching: colsMatching,  x: 0, y: 0, name:allTables[i][0]});
                edges.add({ from: 1, to: i+2 });
              }
              nodes.add({id: 1, group: 'center', label: dropdownColumn, x: 0, y: 0, name: currentTableName});
              $(document.getElementById('main-div')).html('<div class="center"><button onclick="fitGraph()" class="btn btn-primary" id="fit-button">Center Graph</button><button onclick="onUndoClick()" class="btn btn-info" id="goback-button">Return</button></div><br><div id="network"></div>');
              container = document.getElementById('network');
              $("#instruction").html("These are the current tables that contain the column you selected. Click on one of the tables to continue connecting.")
              data = { nodes: nodes, edges: edges };
              network = new vis.Network(container, data, options);
              //blurNode **MUST** be called with hover node.  Blur node event means mouse is no longer on node
                network.on("hoverNode", function (properties) {
                    onHoverNode(properties);
                });
                network.on("blurNode", function (properties) {
                    onHoverNode(properties);
                });
                network.on("selectNode", function (properties) {
                    onClickNode(properties);
                });
                displayGraphEvenly();
            } else {
            }
      });
      $("#loading-text").html("Loading table graph...");
    }

    //if currentTableName is null:
      //required_cols is set to requiredCols (should be a list of one)
      //optional_cols is []
    	// makes ajax call to see first 16 columns
    	// displays graph in main-div with "fake central table" with single "col name" that was chosen
    	// all outside nodes equidistant
    	//returns
  } else {
    var requiredCols = JSON.stringify(requiredCols);
    var optionalCols = JSON.stringify(currentTableColumns);
    $.getJSON($SCRIPT_ROOT + '/get_tables_with_cols', {required_cols: requiredCols, optional_cols: optionalCols},
        function(data) {
          if(data){
            var allTables = data; // [[table_name, [related_col_names], [all_col_names], ingest_date], ...]
            nodes = new vis.DataSet([]);
            edges = new vis.DataSet([]);
            for (var i = 0; i < allTables.length; i++) {
              if (allTables[i][0] != currentTableName) {
                var relatedCols = allTables[i][1];
                var allCols = allTables[i][2];
                var colsMatching = relatedCols.length / currentTableColumns.length;
                nodes.add({id: i+2, group: 'surrounding', label: (allTables[i][0]+'\n\n'+listOfColsToString(relatedCols)), data: (allTables[i][0]+'\n\n'+listOfColsToString(allCols)+'\n\n'+"Ingest date: "+allTables[i][3]),
                columnsMatching: colsMatching,  x: 0, y: 0, name: allTables[i][0]});
                edges.add({ from: 1, to: i+2 });
              }
            }
            nodes.add({id: 1, group: 'center', label: (currentTableName+'\n\n'+listOfColsToString(currentTableColumns)), x: 0, y: 0, name: currentTableName});
            $(document.getElementById('main-div')).html('<div class="center"><button onclick="fitGraph()" class="btn btn-primary" id="fit-button">Center Graph</button><button onclick="displayCurrentTable()" class="btn btn-info" id="goback-button">Return</button></div><br><div id="network"></div>');
            $("#instruction").html("These are the tables that contain at least one of the same columns as your current table. Click on one of the tables to continue connecting.")
            container = document.getElementById('network');
            data = { nodes: nodes, edges: edges };
            network = new vis.Network(container, data, options);

            //blurNode **MUST** be called with hover node.  Blur node event means mouse is no longer on node
            network.on("hoverNode", function (properties) {
                onHoverNode(properties);
            });
            network.on("blurNode", function (properties) {
                onHoverNode(properties);
            });
            network.on("selectNode", function (properties) {
                onClickNode(properties);
            });
            displayGraphEvenly();
          } else {
          }
    });
    //else
      	// (currentTableName is not null): (This is after clicking "continue")
        // required_cols is set to requiredCols
        // optional_cols is all table columns in current table (currentColumns in main js file)
        // displays graph in main-div with central current table and surrounding tables
        // central: display all column names
        // outside tables: display all relevant column names, display all columns on hover
        // outside notes are closer if they have more matching column names
        // return
  }
}

//Alex is researching how to do this (this might be defined when the nodes are defined in the displayTablesAsGraph()
//originally nodes display the columns they have in common with the central table
//when hovered, they display all columns, table name, ingest date
function onHoverNode(properties){
    var toGet = properties.node, title = nodes.get(toGet).label;
    if(toGet == 1){}
    else if ((title.length == nodes.get(toGet).data.length) && title.localeCompare(nodes.get(toGet).data)){}
    else {
        nodes.update({id: toGet, label: nodes.get(toGet).data});
        nodes.update({id: toGet, data: title});
    }
}


//Same as onHover, but also includes node 1
function onHoverNodeCGL(properties, option) {
    var toGet = properties.node, title = nodes.get(toGet).label;
    if ((title.length == nodes.get(toGet).data.length) && title.localeCompare(nodes.get(toGet).data)) {}
    else {
        nodes.update({id: toGet, label: nodes.get(toGet).data});
        nodes.update({id: toGet, data: title});
    }
}


//Alex is researching how to do this (this might be defined when the nodes are defined in the displayTablesAsGraphs()
function onClickNode(properties){
    var tableName = nodes.get(properties.nodes[0]).name;
    if (currentTableName == null && tableName != null) {
    //set currentTableName to table of clicked node
    currentTableName = tableName;
    //call backend function /reset_cached_table_list with parameter table_name
    $.getJSON($SCRIPT_ROOT + '/reset_cached_table_list', { table_name: tableName }, function(data) {
    });
    //  table_tuple = ((db_table_name, col_names, ingest_date), [entries[0], entries[1], entries[2], entries[3], entries[4]])
    $.getJSON($SCRIPT_ROOT + '/get_table_info', { db_table_name: tableName },
        function(data) {
            if(data){
                currentTableColumns = data[0][1];
                currentTableIngestDate = data[0][2];
                currentTable5Examples = data[1];
            //call displayCurrentTable() (this replaces the main-div)
            displayCurrentTable();
        } else {
        }
    });
            //to add this table to user's cached_tables list (for undo functionality later)

        // TODO ^^^^
    } else if (tableName != currentTableName) {
        // this code below may be unnecessary if current cols and date are already in there
        $.getJSON($SCRIPT_ROOT + '/get_table_info', { db_table_name: currentTableName },
            function(data) {
                if(data){
                    currentTableColumns = data[0][1];
                    currentTableIngestDate = data[0][2];
                } else {
                }
            });
        //set selectedTableName, selectedTableColumns, and selectedTableIngestDate to the clicked node's values
        selectedTableName = tableName;
        $.getJSON($SCRIPT_ROOT + '/get_table_info', { db_table_name: selectedTableName },
            function(data) {
                if(data){
                    //store info on selected (right) table
                    selectedTableColumns = data[0][1];
                    selectedTableIngestDate = data[0][2];
                    //reset the selected left col, right col, and col name tuples
                    selectedLeftColName = null;
                    selectedRightColName = null;
                    selectedColNameTuples = [];
                    // direct to next page and direct to previous page not created yet
                    var newHtml = '<div class="center"><button class="btn btn-info" onclick="directToPreviousPage()">Return to Previous Page</button>' +
                    '<button class="btn btn-warning" onclick="onUndoColNameSelectionClick()">Undo Last Column Match</button>' +
                    '<button class="btn btn-primary" onclick="joinAndDisplayResult()">Join</button></div><div id="network"></div>';
                    $(document.getElementById('main-div')).html(newHtml);

                    displayColumnNames(currentTableColumns, selectedTableColumns);
                } else {
                }
            });
        //replaces main-div with two side by side tables, which list all the columns in each table
        //the one on the LEFT is the currentTableName's table and the one on the RIGHT is the selectedTableName's table
        //every column name in the left table should have an onclick function that calls  onLeftColNameClick(colName)
        //every column name in the right table should have an onclick function that calls onRightColNameClick(colName)
        //there will be two buttons: join and undo
        //undo will have an onclick method (defined below) onUndoColNameSelectionClick() that erases the last line drawn, if there was one
        //join will have an onclick method (defined below) joinAndDisplayResult()
    }
}



function onLeftColNameClick(colName){
    //set selectedLeftColName to colName
    selectedLeftColName = colName;
    //if selectedRightColName is not null:
    if(selectedRightColName != null) {
        //append tuple to selectedColNameTuples
        selectedColNameTuples.push([selectedRightColName, selectedLeftColName]);
        //display line between two columns
        addEdge(selectedRightColName, selectedLeftColName, 'black');
        //set selectedLeftColName to null
        selectedLeftColName = null;
        //set selectedRightColName to null
        selectedRightColName = null;
    }
}

function onRightColNameClick(colName){
    //set selectedRightColName to colName
    selectedRightColName = colName;
    //if selectedLeftColName is not null:
    if(selectedLeftColName != null){
        //append tuple to selectedColNameTuples
        selectedColNameTuples.push([selectedRightColName, selectedLeftColName]);
        //display line between two columns
        addEdge(selectedRightColName, selectedLeftColName, 'black');
        //set selectedLeftColName to null
        selectedLeftColName = null;
        //set selectedRightColName to null
        selectedRightColName = null;
    }
}

// Takes in the left table column list and right table column list and displays both of them beside each other.
function displayColumnNames(leftColumnNames, rightColumnNames){
	var currentYRightColumns = 25;
	var currentYLeftColumns = 25;
	var xPositionLeftColumns = 0;
	var xPositionRightColumns = 200;
	var idCounter = 0;

	nodes = new vis.DataSet();
	edges = new vis.DataSet();

  nodes.add({id: -1, label: "Left Table", x: xPositionLeftColumns, y: -25, side: 'left', shape: 'rectangle', color: 'white', font: { size: 16,}});
	for(var i = 0; i < leftColumnNames.length; i++){
		var name = 'column' + idCounter;
		addColumnNode(name, 'left', leftColumnNames[i], xPositionLeftColumns, currentYLeftColumns);
		currentYLeftColumns += 25;
		idCounter++;
	}

  nodes.add({id: -2, label: "Right Table", x: xPositionRightColumns, y: -25, side: 'right', shape: 'rectangle', color: 'white', font: { size: 16,}});
	for(var i = 0; i < rightColumnNames.length; i++){
		var name = 'column' + idCounter;
		addColumnNode(name, 'right', rightColumnNames[i], xPositionRightColumns, currentYRightColumns);
		currentYRightColumns += 25;
		idCounter++;
	}

	displayResult();
  var fitOptions = { offset: { x: 0, y: 0 }, duration: 0, easingFunction: "easeInOutQuad" };
  network.fit({ animation: fitOptions });

  $("#instruction").html("Click two opposing column names to match them and discover connections. Then, a line and connection will be created, and you can" + 
      " choose to undo any matches or join the two tables with those matching columns. Try to make connections between columns that would have unique values," +
      " such as emails or IP addresses.")
	// This function is called when a column is clicked. It fetches the column node id, then finds the node object. After that,
	// it checks whether it was a right or left column and calls the appropriate function. Edges are created based on
	// consecutive right and left clicks.
	// NOTE** We may need to move this function when we get to the page where columns are displayed. This function should not
	// activate when any node that isn't a column node is clicked. I will eventually make a columnNodes list.
	network.on("click", function (params) {
		var clickedNodeId = (params.nodes)[0];
		var columnSide = nodes.get(clickedNodeId).side;

		//NOTE: TESTING FOR BUGS
		if(columnSide === 'right' && clickedNodeId !== -1 && clickedNodeId !== -2){
			onRightColNameClick(clickedNodeId);
		} else if(columnSide === 'left' && clickedNodeId !== -1 && clickedNodeId !== -2) {
			onLeftColNameClick(clickedNodeId);
		}
	});
}
//TODO: This will be to go one step back from the join on columnms
function directToPreviousPage() {
    onContinueClick();
}

function onUndoColNameSelectionClick(){
	if(selectedColNameTuples.length > 0){
		//remove last tuple from selectedColNameTuples
		var columnTuple = selectedColNameTuples.pop();
		//redraw lines between two tables
		removeEdge('edge'+columnTuple[0]+columnTuple[1]);
		//set selectedLeftColName to null
		selectedLeftColName = null;
		//set selectedRightColName to null
		selectedRightColName = null;
	}
}

function displayResult(){
	var container = document.getElementById('network');
	var data = {
		nodes: nodes,
		edges: edges
	};
	network = new vis.Network(container, data, options);
}

// table-tuple [[new_table_name, [col_names], ingest_date], [entry, entry, entry, entry, entry]]
function joinAndDisplayResult(){
    //if selectedColNameTuples is not an empty list
	if(selectedColNameTuples.length > 0){

    var colNameTuples = [];
    for (var idx = 0; idx < selectedColNameTuples.length; idx++){
      var tup = [nodes.get(selectedColNameTuples[idx][0]).label, nodes.get(selectedColNameTuples[idx][1]).label];
      colNameTuples.push(tup);
    }


        //call backend /join_two_tables function (pass in left table, right table, array of (left_col, right_col) tuples)
		$.getJSON($SCRIPT_ROOT + '/join_two_tables', {l_table: currentTableName, r_table: selectedTableName, join_pairs : JSON.stringify(colNameTuples)},
			function(data) {
				//save returned values to currentTableName, currentTableColumns, currentTableIngestDate, currentTable5Examples
				if(data){
					currentTableName = data[0][0]
                    currentTableColumns = data[0][1];
                    currentTableIngestDate = data[0][2];
                    currentTable5Examples = data[1];
                    //call displayCurrentTable()
                    displayCurrentTable();
                } else {
                }
			}
		);


    }
}


//uses the saved information in currentTableName, currentTableColumns, currentTableIngestDate, currentTable5Examples
//to display a table
//replaces main-div
// IN PROGRESS BY KARA
function displayCurrentTable(){
    var tableColHtml = "<tr>";
    for (var i = 0; i < currentTableColumns.length; i++) {
        tableColHtml = tableColHtml + "<th>" + currentTableColumns[i] + "</th>";
    }

    tableColHtml = tableColHtml + "</tr>";
    for (var j = 0; j < currentTable5Examples.length; j++) {
        tableColHtml = tableColHtml + "<tr>";
        for (var k = 0; k < currentTable5Examples[j].length; k++) {
            tableColHtml = tableColHtml + "<td>" + currentTable5Examples[j][k] + "</td>";
        }
        tableColHtml = tableColHtml + "</tr>";
    }
    // '<tr>{% for name in currentTableColumns %}<th>{{ name }}</th>{% endfor %}</tr>' +
    //    '{% for row in currentTable5Examples %}<tr>{% for item in {{ row }} %}<td>{{ item }}</td>{% endfor %}</tr>{% endfor %}'
    var newHtml = '<div id="scrollable-table"><table class="table table-striped" id="display-current-table">' + tableColHtml + '</table></div></br>' +
    '<div class="center">Enter Save File Name Below:<br>' +
    '<input type="text" name="saveName" id="save-name-box"/>.csv</br>' + '<button class="btn btn-info" onclick="onQueryClick()">Query</button>' +
    '<button class="btn btn-warning" onclick="onUndoClick()">Undo</button>' + '<button class="btn btn-success" onclick="onSaveClick()">Save</button>' +
    '<button class="btn btn-primary" onclick="onContinueClick()">Continue</button>' + '<br><div id="saving-text"></div></div>';
    $(document.getElementById('main-div')).html(newHtml);
    $("#instruction").html("This is your current table with its first five rows. You can query the table to look for specific information, undo" +
        " the previous join, save your table to our database and your computer, and continue to join this table with others.");
    /*
            var newHtml = '<div id="network"></div><button onclick="onUndoColNameSelectionClick()">Undo Last Column Match</button><button onclick="directToNextPage()">Continue</button><button onclick="directToPreviousPage()">Return to Previous Page</button>';
        $(document.getElementById('main-div')).html(newHtml);
        */
    //replace main-div with view of the table and buttons ("continue" "query" "undo" "save")
    //as well as text box for user to type in the name they want to call the table when saving it (is not saved until they click "save")
    //set up onclicks for continue, query, undo, and save buttons
}



//IN PROGRESS: Joe
//replaces main-div with a the current table's information and button
function getAndDisplayCurrentTable(){
    //call /get_table_info from backend with parameter db_table_name set to currentTableName
    //save the returned values from backend function to currentTableName, currentTableColumns, currentTableIngestDate, currentTable5Examples
    //call displayCurrentTable()

    $.getJSON($SCRIPT_ROOT + '/get_table_info', { db_table_name: currentTableName },
        function(data) {
            currentTableName = data[0][0];
            currentTableColumns = data[0][1];
            currentTableIngestDate = data[0][2];
            currentTable5Examples = data[1];

            displayCurrentTable();
    });
}


//THERE IS AN ONSAVECLICK FUNCTION IN FUNCTIONS_SAVING.JS; USE IT.

function onQueryClick(){
    //remove 5 example entry rows from main-div table display
    //replace with a text box in each column underneath the column name (like a horizontal form)
    //display "do query" button (with onDoQueryClick() function)
    var tableColHtml = "<tr>";
    for (var i = 0; i < currentTableColumns.length; i++) {
        tableColHtml = tableColHtml + "<th>" + currentTableColumns[i] + "</th>";
    }
    tableColHtml = tableColHtml + "</tr>";
    var tableColHtml = tableColHtml + "<tr>";
    for (var i = 0; i < currentTableColumns.length; i++) {
        tableColHtml = tableColHtml + '<th><input type="text" id="' + currentTableColumns[i] + '_input" value=""></th>';
    }
    tableColHtml = tableColHtml + "</tr>";

    var newHtml='<table id="display-current-table">'+ tableColHtml + '</table><br>'+
    '<button class="btn btn-primary" onclick="onDoQueryClick()">Search</button>';
    $(document.getElementById('main-div')).html(newHtml);
    $("#instruction").html("Type one or more values in the text boxes below to query your table for specific matches.");
}

function onDoQueryClick(){
    //make call to /qbe on backend; send parameters: table_name and query_pairs
    //table_name is the db's name for the table (a string)
    //query_pairs is a list of tuples of col_names and query_text [(col_name, query_text), ...]
    //the return value you will get from /qbe is (table_name, [cols], [entry, entry, entry, ...])
    //save these values to currentTableName, currentTableColumns, currentTable5Examples
    //call displayCurrentTable() to dislpay the results (will replace main-div with the table view)
    var query_pairs = [];

    for(var i = 0; i < currentTableColumns.length; i++){
        name = currentTableColumns[i];
        col_input = $(document.getElementById(name+'_input')).val();

        if( col_input != ""){
            query_pairs.push([name, col_input]);
        }
    }

    $.getJSON($SCRIPT_ROOT + '/qbe', {
        table_name: currentTableName,
        query_pairs: JSON.stringify(query_pairs)
    },
    function(data) {
        currentTableName = data[0][0];
        currentTableColumns = data[0][1];
        currentTableIngestDate = data[0][2];
        currentTable5Examples = data[1];

        displayCurrentTable();
        $("#instruction").html("These are your query results.");
    });

}

function resetVariables(){

    dropdownColumn = null;
    dropdownColumnLeft = null;
    dropdownColumnRight = null;
    dropdownColumnSaved = null;

    currentTableName = null;
    currentTableColumns = [];
    currentTableIngestDate = null;
    currentTable5Examples = [];

    //variables for the selected node table (to be joined with the currentTableName's table later)
    selectedTableName = null;
    selectedTableColumns = [];
    selectedTableIngestDate = null;

    //variables for selecting columns to join on (as pairs are built up, tuples are appended to selectedColNameTuples)
    selectedLeftColName = null;
    selectedRightColName = null;
    selectedColNameTuples = [];

    fileSaveName = null;
}

//DONE, but untested: JOE
function onUndoClick(){
    //call backend /undo_join function
    //if return value is an empty tuple:
        //make call to resetVariables()
        //if mode is self_directed:
            //make call to /self_directed
            //this should be an actual non-jQuery call....the goal is to visit the new page fresh, and that function will do that for you
        //if mode is computer_guided:
            //make call to /computer_guided
            //this should be an actual non-jQuery call....the goal is to visit the new page fresh, and that function will do that for you
    //else:
        //save data you receive (for example, save currentTableName, currentTableColNames, and currentTableIngestDate)
        //call displayCurrentTable() which will use the newly updated currentTableName
        $.getJSON($SCRIPT_ROOT + '/undo_join', {},
            function(data) {

                if(data.length == 0){
                    resetVariables();
                    if(mode == "user_driven"){
                        window.location.replace($SCRIPT_ROOT+'/user_directed');
                    }else if(mode == "computer_guided"){
                        window.location.replace($SCRIPT_ROOT+'/computer_guided');
                    }else{
                        throw ("ERROR: current mode is "+mode);
                    }

                }else{

                    currentTableName = data[0][0];
                    currentTableColNames = data[0][1];
                    currentTableIngestDate = data[0][2];
                    currentTable5Examples = data[1];

                    displayCurrentTable();
                }
        });

}

//displays currentTable as central table in a graph with related tables around it
//this work is completely performed b displayTablesAsGraphs
function onContinueClick(){
    $("#saving-text").html("Loading related tables...");
    displayTablesAsGraph([]);
}
