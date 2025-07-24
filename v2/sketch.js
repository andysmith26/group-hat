let scheme;
let lastTouchX, lastTouchY;
let algorithmSelect,
  autoassignBtn,
  adminToolsBtn,
  adminToolsModal,
  closeBtn,
  startOverBtn,
  loadTestDataBtn,
  preferenceToggleBtn;
let rankThresholdSelect;

console.log('sketch.js loaded');

function setup() {
  createCanvas(2000, 750);
  scheme = new Scheme('groups');

  algorithmSelect = select('#algorithmSelect');
  autoassignBtn = select('#autoassignBtn');
  autoassignBtn.mousePressed(performAutoassign);

  // Add Start Over button functionality
  startOverBtn = select('#startOverBtn');
  startOverBtn.mousePressed(startOver);

  loadTestDataBtn = select('#loadTestDataBtn');
  loadTestDataBtn.mousePressed(loadTestData);

  // Add admin tools button functionality
  adminToolsBtn = select('#adminToolsBtn');
  adminToolsModal = select('#adminToolsModal');
  closeBtn = select('.close');

  //   // Add rank threshold dropdown handling
  //   rankThresholdSelect = select('#rankThreshold');
  //   rankThresholdSelect.changed(updateRankThreshold);

  adminToolsBtn.mousePressed(showAdminTools);
  closeBtn.mousePressed(hideAdminTools);

  // Close the modal when clicking outside of it
  window.addEventListener('click', function (event) {
    if (event.target == adminToolsModal.elt) {
      hideAdminTools();
    }
  });
  preferenceToggleBtn = select('#preferenceToggleBtn');
  preferenceToggleBtn.mousePressed(togglePreferenceMode);
}

function draw() {
  background(220);

  scheme.show();

  if (keyIsDown(SHIFT) || mouseIsPressed) {
    scheme.handleHover(mouseX, mouseY);
  } else {
    scheme.clearHover();
  }

  // highlight people who chose the group is space is pressed and nothing else.
  if (keyIsDown(CONTROL) && !(keyIsDown(SHIFT) || mouseIsPressed)) {
    scheme.highlightGroupAndPeople(mouseX, mouseY);
  } else {
    scheme.clearHighlights();
  }

  // showTasks();
}

function loadTestData() {
  loadGroupsFromPath('test-groups.csv');
  loadPeopleFromPath('test-people.csv');
  //   loadConnectionsFromPath('test-connections.csv');
  loadGroupPreferencesFromPath('test-group-preferences.csv');
  console.log('loading test data');
}
function togglePreferenceMode() {
  scheme.useGroupPreferences = !scheme.useGroupPreferences;
  console.log(
    `Using group preferences: ${scheme.useGroupPreferences}`
  );
}

function showTasks() {
  fill(200, 50, 50);
  textSize(20);
  textAlign(LEFT, BOTTOM);
  text('all looks okay');
}

function mousePressed() {
  if (scheme) {
    scheme.handlePress(mouseX, mouseY);
  }
}

function mouseReleased() {
  if (scheme) {
    scheme.handleRelease(mouseX, mouseY);
  }
}

function mouseDragged() {
  if (scheme) {
    scheme.handleMove(mouseX, mouseY);
  }
}

function showAdminTools() {
  adminToolsModal.style('display', 'block');
}

function hideAdminTools() {
  adminToolsModal.style('display', 'none');
}

function updateRankThreshold() {
  let threshold = int(rankThresholdSelect.value());
  scheme.setRankThreshold(threshold);
}

function saveCanvasFiles() {
  saveSchemeAsFile();
  saveCanvasAsJPEG();
}

function saveCanvasAsJPEG() {
  let now = new Date();
  let timestamp = `${now.getFullYear()}-${(now.getMonth() + 1)
    .toString()
    .padStart(2, '0')}-${now
    .getDate()
    .toString()
    .padStart(2, '0')}_${now
    .getHours()
    .toString()
    .padStart(2, '0')}-${now
    .getMinutes()
    .toString()
    .padStart(2, '0')}-${now
    .getSeconds()
    .toString()
    .padStart(2, '0')}`;
  saveCanvas(`canvas_${timestamp}`, 'jpeg');
}

