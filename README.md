# WebOps Dashboard

This project is a web application designed to integrate various utilities and functionalities for monitoring and managing web operations, particularly for Pantheon, a web hosting and management platform. The project includes scripts for handling New Relic monitoring, MySQL database interactions, traffic analysis, and Quicksilver workflows.

Project was built by @kyletaylored and unfortunately not documented at that time.

## Features

- **New Relic Integration**: Fetch and display New Relic data.
- **MySQL Utilities**: Add MySQL connection buttons and retrieve values.
- **Traffic Analysis**: Process and display site traffic data.
- **Quicksilver Workflows**: Analyze and display Quicksilver workflow logs.
- **DOM Manipulation**: Utility functions for creating and managing DOM elements.

## Usage

This project is designed to be used with Tampermonkey, a userscript manager. To use the scripts in this project:

1. Open Tampermonkey in your browser.
2. Create a new script.
3. Copy the contents of the desired script from the `src` directory (e.g., `webops-newrelic.js` or `webops-quicksilver.js`) and paste it into the new script.
4. Save the script.

## Development

I don't yet understand how npm was used to work on this project, the current dist folder does not give any valid output