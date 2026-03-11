// ==UserScript==
// @name         Line Emoji Downloader
// @version      1.1.0
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

/* global JSZip, saveAs */

(async function() {
  'use strict';

  const ul = document.querySelector('ul.FnEmoji_animation_list_img');
  const emojiContainers = ul.querySelectorAll('div.FnImage span');
  const emojiNameContainer = document.querySelector('p[data-test="emoji-name-title"]');
  const emojiName = emojiNameContainer.textContent || 'Emojis';
  const emojiNameNoSpaces = emojiName.replace(/\s/g, '_');
  const isAnimated = !!document.querySelector('div[ref="mainImage"]').querySelector('span[data-test="animation-sticon-icon"]');
  const emojiUrlsStatic = [];
  const emojiUrlsAnimated = [];

  // Gather emoji urls
  for (let i = 0; i < emojiContainers.length; i++) {
    const emoji = emojiContainers[i];
    const rawStyle = emoji.getAttribute('style');
    // Match url without query parameter
    const possibleMatch = rawStyle.match(/url\(([^?)]+)/);
    if (possibleMatch) {
      emojiUrlsStatic.push(possibleMatch[1]);
      if (isAnimated) {
        emojiUrlsAnimated.push(possibleMatch[1].replace(/(.png)/, '_animation$1'));
      }
    }
  }

  /**
   * Helper used to download the gathered emoji urls and zip them up
   * @param {string} type - can be either STATIC, ANIMATED, OR ALL
   */
  async function downloadAndZip(type) {
    if (type !== 'STATIC' && type !== 'ANIMATED' && type !== 'ALL') return;
    if (!isAnimated && type === 'ANIMATED') return;

    const folderName = `${emojiNameNoSpaces}_${isAnimated ? type : 'STATIC'}`;
    const zip = new JSZip();
    const folder = zip.folder(folderName);
    const readmeContent = `# ${emojiName}\n\nDownloaded from: ${window.location.href}`;
    folder.file('source.md', readmeContent);

    const emojiUrls = (function() {
      switch (type) {
        case 'STATIC':
          return [...emojiUrlsStatic];
        case 'ANIMATED':
          return [...emojiUrlsAnimated];
        default:
          return [...emojiUrlsStatic, ...emojiUrlsAnimated];
      }
    })();
    console.log('[Line Emoji Downloader] Starting emoji downloads...');
    const downloadPromises = emojiUrls.map(async (url) => {
      try {
        const response = await fetch(url);
        const blob = await response.blob();
        const fileName = url.split('/').pop();
        folder.file(fileName, blob);
      } catch (err) {
        console.error(`[Line Emoji Downloader] Failed to download ${url}`, err);
      }
    });

    await Promise.all(downloadPromises);
    // Generate and save the zip
    zip.generateAsync({type: 'blob'}).then(function(content) {
      saveAs(content, `${folderName}.zip`);
      console.log('[Line Emoji Downloader] Download complete!');
    });
  }

  // Add buttons that start download process (and differentiate download types)
  const buttonContainer = document.createElement('div');
  const buttonAll = document.createElement('button');
  const buttonStatic = document.createElement('button');
  buttonStatic.setAttribute('style', 'background:#454545; color:#FFF; padding:8px; font-weight:bold; cursor:pointer;');
  const buttonAnimated = buttonStatic.cloneNode(false);
  const sideButtonContainer = buttonContainer.cloneNode(false);

  buttonContainer.setAttribute('style', 'display:flex; gap:5px; margin-bottom:10px;');
  sideButtonContainer.setAttribute('style', 'display:flex; flex-direction:column; align-items:flex-start; gap:5px;');
  buttonAll.setAttribute('style', 'display:block; padding:15px; background:#00B84F; color:#FFF; font-weight:bold; font-size:15px; cursor:pointer;');

  buttonAll.innerHTML = 'Download all emojis';
  buttonStatic.innerHTML = 'Download only static emojis';
  buttonAnimated.innerHTML = 'Download only animated emojis';
  buttonAll.onclick = () => downloadAndZip('ALL');
  buttonStatic.onclick = () => downloadAndZip('STATIC');
  buttonAnimated.onclick = () => downloadAndZip('ANIMATED');

  buttonContainer.appendChild(buttonAll);
  if (isAnimated) {
    sideButtonContainer.appendChild(buttonStatic);
    sideButtonContainer.appendChild(buttonAnimated);
    buttonContainer.appendChild(sideButtonContainer);
  }
  emojiNameContainer.after(buttonContainer);
})();