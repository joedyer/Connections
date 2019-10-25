// Functions and Vars for Setup:

// Where the nodes will be inserted in the HTML document.
var container = null;

//All variables used in making sure nodes are spaced equally around the center node.
var radius = 75;

var nodes = null;
var edges = null;
var data = null;

var options = { // Node, edge, and environment design
  autoResize: false,
  height: '70%',
  width: '100%',
  locale: 'en',
  clickToUse: false,
  edges: {
    hoverWidth: function (width) {return width+1;},
    labelHighlightBold: false,
    physics: false,
    smooth: false,
    width: 2,
    hoverWidth: 0,
    color: '#AAAAAA'
},
nodes: {
    borderWidth: 3,
    borderWidthSelected: 3,
    shape: 'box'
},
groups: {
    center: {color:'#C2FABC', shape:'circle'},
    surrounding: {color:'#97C2FC'},
    paths: {color: '#97C2FC', font: { size: 10 } }
},
interaction: {
    dragNodes: false,
    dragView: true,
    selectConnectedEdges: false,
    zoomView: true,
    hover: true
},
physics: {
    enabled: false
}
};

// variable storing list of columns so it can be referenced when making dropdown lists
var columns = null;

// variable storing list of previously saved tables so it can be referenced in get_saved_tables.html
var savedTables = null;

// variable for selecting starting column in user-exploration mode
var dropdownColumn = null;

// variables for selecting two columns in computer-guided mode
var dropdownColumnLeft = null;
var dropdownColumnRight = null;

// variable for selecting saved table name in get-saved-tables mode
var dropdownColumnSaved = null;

// variables to keep track of which mode user is in
var mode = null; //can be "computer_guided" "user_driven" "ingest" "past_work"; set the value when you visit the home page

//variables for the main/central table (will always be in middle or left)
var currentTableName = null;
var currentTableColumns = [];
var currentTableIngestDate = null;
var currentTable5Examples = [];

//variables for the selected node table (to be joined with the currentTableName's table later)
var selectedTableName = null;
var selectedTableColumns = [];
var selectedTableIngestDate = null;

//variables for selecting columns to join on (as pairs are built up, tuples are appended to selectedColNameTuples)
var selectedLeftColName = null;
var selectedRightColName = null;
var selectedColNameTuples = [];

//variable for storing name of file for table saving
var fileSaveName = null;

//variable for storing the paths created by comuter-guided mode
var communities = [];

//variable for storing paths displayed by computer guided mode
var paths = [];

//this is where our application is located:
$SCRIPT_ROOT = "";//{{ request.script_root|tojson|safe }};

// Functions for General Use:
function addNode(id, group, label, col, x, y) {
	nodes.add({
		id: id,
		columnsMatching: col,
		x: x,
		y: y,
		label: label.replace(/\%20/g, " "),
		value: 20,
		group: group,
		shape: 'circle',
		font: {
			size: 12,
		},
	});
}

// Sets the attributes of the node and add it to the nodes list. Can add more parameters based on what attributes you want to change.
function addColumnNode(id, side, label, x, y) {
	nodes.add({
		id: id,
		label: label.replace(/\%20/g, " "),
		value: 20,
		x: x,
		y: y,
		side: side,
		shape: 'rectangle',
		color: 'white',
		font: {
			size: 12,
		},
	});
}

function addEdge(from, to, color) {
    edges.add({
		id: 'edge'+from+to,
		from: from,
		to: to,
		color: 'black'
    });
}

function removeEdge(id) {
    edges.remove({id: id});
}

function removeNode(id) {
	nodes.remove({id: id});
}

