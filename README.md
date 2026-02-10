# Moodle Course Downloader (Chrome Extension)

A lightweight Chrome extension that allows students to download all files from a Moodle course page into a single local folder with one click.

# Features

One-click download of all course files

Automatically detects Moodle file links (pluginfile.php)

Supports indirect resource links (mod/resource/view.php)

Saves everything into a single folder

Uses your existing Moodle login session

No credentials stored or transmitted

# How It Works

Open a Moodle course page.

Click the extension icon.

Click Scan to detect files.

Click Download all files.

All files will be downloaded into a single folder inside your default Chrome download directory.

# Installation (Developer Mode)

Download or clone this repository.

Extract the project folder.

Open Chrome and go to:

chrome://extensions


Enable Developer mode (top right).

Click Load unpacked.

Select the extension folder.

The extension icon should now appear in your Chrome toolbar.

# Usage

Log in to your Moodle platform.

Open the desired course page.

Click the extension icon.

Click Scan.

Click Download.

All detected files will be downloaded automatically.

# Requirements

Google Chrome (Manifest V3 compatible version)

Active Moodle session (logged in)

Folder Structure
moodle-downloader/
│
├── manifest.json
├── background.js
├── content.js
├── popup.html
└── popup.js

# Notes

For smoother operation, disable:

Chrome Settings → Downloads → Ask where to save each file before downloading


The extension relies on your active Moodle login.
If you are logged out, downloads may fail.

# Disclaimer

This tool is intended for personal academic use only.
Users are responsible for complying with their institution’s terms of service and applicable copyright laws.

