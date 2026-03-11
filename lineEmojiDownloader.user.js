// ==UserScript==
// @name         Line Emoji Downloader
// @version      1.0.0
// @author       manacake.co
// @namespace    manacake.co
// @description  Downloads the page's emojis in a .zip file
// @license      CC-BY-NC-4.0
// @website      https://manacake.co
// @updateURL    https://raw.githubusercontent.com/manacake/userscripts/main/lineEmojiDownloader.user.js
// @downloadURL  https://raw.githubusercontent.com/manacake/userscripts/main/lineEmojiDownloader.user.js
// @match        *://store.line.me/emojishop/product/*/en
// @require      https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js
// @icon         https://manacake.co/favicon.ico
// @grant        none
// @noframes
// ==/UserScript==

(async function() {
  'use strict';

  const ul = document.querySelector('ul.FnEmoji_animation_list_img');
  const emojiContainers = ul.querySelectorAll('div.FnImage span');
  const emojiNameContainer = document.querySelector('p[data-test="emoji-name-title"]');
  const emojiName = emojiNameContainer.textContent || 'emojis';
  const emojiNameNoSpaces = emojiName.replace(/\s/g, '_');
  const emojiUrls = [];

  // Gather emoji urls
  for (let i = 0; i < emojiContainers.length; i++) {
    const emoji = emojiContainers[i];
    const rawStyle = emoji.getAttribute('style');
    // Match url without query parameter
    const possibleMatch = rawStyle.match(/url\(([^?)]+)/);
    if (possibleMatch) {
      emojiUrls.push(possibleMatch[1]);
    }
  }

  // Helper used to download the gathered emoji urls and zip them up
  async function downloadAndZip() {
    const zip = new JSZip();
    const folder = zip.folder(emojiNameNoSpaces);
    console.log('[Line emoji downloader] Starting emoji downloads...')
    const downloadPromises = emojiUrls.map(async (url, index) => {
      try {
        const response = await fetch(url);
        const blob = await response.blob();
        // Extract filename from URL or create one
        const fileName = url.split('/').pop() || `emoji_${index}.png`;
        folder.file(fileName, blob);
        console.log(`[Line emoji downloader] Added ${fileName} to zip`);
      } catch (err) {
        console.error(`[Line emoji downloader] Failed to download ${url}`, err);
      }
    });

    await Promise.all(downloadPromises);
    // Generate and save the zip
    zip.generateAsync({type: 'blob'}).then(function(content) {
      saveAs(content, `${emojiNameNoSpaces}.zip`);
      console.log('[Line emoji downloader] Download complete!');
    });
  }

  // Add a button to start the download process
  const btn = document.createElement('button');
  btn.innerHTML = 'Download All Emojis';
  btn.style.display = 'block';
  btn.style.padding = '15px';
  btn.style.background = '#00b84f';
  btn.style.color = '#FFF';
  btn.style.fontWeight = 'bold';
  btn.style.fontSize = '15px';
  btn.style.marginBottom = '12px';
  btn.onclick = downloadAndZip;
  emojiNameContainer.after(btn);
})();