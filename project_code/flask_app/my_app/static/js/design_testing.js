function testNodes() {

container = document.getElementById('network');


//***columnsMatching is just a stand in for the number of matching columns.  The idea is say node1 has 10 columns
// and nodes 3 has 8 columns that match node 1.  That would yield a ratio of (8/10) matching columns.
nodes = new vis.DataSet([
  {id: 1, group: 'center', label: 'Name\nCity\nPets\nJob',shape: 'circle', columnsMatching: 0.0 , x: 0, y: 0, name:"MyTable"},
  {id: 2, group: 'surrounding', label: 'Name\nCity\nPets\nJob',data:'Name\nCity\nPets\nJob\nUID\nMiddleName', columnsMatching: 1.0, x: 0, y: 0, name:"Table5"},
  {id: 3, group: 'surrounding', label: 'Name\nCity\nPets',data:'Name\nCity\nPets\nCountry\nState\nSchool',  columnsMatching: 0.75, x: 0, y: 0, name:"Table4"},
  {id: 4, group: 'surrounding', label: 'Name\nCity',data:'Name\nCity\nJob\nAge\nCar\nLastName\nSchooling',   columnsMatching: 0.5,  x: 0, y: 0, name:"Table3"},
  {id: 5, group: 'surrounding', label: 'Name\nJob',data:'Name\nJob\ndogName\nAnimal\nReligion\nMoney', columnsMatching: 0.5,  x: 0, y: 0, name:"Table2"},
  {id: 6, group: 'surrounding', label: 'Name',data:'Name', columnsMatching: 0.25,  x: 0, y: 0, name:"Table1"}
]);
edges = new vis.DataSet([
  {from: 1, to: 2},
  {from: 1, to: 3},
  {from: 1, to: 4},
  {from: 1, to: 5},
  {from: 1, to: 6}
]);
data = {
  nodes: nodes,
  edges: edges
};


//blurNode **MUST** be called with hover node.  Blur node event means mouse is no longer on node
network = new vis.Network(container, data, options);
  network.on("hoverNode", function (properties) {
    onHoverNode(properties);
    
});
  network.on("blurNode", function (properties) {
    onHoverNode(properties);

});

displayGraphEvenly();
}