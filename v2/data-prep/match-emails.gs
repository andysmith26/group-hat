function matchEmails() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const peopleSheet = ss.getSheetByName('people'); // Replace with the people tab
  const dataSheet = ss.getSheetByName('responses'); // Replace with name of the responses tab

  const emailMap = createEmailMap(peopleSheet);

  // Log the emailMap for inspection
  logEmailMap(emailMap);

  // Specify the columns to process (0-based index)
  const columnsToProcess = [4, 6, 8, 10]; // Replace with the actual columns you want to process

  const unmatchedNames = processColumns(
    dataSheet,
    emailMap,
    columnsToProcess
  );

  // Log unmatched names for inspection
  logUnmatchedNames(unmatchedNames);

  // Get and log best guesses for unmatched names
  const guesses = getBestGuesses(unmatchedNames, emailMap);
  logBestGuesses(guesses);

  // Handle unmatched names with high confidence matches
  const highConfidenceMatches = getHighConfidenceMatches(
    unmatchedNames,
    emailMap
  );
  applyHighConfidenceMatches(
    dataSheet,
    highConfidenceMatches,
    emailMap
  );

  // Handle unmatched single first names
  handleSingleFirstNames(dataSheet, unmatchedNames, emailMap);

  // Handle unmatched "Firstname LastInitial" names
  handleFirstNameLastInitial(dataSheet, unmatchedNames, emailMap);
}

function createEmailMap(sheet) {
  const data = sheet.getDataRange().getValues();
  const headers = data.shift();
  const firstNameIndex = headers.indexOf('First Name');
  const lastNameIndex = headers.indexOf('Last Name');
  const preferredNameIndex = headers.indexOf('Preferred Name');
  const emailIndex = headers.indexOf('Email');

  return buildEmailMap(
    data,
    firstNameIndex,
    lastNameIndex,
    preferredNameIndex,
    emailIndex
  );
}

function buildEmailMap(
  data,
  firstNameIndex,
  lastNameIndex,
  preferredNameIndex,
  emailIndex
) {
  const emailMap = new Map();

  data.forEach((row) => {
    const firstName = normalize(row[firstNameIndex]);
    const lastName = normalize(row[lastNameIndex]);
    const preferredName = normalize(row[preferredNameIndex]);
    const email = row[emailIndex] ? row[emailIndex] : '';

    const fullName = `${firstName} ${lastName}`;
    if (fullName.trim()) {
      emailMap.set(fullName, email);
    }

    if (preferredName) {
      const fullPreferredName = `${preferredName} ${lastName}`;
      emailMap.set(fullPreferredName, email);
    }
  });
  return emailMap;
}

function normalize(name) {
  return typeof name === 'string' ? name.trim().toLowerCase() : '';
}

function processColumns(sheet, emailMap, columns) {
  const dataRange = sheet.getDataRange();
  const dataValues = dataRange.getValues();
  const unmatchedNames = [];

  columns.forEach((col) => {
    unmatchedNames.push(
      ...setEmailColumn(sheet, dataValues, col, emailMap)
    );
  });

  return unmatchedNames;
}

function setEmailColumn(sheet, dataValues, col, emailMap) {
  const newColIndex = col + 1; // Calculate new column index to insert email column
  const unmatchedNames = [];

  // Loop through each row and find the email
  for (let row = 0; row < dataValues.length; row++) {
    const name = normalize(dataValues[row][col]);
    const email = emailMap.get(name) || ''; // Get the email or an empty string if not found
    sheet.getRange(row + 1, newColIndex + 1).setValue(email);

    if (!email) {
      unmatchedNames.push({ name, row, col });
    }
  }
  console.log(unmatchedNames);
  return unmatchedNames;
}

function logEmailMap(emailMap) {
  const entries = Array.from(emailMap.entries());
  const logEntries = entries
    .map((entry) => `Name: ${entry[0]}, Email: ${entry[1]}`)
    .join('\n');
  Logger.log(logEntries);
}

