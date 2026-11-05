# Local Media Server 

A lightweight Node.js and Express media server utilizing FFmpeg for byte-range video streaming and integrating with the TMDb API to fetch movie metadata and details.

## &#x20;Features

* **Byte-Range Streaming:** Smooth video scrubbing and playback support for large media files using FFmpeg.
* **TMDb Integration:** Automatically fetches movie details, descriptions, and metadata.
* **Secure Configuration:** Uses environment variables to keep sensitive API credentials private.
* **Network Accessibility:** Stream media from your server to any device on your local Wi-Fi or Ethernet network.

## &#x20;Project Structure

```text
local-media-server/
├── media/              # Directory for your local video files (ignored by git, keep .gitkeep)
├── .env.example        # Template for environment variables
├── .gitignore          # Files and folders ignored by Git
├── package.json        # Project dependencies and scripts
└── scraper.js          # Server logic and TMDb/FFmpeg integration
```

## &#x20;Prerequisites

Before running this project, ensure you have the following installed on your machine:

* **Node.js** (v16 or higher recommended)
* **FFmpeg** (added to your system's environment PATH)

## &#x20;Installation \& Setup

1. **Clone the repository:**

```bash
   git clone https://github.com/Harry99951/local-media-server.git
   cd local-media-server
   ```

2. **Install dependencies:**

```bash
   npm install
   ```

3. **Configure your environment variables:**

   * Copy the template file to create your actual configuration file:

     * On Windows (`cmd`): `copy .env.example .env`
     * On Mac/Linux: `cp .env.example .env`
   * Open the newly created `.env` file in your code editor and add your personal credentials.

## &#x20;How to Update Your API Keys

This project utilizes [The Movie Database (TMDb) API](https://www.themoviedb.org/) to fetch media information. To keep your keys secure, they are handled via environment variables and **never** hardcoded into the source code.

1. **Get an API Key:**

   * Create a free account on [The Movie Database (TMDb)](https://www.themoviedb.org/).
   * Navigate to your **Account Settings > API** to generate your API Key (`v3 auth`).
2. **Update your local `.env` file:**

   * Open your local `.env` file in VS Code.
   * Update the `TMDB\_API\_KEY` line with your new key:

```env
     PORT=3000
     TMDB\_API\_KEY=your\_actual\_tmdb\_api\_key\_here
     ```

   * Save the file. Because `.env` is listed in your `.gitignore`, your key will remain completely private.

## &#x20;How to Launch the Server \& Find Your Local IP

To access your media server from your computer or other devices on your home network, you will need your machine's local IP address (typically starting with `192.168.x.x`).

### Step 1: Find your local IP address (`192.168.x.x`)

1. Open your terminal or command prompt (`cmd`).
2. Run the network configuration command:

   * **On Windows (`cmd`):** `ipconfig`
   * **On Mac/Linux:** `ifconfig` or `ip a`
3. Look for your active network adapter (such as **Wireless LAN adapter Wi-Fi** or **Ethernet adapter**).
4. Find the **IPv4 Address**, which will look something like `192.168.1.15` or `192.168.0.25`. Copy this number.

### Step 2: Add your media

* Place your local video files (e.g., `.mp4`, `.mkv`) inside the `media/` folder.

### Step 3: Start the server

Run your startup command in the project root:

```bash
node scraper.js
```

*(Or use `npm start` / `npm run dev` if configured in your `package.json`).*

### Step 4: Navigate and access the server

Open your web browser and navigate to one of the following addresses:

* **From the same computer (Localhost):**

```text
  http://localhost:3000
  ```

* **From any other device on your local network (Phone, Tablet, Smart TV):**
Replace `192.168.x.x` with the IP address you found in Step 1:

```text
  http://192.168.x.x:3000
  ```

## &#x20;Security Best Practices

* **Never commit your `.env` file:** Ensure `.env` is always included in your `.gitignore` file.
* **Revoke compromised keys:** If an API key is ever accidentally pushed to GitHub, immediately revoke it via the TMDb developer portal and generate a new one.

