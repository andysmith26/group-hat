# matchEmails Script

## Use Case

Advisory requests mostly, where responses include names of other students they'd like to be grouped with. But we don't know exactly who they're referring to unless we can turn the name they wrote into an email address.

## Overview

The `matchEmails` function is designed to match names from one Google Sheets tab with corresponding email addresses from another tab. The script works by creating an email map from the names and emails listed in the first tab and then uses this map to populate corresponding email addresses in the second tab. Additionally, the script attempts to handle and match names that do not have direct matches, using techniques such as best guesses and handling single first names or "Firstname LastInitial" formats.

## Requirements

### Spreadsheet Setup

1. **Sheet1 (People Data)**:

   - This sheet should contain the following columns:
     - `First Name`: The first name of the individual.
     - `Last Name`: The last name of the individual.
     - `Preferred Name`: (Optional) Any preferred name or nickname.
     - `Email`: The email address corresponding to the individual.
   - Ensure that the headers are exactly as listed above.

2. **Sheet2 (Data to Process)**:
   - This sheet should contain columns that include the names of individuals that need to be matched with their email addresses.
   - Specify the columns (0-based index) to process by modifying the `columnsToProcess` array in the script.
   - no headers
   - sort by email column and scan for duplicates.
   - note any legit special requests that are not names
   - delete n/a, lebron james, and other not matching responses
   - **Create blank columns next to each of the columns you want to process to store the matched email addresses.**

### Script Execution

1. Open your Google Sheet.
2. Go to Extensions -> Apps Script.
3. Replace any existing code with `match-emails.gs`.
4. Save and run the script.
5. Allow access.

### Postprocessing

1. copy/paste email for unmatched names
2. create 'export names' list (no header, cols= email, last, first-or-pref)
3. create 'export connections' list (no header, cols = email of respondent, 0+ emails of requests)
4. for both of those export lists: file > download > csv

## Functions

### matchEmails

Main function that orchestrates the email matching process:

1. Reads data from `Sheet1` and `Sheet2`.
2. Creates an email map from `Sheet1`.
3. Processes specified columns in `Sheet2` to match names to emails.
4. Logs unmatched names and attempts to provide best guesses.
5. Applies high confidence matches and handles unmatched single first names or "Firstname LastInitial" names.

### createEmailMap(sheet)

Creates a map of names to emails from the provided sheet.

### buildEmailMap(data, firstNameIndex, lastNameIndex, preferredNameIndex, emailIndex)

Builds the email map from the data, normalizing names for consistent matching.

### normalize(name)

Normalizes names by trimming whitespace and converting to lowercase.

### processColumns(sheet, emailMap, columns)

Processes the specified columns in the sheet, attempting to match names to emails using the email map.

### setEmailColumn(sheet, dataValues, col, emailMap)

Sets the email column in the sheet based on the name to email matches found in the email map. The matched email addresses are placed in a new column next to the specified column.

### logEmailMap(emailMap)

Logs the email map for inspection.

### getBestGuesses(unmatchedNames, emailMap)

Generates best guess matches for unmatched names using a Levenshtein distance algorithm.

### logBestGuesses(guesses)

Logs the best guess matches for inspection.

### levenshteinDistance(a, b)

Calculates the Levenshtein distance between two strings.

### getHighConfidenceMatches(unmatchedNames, emailMap)

Identifies high confidence matches for unmatched names.

### applyHighConfidenceMatches(sheet, highConfidenceMatches, emailMap)

Applies high confidence matches to the sheet.

### logUnmatchedNames(unmatchedNames)

Logs unmatched names for inspection.

### handleSingleFirstNames(sheet, unmatchedNames, emailMap)

Attempts to match single first names using the email map.

### handleFirstNameLastInitial(sheet, unmatchedNames, emailMap)

Attempts to match names in the "Firstname LastInitial" format using the email map.

## Notes

- Ensure that the spreadsheet tabs and columns are correctly named and indexed as specified.
- Modify the `columnsToProcess` array to match the columns you need to process in `Sheet2`.
- Create blank columns next to each of the columns you want to process. The script will populate these blank columns with the matched email addresses.
- The script includes logging functions for debugging and inspection purposes.

By following these instructions and ensuring the spreadsheet is set up correctly, this script will help automate the process of matching names to email addresses in Google Sheets.