function getBestGuesses(unmatchedNames, emailMap) {
  const guesses = [];
  const names = Array.from(emailMap.keys());

  unmatchedNames.forEach(({ name, row, col }) => {
    if (name) {
      const bestMatches = names
        .map((existingName) => {
          const distance = levenshteinDistance(name, existingName);
          const confidence =
            1 - distance / Math.max(name.length, existingName.length);
          return { existingName, confidence };
        })
        .sort((a, b) => b.confidence - a.confidence);

      guesses.push({
        name,
        row,
        col,
        bestMatches: bestMatches.slice(0, 5),
      });
    }
  });

  return guesses;
}

function logBestGuesses(guesses) {
  const logEntries = guesses
    .map((entry) => {
      const bestGuesses = entry.bestMatches
        .map(
          (guess) =>
            `Name: ${
              guess.existingName
            }, Confidence: ${guess.confidence.toFixed(2)}`
        )
        .join('; ');
      return `Unmatched Name: ${entry.name}, Best Guesses: ${bestGuesses}`;
    })
    .join('\n');
  Logger.log(logEntries);
}

function levenshteinDistance(a, b) {
  const matrix = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

function getHighConfidenceMatches(unmatchedNames, emailMap) {
  const highConfidenceMatches = [];
  const names = Array.from(emailMap.keys());

  unmatchedNames.forEach(({ name, row, col }) => {
    if (name) {
      const bestMatches = names
        .map((existingName) => {
          const distance = levenshteinDistance(name, existingName);
          const confidence =
            1 - distance / Math.max(name.length, existingName.length);
          return { existingName, confidence };
        })
        .sort((a, b) => b.confidence - a.confidence);

      const bestMatch = bestMatches[0];
      if (bestMatch.confidence > 0.75) {
        highConfidenceMatches.push({
          name,
          existingName: bestMatch.existingName,
          confidence: bestMatch.confidence,
          row,
          col,
        });
      }
    }
  });

  return highConfidenceMatches;
}

function applyHighConfidenceMatches(
  sheet,
  highConfidenceMatches,
  emailMap
) {
  highConfidenceMatches.forEach(({ existingName, row, col }) => {
    const email = emailMap.get(existingName);
    const newColIndex = col + 1;
    sheet.getRange(row + 1, newColIndex + 1).setValue(email);
  });
}

function logUnmatchedNames(unmatchedNames) {
  const logEntries = unmatchedNames.map((entry) =>
    console.log(entry)
  ); //`Unmatched Name: ${entry.name}, Row: ${entry.row + 1}, Column: ${entry.col + 1}`).join('\n');
  Logger.log(logEntries);
}

function handleSingleFirstNames(sheet, unmatchedNames, emailMap) {
  const firstNameMap = new Map();
  emailMap.forEach((email, name) => {
    const [firstName] = name.split(' ');
    if (firstName) {
      if (!firstNameMap.has(firstName)) {
        firstNameMap.set(firstName, []);
      }
      firstNameMap.get(firstName).push(email);
    }
  });

  unmatchedNames.forEach(({ name, row, col }) => {
    if (name && !name.includes(' ')) {
      const possibleEmails = firstNameMap.get(name);
      if (possibleEmails && possibleEmails.length === 1) {
        const newColIndex = col + 1;
        sheet
          .getRange(row + 1, newColIndex + 1)
          .setValue(possibleEmails[0]);
      }
    }
  });
}

function handleFirstNameLastInitial(sheet, unmatchedNames, emailMap) {
  const nameMap = new Map();
  emailMap.forEach((email, name) => {
    const [firstName, lastName] = name.split(' ');
    if (firstName && lastName) {
      const lastInitial = lastName.charAt(0);
      const combinedName = `${firstName} ${lastInitial}`;
      if (!nameMap.has(combinedName)) {
        nameMap.set(combinedName, []);
      }
      nameMap.get(combinedName).push(email);
    }
  });

  unmatchedNames.forEach(({ name, row, col }) => {
    if (name && name.split(' ').length === 2) {
      const [firstName, lastInitial] = name.split(' ');
      if (lastInitial.length === 1) {
        const possibleEmails = nameMap.get(name);
        if (possibleEmails && possibleEmails.length === 1) {
          const newColIndex = col + 1;
          sheet
            .getRange(row + 1, newColIndex + 1)
            .setValue(possibleEmails[0]);
        }
      }
    }
  });
}
