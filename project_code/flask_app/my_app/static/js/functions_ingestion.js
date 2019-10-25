// Functions specific to the "ingestion" task
// Vars in the function_main file are accessible in this file

// TODO: figure out how exactly we are making calls between the database and the front end
// this will be CRUCIAL to our functions, especially some of these functions below


function checkFileName(){
    if ($("#file-form").value == "") {
        $("#loading-text").html("Please select a file to upload.");
    } else {
        $.getJSON($SCRIPT_ROOT + '/upload', {}, 
        function(data) {
            var resultString;
            if(data) {
                $("#loading-text").html("Upload successful.");
                $("#instruction").html("Click on Add Uploaded Files to Database to move the files to our database.");
            } else {
                $("#loading-text").html("Upload was not successful.");
            }
        });
    }
}

//onclick function for ingest button
//makes asynchronous call to backend to ingest function
//displays message indicating success/failure to user
function onClickIngest(){
    //make a call to the backend /ingest function
    //if that function returns True, then it succeeded; False means it failed
    //replace maindiv with a message that indicates success or failure to ingest

    //untested, pls to test
    $.getJSON($SCRIPT_ROOT + '/ingest', {}, 
    	function(data) {
            var resultString;
    		if(data) {
    			resultString = "<p>Ingestion was successful.</p>";
                $("#instruction").html("Your tables have been successfully added. Now you may perform connections on your tables by clicking on Exploration, or " +
                    "Computer-Guided Learning.");
    		} else {
    			resultString = "<p>Ingestion was not successful.</p>";
    		}
            $("#loading-text").html(resultString);
            $("#file_entries").html("<li><em>No new uploaded files here so far</em></li>");
        });
    $(document.getElementById('loading-text')).html('Ingestion in progress...');
}