// Function to save the groups as a JSON file
function saveSchemeAsFile() {
  let jsonString = scheme.serialize();
  let blob = new Blob([jsonString], { type: 'application/json' });
  let now = new Date();
  let timestamp = `${now.getFullYear()}-${(now.getMonth() + 1)
    .toString()
    .padStart(2, '0')}-${now
    .getDate()
    .toString()
    .padStart(2, '0')}_${now
    .getHours()
    .toString()
    .padStart(2, '0')}-${now
    .getMinutes()
    .toString()
    .padStart(2, '0')}-${now
    .getSeconds()
    .toString()
    .padStart(2, '0')}`;
  let url = URL.createObjectURL(blob);
  let a = document.createElement('a');
  a.href = url;

  a.download = `scheme_${timestamp}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// Function to handle file input and load the groups from a JSON file
function loadSchemeFromFile(event) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const jsonString = e.target.result;
      scheme = Scheme.deserialize(jsonString);
      resizeCanvasToFitGroups();
      console.log('scheme file successfully read.');
    };
    reader.readAsText(file);
  }
}

function loadPeopleFromPath(filePath) {
  loadStrings(filePath, parsePeopleStrings);
}

function loadGroupsFromPath(filePath) {
  loadStrings(filePath, parseGroupsStrings);
}

function loadConnectionsFromPath(filePath) {
  loadStrings(filePath, parseConnectionsStrings);
}

function loadGroupPreferencesFromPath(filePath) {
  loadStrings(filePath, parseGroupPreferencesStrings);
}

function loadPeopleFromFile(event) {
  let file = event.target.files[0];
  if (file) {
    let reader = new FileReader();
    reader.onload = function (e) {
      let content = e.target.result;
      let lines = content.split('\n');
      console.log('people file successfully read.');
      parsePeopleStrings(lines);
    };
    reader.readAsText(file);
  }
}

function loadGroupsFromFile(event) {
  let file = event.target.files[0];
  if (file) {
    let reader = new FileReader();
    reader.onload = function (e) {
      let content = e.target.result;
      let lines = content.split('\n');
      parseGroupsStrings(lines);
    };
    reader.readAsText(file);
  }
}

function loadConnectionsFromFile(event) {
  let file = event.target.files[0];
  if (file) {
    let reader = new FileReader();
    reader.onload = function (e) {
      let content = e.target.result;
      let lines = content.split('\n');
      parseConnectionsStrings(lines);
    };
    reader.readAsText(file);
  }
}

function parsePeopleStrings(data) {
  let people = [];
  for (let line of data) {
    const parts = line.split(',').map((part) => part.trim());
    let newPerson = new Person(...parts);
    people.push(newPerson);
  }

  // console.log(`${people.length} people added`);
  // people.forEach((p) => console.log(p.toString()));
  scheme.setPeople(people);
  console.log(`${scheme.people.length} people added`);
}

function parseGroupsStrings(data) {
  let groups = [];
  for (let line of data) {
    const parts = line.split(',').map((part) => part.trim());
    let newGroup = new Group(
      parts[0],
      parts[1],
      10 + 100 * groups.length,
      20
    );
    groups.push(newGroup);
  }

  if (!scheme) {
    scheme = new Scheme('bbc24');
  }
  scheme.setGroups(groups);
  console.log(`${scheme.groups.length} groups added`);
  resizeCanvasToFitGroups();
}

function parseConnectionsStrings(data) {
  let connections = [];
  for (let line of data) {
    const parts = line.split(',').map((part) => part.trim());
    connections.push(parts);
  }

  console.log(`${connections.length} connection sets added`);
  connections.forEach((c) => console.log(c));
  scheme.setConnections(connections);
  scheme.assignConnections();
}

function loadGroupPreferencesFromFile(event) {
  let file = event.target.files[0];
  if (file) {
    let reader = new FileReader();
    reader.onload = function (e) {
      let content = e.target.result;
      let lines = content.split('\n');
      parseGroupPreferencesStrings(lines);
    };
    reader.readAsText(file);
  }
}

function parseGroupPreferencesStrings(data) {
  for (let line of data) {
    const parts = line.split(',').map((part) => part.trim());
    if (parts.length >= 2) {
      const personId = parts[0];
      const preferences = parts.slice(1);
      const person = scheme.people.find((p) => p.id === personId);
      if (person) {
        person.setGroupPreferences(preferences);
      }
    }
  }
  console.log('Group preferences loaded and assigned to people');
}

function deepCopy(array) {
  return array.map((item) =>
    Array.isArray(item) ? deepCopy(item) : item
  );
}

function performAutoassign() {
  if (scheme) {
    let algorithm = algorithmSelect.value();
    scheme.autoassign(algorithm);
  }
}

function startOver() {
  if (scheme) {
    // Remove all people from groups
    scheme.groups.forEach((group) => {
      group.members = group.initializeNullMembers(group.maxSize);
    });

    // Reassign random positions to people
    scheme.people.forEach((person) => {
      person.x = round(random(width - 400, width - 70));
      person.y = round(random(50, height - 50));
      person.happiness = 0;
    });

    // Recalculate happiness for all groups
    scheme.groups.forEach((group) => group.recalculateHappiness());
  }
}

function copyGroupLists() {
  let sheetsData = generateGoogleSheetsData();
  console.log('Generated sheets data:', sheetsData);
  copyToClipboard(sheetsData);

  // Tell user that the data has been copied to clipboard
  alert('✅ Group lists copied to clipboard 📋');
}

function generateGoogleSheetsData() {
  // Get all groups and sort them alphabetically
  let sortedGroups = scheme.groups.slice();

  // Create header row with group names
  let sheetsData =
    sortedGroups.map((group) => group.title).join('\t') + '\n';

  // Find the maximum number of members in any group
  let maxMembers = Math.max(
    ...sortedGroups.map(
      (group) => group.members.filter((m) => m !== null).length
    )
  );

  // Create rows for members
  for (let i = 0; i < maxMembers; i++) {
    let row = sortedGroups.map((group) => {
      // Get non-null members and sort them
      let sortedMembers = group.members
        .filter((member) => member !== null)
        .sort(
          (a, b) =>
            a.lastName.localeCompare(b.lastName) ||
            a.firstName.localeCompare(b.firstName)
        );

      // Return the i-th member if it exists, otherwise an empty string
      return sortedMembers[i]
        ? `${sortedMembers[i].lastName}, ${sortedMembers[i].firstName}`
        : '';
    });
    sheetsData += row.join('\t') + '\n';
  }

  return sheetsData;
}

function copyToClipboard(text) {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  document.body.appendChild(textArea);
  textArea.select();
  document.execCommand('copy');
  document.body.removeChild(textArea);
}

function resizeCanvasToFitGroups() {
  if (scheme && scheme.groups.length > 0) {
    let maxX = 0;
    let maxY = 0;

    for (let group of scheme.groups) {
      maxX = Math.max(maxX, group.x + group.w + 100); // Add some padding
      maxY = Math.max(maxY, group.y + group.h + 100); // Add some padding
    }

    // Ensure a minimum width and height
    maxX = Math.max(maxX, 2000);
    maxY = Math.max(maxY, 750);

    resizeCanvas(maxX, maxY);
    console.log(`Canvas resized to ${maxX}x${maxY}`);
  }
}

function keyPressed() {
  // Ctrl/Cmd + Z for undo
  if ((keyIsDown(CONTROL) || keyIsDown(91)) && keyCode === 90) {
    if (keyIsDown(SHIFT)) {
      scheme.redo();
    } else {
      scheme.undo();
    }
    needsRedraw = true;
    return false;
  }

  // Ctrl/Cmd + S for save
  if ((keyIsDown(CONTROL) || keyIsDown(91)) && keyCode === 83) {
    saveCanvasFiles();
    return false;
  }
}
