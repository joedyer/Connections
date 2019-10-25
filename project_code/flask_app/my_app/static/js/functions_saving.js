// Functions specific to the "saving" task
// Vars in the function_main file are accessible in this file

function onSaveClick(){
    //call backend /save_table function with parameters called db_table_name and user_chosen_table_name
    //you can get db_table_name value from currentTableName
    //you can get user_chosen_table_name value from the text box where the user typed in the desired name (see displayCurrentTable to see when text box was initially described)
    //add link to bottom of main_div with url for dowload (which is returned to you by the function you just called)....
    //or make the user automatically download the csv located at this link (even better)
    fileSaveName = $("#save-name-box").val();

    if (fileSaveName == null || fileSaveName == "") {
        $("#saving-text").html("Please enter a file name to save.");
    } else if (fileSaveName.indexOf(".") !== -1) {
        $("#saving-text").html("Your text should not contain an extension. For example: typing 'MyName' will save your file as MyName.csv.");
    } else if (! /^[a-zA-Z0-9]+$/.test(fileSaveName)) {
        $("#saving-text").html("Your file name contains one or more invalid characters.");
    } else {
        $.getJSON($SCRIPT_ROOT + '/save_table', {
           //passing db_table_name adn user_chosen_table_name as contents of a data object
           //I believe the line below will work, pls check
           db_table_name: currentTableName,
           user_chosen_table_name: fileSaveName
        },
           function(data) {
                //adds button to main-div with a link to the CSV which, when pressed, will download the file
                var returnString = ('<form action="/download" method="post" enctype="multipart/form-data"><input type="hidden" name="data_file" value='
                +document.getElementById("save-name-box").value
                +'/><input class="btn btn-primary" type="submit" value="Download"/></form>');
                $("#saving-text").html(returnString);
        });
        $("#saving-text").html("Your download button will appear here shortly...");
    }
}

//call this function to get the dropwdown menu information and also to reset (always reset when starting over or starting fresh)
//returns complete list of column names (can be used to make dropdown list)
function resetAndGetInfoForDropDown2(){
    resetVariables();
    $.getJSON($SCRIPT_ROOT + '/get_saved_tables', {},
        function(data) {
            if(data){
                savedTables = data;
                if (savedTables.length == 0) {
                    $("#main-div").html("<div class='center'><div id='no-tables-text'>You have no saved tables.</div></div>");
                } else {
                    var newHtml = "";
                    for (var i = 0; i < savedTables.length; i++) {
                        newHtml = newHtml + '<li><a href="#" onclick="onClickDropdown(this)">' + savedTables[i][0] + '</a></li>';
                    }
                    $("#dropdown-ul-saved").html(newHtml);
                }
            } else {
            }
        });
    //make call to backend function /get_all_cols, which takes no parameters and returns a list of column names
    //return list of column names
}


//TODO
//retrives the database's tablename corresponding to the user's tablename that the user chose from the drop down
//gets the info about the tablename from the backend
//displays the table, replacing main-div
function getAndDisplaySavedTableInfo(){
    if (dropdownColumnSaved == null) {
        $("#loading-text").html("No dropdown table name was selected. Please select a table name.");
    } else {
        $("#loading-text").html("Loading saved table...");
        for (var i = 0; i < savedTables.length; i++) {
            if (savedTables[i][0] == dropdownColumnSaved) {
                currentTableName = savedTables[i][1];
            }
        }
        //currentTableName = dropdownColumnSaved;
        getAndDisplayCurrentTable();
    }
    //null check (if they didn't click on drop down)
    //get the db_table_name of the table the user chose
    //save to front end's currentTableName variable
    //call frontend getAndDisplayCurrentTable()
}