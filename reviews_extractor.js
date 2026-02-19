// ==UserScript==  
// @name         QNT 105 Reviews Extractor  
// @namespace    http://tampermonkey.net/  
// @version      1.0  
// @description  Extract reviews to Google Sheets  
// @author       Erick Nyoro  
// @match        https://learn.elmwoodinstitute.org/projects/*/reviews_to_do  
// @grant        GM_xmlhttpRequest  
// @connect      script.google.com  
// @connect script.googleusercontent.com  
// @connect *.googleusercontent.com  
// ==/UserScript==  
(function() {  // Begins an immediately invoked function expression (IIFE) to create a private scope and prevent pollution of the global namespace
    'use strict';  // Enables strict mode, which helps catch common errors and enforces stricter parsing and error handling

    // Replace with deployed Google Apps Script web app URL
    const GOOGLE_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzsp55qYNVaAo7IfpAnAC2TCy36SN5FxTFGyfSnm-3SoZ5lNIL_iFWs2XAViGL7_6LW/exec';  // Defines a constant holding the URL of a deployed Google Apps Script web app that will handle data submission

    // Function to get stored seen IDs from localStorage
    function getSeenIDs() {  // Defines a function to retrieve previously seen review IDs from the browser's localStorage
        const stored = localStorage.getItem('seenReviewIDs');  // Retrieves the value associated with the key 'seenReviewIDs' from localStorage
        return stored ? JSON.parse(stored) : [];  // If a value exists, parses it from JSON string to an array; otherwise, returns an empty array
    }

    // Function to save seen IDs to localStorage
    function saveSeenIDs(ids) {  // Defines a function to save an array of seen review IDs to localStorage
        localStorage.setItem('seenReviewIDs', JSON.stringify(ids));  // Converts the array to a JSON string and stores it under the key 'seenReviewIDs'
    }

    // Function to parse the page and extract data
    function extractReviews() {  // Defines a function to scan the webpage and extract review data into an array of objects
        const reviews = [];  // Initializes an empty array to store the extracted review objects
        const cards = document.querySelectorAll('.card');  // Selects all HTML elements with the class 'card' which likely contain review information

        cards.forEach(card => {  // Loops through each selected card element
            const header = card.querySelector('h5.card-header');  // Finds the h5 element with class 'card-header' inside the current card
            if (!header) return;  // If no header is found, skips to the next card

            const reviewTypeMatch = header.textContent.trim().match(/^(\d+(?:st|nd|rd|th) review)/);  // Uses a regex to match and extract the review type (e.g., "1st review") from the header text
            if (!reviewTypeMatch) return;  // If no match is found, skips to the next card
            const reviewType = reviewTypeMatch[1];  // Stores the captured review type from the regex match

            const table = card.querySelector('table');  // Finds the table element inside the current card
            if (!table) return;  // If no table is found, skips to the next card

            const rows = table.querySelectorAll('tbody tr');  // Selects all table rows within the tbody of the table
            rows.forEach(row => {  // Loops through each row in the table
                const cells = row.querySelectorAll('td');  // Selects all cells (td elements) in the current row

                if (cells.length < 5) return;  // If the row has fewer than 5 cells, skips to the next row (assuming incomplete data)

                const idCell = cells[0].querySelector('code');  // Finds a 'code' element in the first cell, which likely contains the review ID
                const id = idCell ? idCell.textContent.trim() : null;  // Extracts and trims the ID text if found, otherwise sets to null

                const learnerCell = cells[2];  // Selects the third cell (index 2) which contains learner information
                const nameLink = learnerCell.querySelector('a');  // Finds an anchor (a) element in the learner cell for the name
                const name = nameLink ? nameLink.textContent.trim() : '';  // Extracts and trims the name if found, otherwise empty string
                const emailEm = learnerCell.querySelector('em');  // Finds an 'em' element in the learner cell for the email
                const email = emailEm ? emailEm.textContent.trim().replace(/[\(\)]/g, '') : '';  // Extracts, trims, and removes parentheses from the email if found, otherwise empty string

                const score = cells[3].textContent.trim();  // Extracts and trims the score from the fourth cell (index 3)

                const actions = cells[4];  // Selects the fifth cell (index 4) which contains action buttons
                const reviewButton = Array.from(actions.querySelectorAll('a.btn')).find(a => a.textContent.includes('review'));  // Finds the first anchor with class 'btn' whose text includes 'review'
                const link = reviewButton ? reviewButton.href : '';  // Extracts the href (URL) of the review button if found, otherwise empty string

                if (id && name && email && score && link) {  // Checks if all required fields (id, name, email, score, link) are present
                    reviews.push({ id, reviewType, name, email, score, link });  // If all data is available, creates an object and adds it to the reviews array
                }
            });
        });

        return reviews;  // Returns the array of extracted review objects
    }

    // Function to send new data to Google Sheets
    function sendToGoogleSheets(newReviews) {  // Defines a function to send an array of new reviews to a Google Sheets via the Apps Script URL
        if (newReviews.length === 0) {  // Checks if the newReviews array is empty
            alert('No new reviews to add.');  // Displays an alert if there are no new reviews
            return;  // Exits the function early
        }

        const data = newReviews.map(r => [r.reviewType, r.name, r.email, r.score, r.link]);  // Transforms the newReviews array into a 2D array format suitable for Google Sheets (each inner array is a row)

        GM_xmlhttpRequest({  // Initiates a cross-origin HTTP request using the Greasemonkey API
            method: 'POST',  // Sets the request method to POST
            url: GOOGLE_APPS_SCRIPT_URL,  // Sets the target URL to the Google Apps Script endpoint
            data: JSON.stringify({ data: data }),  // Converts the data to a JSON string and wraps it in an object with key 'data'
            headers: {  // Defines the request headers
                'Content-Type': 'application/json'  // Specifies that the content being sent is JSON
            },
            onload: function(response) {  // Callback function for when the request loads successfully
                if (response.status === 200) {  // Checks if the HTTP status is 200 (OK)
                    alert('Successfully added ' + newReviews.length + ' new reviews to Google Sheets.');  // Displays a success alert with the count of added reviews
                    // Update seen IDs
                    const seenIDs = getSeenIDs();  // Retrieves the current list of seen IDs
                    newReviews.forEach(r => seenIDs.push(r.id));  // Appends the IDs of the new reviews to the seenIDs array
                    saveSeenIDs(seenIDs);  // Saves the updated seenIDs back to localStorage
                } else {  // Handles cases where the status is not 200
                    alert('Error sending data to Google Sheets: ' + response.statusText);  // Displays an error alert with the status text
                }
            },
            onerror: function(error) {  // Callback function for when an error occurs during the request
                alert('Error: ' + error);  // Displays a generic error alert with the error details
            }
        });
    }

    // Add button to the page
    function addExportButton() {  // Defines a function to dynamically add a button to the webpage for exporting reviews
        const container = document.querySelector('.my-3') || document.body;  // Selects a container element with class 'my-3' or falls back to the document body
        const button = document.createElement('button');  // Creates a new HTML button element
        button.textContent = 'Export New Reviews to Google Sheets';  // Sets the text displayed on the button
        button.className = 'btn btn-primary ms-3';  // Applies Bootstrap-like classes for styling the button
        button.onclick = function() {  // Attaches a click event handler to the button
            const allReviews = extractReviews();  // Calls the extractReviews function to get all current reviews from the page
            const seenIDs = getSeenIDs();  // Retrieves the list of previously seen review IDs
            const newReviews = allReviews.filter(r => !seenIDs.includes(r.id));  // Filters the reviews to include only those not previously seen
            sendToGoogleSheets(newReviews);  // Calls the function to send the new reviews to Google Sheets
        };
        container.appendChild(button);  // Appends the button to the selected container element
    }

    // Run on page load
    addExportButton();  // Calls the addExportButton function immediately to add the button when the script loads
})();  // Closes and immediately invokes the IIFE