# Nexus2Torbox

A small userscript that adds **TorBox** buttons to Nexus Mods pages. Clicking a
button sends the selected mod or file to your TorBox account as a web download.

## Features

- Adds a TorBox button beside the main Nexus Mods download action.
- Adds a TorBox button to individual entries on the **Files** tab.
- Uses Nexus Mods' existing button styles.
- Supports pages that load file entries dynamically.
- Stores the API key in your userscript manager.
- Only submits the download to TorBox—there is no polling, automatic opening,
  or background download handling.

## Installation

1. Install a userscript manager such as
   [Violentmonkey](https://violentmonkey.github.io/).
2. Open [`Nexus2Torbox.user.js`](./Nexus2Torbox.user.js), select **Raw**, and
   approve the installation prompt from your userscript manager.
3. Open the userscript manager menu on a Nexus Mods page and select
   **TorBox API key**.
4. Paste the API key from your
   [TorBox settings](https://torbox.app/settings) and select **Save**.

If no key has been configured, clicking a TorBox button opens the settings
dialog automatically.

## Usage

Visit a Nexus Mods mod page and select **TorBox**:

- The main button submits the mod page, allowing TorBox to select the main
  download.
- A button beside an individual file submits that specific file's Nexus URL.

The button briefly displays **Sending...**, followed by **Added!** or an error.
After TorBox accepts the request, manage the download from your TorBox account.

## Privacy

The API key is saved using your userscript manager's local storage and is sent
only to `api.torbox.app` as a Bearer token. Nexus URLs selected through the
script are submitted to TorBox.

## Compatibility

The script is designed for Violentmonkey and other userscript managers that
support the classic `GM_*` APIs used in the metadata block.
