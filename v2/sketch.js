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

console.log('Enhanced sketch.js loaded');

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

  // Show pinned assignment info in hover
  if (scheme.currentHover && scheme.currentHover.pinned) {
    showPinnedInfo(scheme.currentHover);
  }
}

function showPinnedInfo(person) {
  fill(255, 0, 255, 200);
  stroke(0);
  strokeWeight(1);

  const infoWidth = 200;
  const infoHeight = 40;
  const infoX = mouseX + 20;
  const infoY = mouseY - 50;

  rect(infoX, infoY, infoWidth, infoHeight);

  fill(0);
  noStroke();
  textAlign(LEFT, CENTER);
  textSize(12);
  text(
    `📌 PINNED to ${person.pinnedGroupTitle}`,
    infoX + 5,
    infoY + infoHeight / 2
  );
}

function loadTestData() {
  loadGroupsFromPath('test-groups.csv');
  loadPeopleFromPath('test-people.csv');
  loadGroupPreferencesFromPath('test-group-preferences.csv');
  console.log('loading test data');
}

function togglePreferenceMode() {
  scheme.useGroupPreferences = !scheme.useGroupPreferences;
  console.log(
    `Using group preferences: ${scheme.useGroupPreferences}`
  );
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
  // Update UI elements when modal opens
  if (typeof updateGroupSelect === 'function') {
    updateGroupSelect();
  }
  if (typeof updatePinnedList === 'function') {
    updatePinnedList();
  }
  // refresh imbalance slider display
  const imbalanceSlider = document.getElementById('imbalanceSlider');
  const imbalanceValue = document.getElementById('imbalanceValue');
  if (imbalanceSlider && imbalanceValue && scheme) {
    imbalanceSlider.value = scheme.maxAllowedImbalance || 0;
    imbalanceValue.textContent = imbalanceSlider.value;
  }
}

function hideAdminTools() {
  adminToolsModal.style('display', 'none');
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
      try {
        const jsonString = e.target.result;

        // Parse the JSON to check version compatibility
        const jsonObj = JSON.parse(jsonString);

        // Check if this is a scheme file with the expected structure
        if (!jsonObj.version || !jsonObj.people || !jsonObj.groups) {
          alert(
            'Invalid scheme file format. Please select a valid scheme file.'
          );
          return;
        }

        // Deserialize the scheme
        scheme = Scheme.deserialize(jsonString);

        // Clean up any invalid pinned assignments
        if (
          typeof scheme.cleanupInvalidPinnedAssignments === 'function'
        ) {
          const cleanedCount =
            scheme.cleanupInvalidPinnedAssignments();
          if (cleanedCount > 0) {
            alert(
              `Note: ${cleanedCount} invalid pinned assignment(s) were removed during loading.`
            );
          }
        }

        // Resize canvas to fit groups
        resizeCanvasToFitGroups();

        console.log('Scheme file successfully loaded.');
        console.log(
          `Loaded ${scheme.people.length} people and ${scheme.groups.length} groups`
        );
        console.log(
          `${scheme.getPinnedPeople().length} people are pinned`
        );

        // Update UI if functions exist
        if (typeof updateGroupSelect === 'function') {
          updateGroupSelect();
        }
        if (typeof updatePinnedList === 'function') {
          updatePinnedList();
        }

        // Show summary of loaded data
        const unassignedCount = scheme.getUnassignedCount();
        const pinnedCount = scheme.getPinnedPeople().length;
        const unhappyCount = scheme.getUnhappyCount();

        console.log(
          `Summary: ${unassignedCount} unassigned, ${pinnedCount} pinned, ${unhappyCount} unhappy`
        );
      } catch (error) {
        console.error('Error loading scheme file:', error);
        alert(
          'Error loading scheme file: ' +
            error.message +
            '\n\nPlease check the file and try again.'
        );
      }
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
  let errors = [];

  for (let i = 0; i < data.length; i++) {
    const line = data[i];
    if (!line || line.trim() === '') continue;

    const parts = line.split(',').map((part) => part.trim());

    if (parts.length < 3) {
      errors.push(
        `Line ${
          i + 1
        }: Expected at least 3 fields (id, lastName, firstName), got ${
          parts.length
        }`
      );
      continue;
    }

    try {
      let newPerson = new Person(...parts);
      people.push(newPerson);
    } catch (e) {
      errors.push(`Line ${i + 1}: ${e.message}`);
    }
  }

  if (errors.length > 0) {
    alert(
      'CSV parsing errors:\n' +
        errors.slice(0, 5).join('\n') +
        (errors.length > 5
          ? `\n... and ${errors.length - 5} more errors`
          : '')
    );
  }

  scheme.setPeople(people);
  console.log(`${scheme.people.length} people added successfully`);

  // Update UI
  if (typeof updateGroupSelect === 'function') {
    updateGroupSelect();
  }
}

