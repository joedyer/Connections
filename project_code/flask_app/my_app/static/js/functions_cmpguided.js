// Functions specific to the "computer-guided" task
// Vars in the function_main file are accessible in this file



//USE resetAndGetInfoForDropDown() FUNCTION FROM functions_exploration.js TO GENERATE TWO DROPDOWN MENUS
//IT RETURNS A LIST OF ALL OF THE COLUMNS


//called when "find paths" button is clicked
//retrieves paths from backend based on dropdown selections by users
//displays 5 path options in "maindiv" for user to choose from with radio button
function getAndShowPaths(){
    if (dropdownColumnLeft == null || dropdownColumnRight == null) {
        $("#loading-text").html("A dropdown column name wasn't selected for at least one dropdown menu. Please select two column names.");
    } else if (dropdownColumnLeft == dropdownColumnRight) {
        $("#loading-text").html("You must select two different column names.");
    } else {
    //get value of left and right column dropdown menus (DO A NULL CHECK HERE!!!)
    //make jQuery call to backend function /find_paths with parameters start_col and end_col
    //backend function returns list of (up to 5) tuples of list of table tups and list of joining cols; looks like this:
    // [([(table, [cols], ingest_date),...],[joining_col,...]),...]
    //replace maindiv with visual of the (up to 5) paths
    //each path should have a radio button in front of it
    //there should be a "join" button at the bottom
    $.getJSON($SCRIPT_ROOT + '/find_paths', {
        start_col: dropdownColumnLeft,
        end_col: dropdownColumnRight
    },
    function(data) {

        paths = data;
            // REPLACE MAIN-DIV WITH VISUALS
            // BRIAN MADE AN HTML FILE WITH WHAT THIS SHOULD LOOK LIKE SO LOOK IN THE TEMPLATES FOLDER
            // COLUMN_MATCHING.HTML
           // resultString = ""

           // for(path in data.results){
           //  for()
           // }

           nodes = new vis.DataSet([]);
           edges = new vis.DataSet([]);

           var TABLENAMEINDEX = 0;
           var COLUMNLISTIDX = 1;
           var INGESTDATEIDX = 2;

           var index = 1;

           for(var path_idx=0; path_idx< data.length; path_idx++){
            var path = data[path_idx];

            var tableList = path[0];
            var edgeList = path[1];


            for(var i=0; i < edgeList.length; i++){
                nodes.add({id: index, group: 'paths', label:tableList[i][TABLENAMEINDEX] , data: (tableList[i][TABLENAMEINDEX]+'\n\n'+listOfColsToString(tableList[i][COLUMNLISTIDX])
                    +"\n\nIngest date: "+tableList[i][INGESTDATEIDX]), level: path_idx });
                edges.add({from: index, to:(index+1), label: edgeList[i]});  
                index++;     
            }
            var ENDOFARR = tableList.length-1;
            nodes.add({id: index, group: 'paths', label:tableList[ENDOFARR][TABLENAMEINDEX] , data: (tableList[i][TABLENAMEINDEX]+'\n\n'+listOfColsToString(tableList[ENDOFARR][COLUMNLISTIDX])
                +"\n\nIngest date: "+tableList[ENDOFARR][INGESTDATEIDX]), level: path_idx });
            index++;
        }

        $(document.getElementById('main-div')).html('<div class="center"><button class="btn btn-primary" onclick="fitGraph()" id="fit-button">Center Graph</button><button onclick="onUndoClick()" class="btn btn-info" id="goback-button">Return</button></div><br><div id="network"></div>');
        $("#instruction").html("Here are your connection results. Hover over each table node to view more information, or double click on a node " +
            "in a row to join that row into a single table.");
        container = document.getElementById('network');
        data = { nodes: nodes, edges: edges };
        network = new vis.Network(container, data, options);

            //functions

            network.on("doubleClick", function (properties) {
                onJoinClick(properties);
            });  

            network.on("hoverNode", function (properties) {
                onHoverNodeCGL(properties);   
            });
            network.on("blurNode", function (properties) {
                onHoverNodeCGL(properties);
            });          

            displayLevelHierarchy();
        });
    }
}


//make this the onclick for the "join" button mentioned in getAndShowPaths()
//calls backend function to join the sequence of tables whose radio button was selected when "join" was clicked
//displays the resulting table and 5 example entries in main-div (replaces main-div with the the result)
function onJoinClick(properties){
    //get the path that corresponds with the radio button the user selected
    //do ajax query to backend function called /join_path, sending "path" as parameter
    //"path" is a tuple of list-of-table-tups and list-of-joining-cols, looks like this:
    //([(table, [cols], ingest_date), ...], [joining_col, ...])
    //the return value from /join_path is a table-tuple, which looks like this:
    //((table, [col_names], ingest_date), [entry, entry, entry, entry, entry])
    //save these results to currentTableName, currentTableColumns, currentTableIngestDate, and currentTable5Examples
    //call displayCurrentTable(), which will use the above variable names to display the table and examples, replacing main-div with them

    var pathJS = JSON.stringify(paths[nodes.get(properties.nodes[0]).level]);
    $.getJSON($SCRIPT_ROOT + '/join_path', {
        path: pathJS
    }, 
    function(data) {
        currentTableName = data[0][0];
        currentTableColumns = data[0][1];
        currentTableIngestDate = data[0][2];
        currentTable5Examples = data[1];

        displayCurrentTable();
    });
}