function parseGroupsStrings(data) {
  let groups = [];
  for (let line of data) {
    // Skip empty lines or lines with only whitespace
    if (!line || line.trim() === '') continue;

    const parts = line.split(',').map((part) => part.trim());

    // Validate that we have both required fields
    if (parts.length < 2 || !parts[0] || !parts[1]) {
      console.warn(`Skipping invalid group line: "${line}"`);
      continue;
    }

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

  // Update the group dropdown after groups are loaded
  if (typeof updateGroupSelect === 'function') {
    updateGroupSelect();
  }
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

function performAutoassign() {
  if (scheme) {
    let algorithm = algorithmSelect.value();

    // Show pinned assignment info before starting
    const pinnedCount = scheme.getPinnedPeople().length;
    if (pinnedCount > 0) {
      console.log(
        `Starting autoassignment with ${pinnedCount} pinned assignments`
      );
    }

    scheme.autoassign(algorithm);

    // Update UI after assignment
    if (typeof updatePinnedList === 'function') {
      updatePinnedList();
    }
    if (typeof updateImbalanceDisplay === 'function')
      updateImbalanceDisplay();
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

    // Immediately reassign pinned people to their groups
    scheme.assignPinnedPeople();

    // Recalculate happiness for all groups
    scheme.groups.forEach((group) => group.recalculateHappiness());

    // Update UI
    if (typeof updatePinnedList === 'function') {
      updatePinnedList();
    }
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
      let memberText = sortedMembers[i]
        ? `${sortedMembers[i].lastName}, ${sortedMembers[i].firstName}`
        : '';

      // Add pin indicator for pinned members
      if (sortedMembers[i] && sortedMembers[i].pinned) {
        memberText += ' 📌';
      }

      return memberText;
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
    return false;
  }

  // Ctrl/Cmd + S for save
  if ((keyIsDown(CONTROL) || keyIsDown(91)) && keyCode === 83) {
    saveCanvasFiles();
    return false;
  }

  // Ctrl/Cmd + P for quick pin (when hovering over a person)
  if ((keyIsDown(CONTROL) || keyIsDown(91)) && keyCode === 80) {
    if (scheme.currentHover) {
      const personId = scheme.currentHover.id;
      const availableGroups = scheme.groups
        .map((g) => g.title)
        .join(', ');
      const groupTitle = prompt(
        `Pin ${scheme.currentHover.displayName} to which group?\n\nAvailable groups: ${availableGroups}`
      );

      if (
        groupTitle &&
        scheme.pinPersonToGroup(personId, groupTitle)
      ) {
        scheme.movePinnedPersonToGroup(personId);
        if (typeof updatePinnedList === 'function') {
          updatePinnedList();
        }
        console.log(
          `✅ ${scheme.currentHover.displayName} pinned to ${groupTitle}`
        );
      } else if (groupTitle) {
        alert(
          `❌ Failed to pin. Check that "${groupTitle}" is a valid group name.`
        );
      }
    } else {
      alert(
        'Hover over a person first, then press Ctrl+P to pin them to a group'
      );
    }
    return false;
  }

  // Ctrl/Cmd + U for quick unpin (when hovering over a pinned person)
  if ((keyIsDown(CONTROL) || keyIsDown(91)) && keyCode === 85) {
    if (scheme.currentHover && scheme.currentHover.pinned) {
      const personId = scheme.currentHover.id;
      if (
        confirm(
          `Unpin ${scheme.currentHover.displayName} from ${scheme.currentHover.pinnedGroupTitle}?`
        )
      ) {
        if (scheme.unpinPerson(personId)) {
          if (typeof updatePinnedList === 'function') {
            updatePinnedList();
          }
          console.log(
            `✅ ${scheme.currentHover.displayName} unpinned`
          );
        }
      }
    } else if (scheme.currentHover) {
      alert(
        `${scheme.currentHover.displayName} is not pinned to any group`
      );
    } else {
      alert(
        'Hover over a pinned person first, then press Ctrl+U to unpin them'
      );
    }
    return false;
  }
}

function showLoadingIndicator(message) {
  // Add a div to show loading status
  const indicator = createDiv(message);
  indicator.position(width / 2 - 100, height / 2);
  indicator.style('background-color', 'white');
  indicator.style('padding', '20px');
  indicator.style('border', '2px solid black');
  indicator.style('z-index', '1000');
  indicator.id('loading-indicator');
  return indicator;
}

function hideLoadingIndicator() {
  const indicator = select('#loading-indicator');
  if (indicator) indicator.remove();
}
