// ==UserScript==
// @name         Line Sticker Downloader
// @version      1.0.1
// @author       manacake.co
// @namespace    manacake.co
// @description  Downloads the page's stickers in a .zip file
// @license      CC-BY-NC-4.0
// @website      https://manacake.co
// @updateURL    https://raw.githubusercontent.com/manacake/userscripts/main/lineStickerDownloader.user.js
// @downloadURL  https://raw.githubusercontent.com/manacake/userscripts/main/lineStickerDownloader.user.js
// @match        *://store.line.me/stickershop/product/*/en*
// @icon         https://manacake.co/favicon.ico
// @grant        none
// @noframes
// ==/UserScript==

(async function() {
  'use strict';

  const stickerNameContainer = document.querySelector('p[data-test="sticker-name-title"]');
  const isAnimated = !!document.querySelector('div[ref="mainImage"]').querySelector('span[data-test="animation-sticker-icon"]');
  /**
   * Due to the endpoint not having a valid secure protocol, there is a possibility that the download might not complete properly without manual intervention. Usually, modern browsers will stop the .zip download because the current document is served over https while the download is served over http. In order to follow through, you must click [Allow download] manually by checking your browser's downloads UI. Also, if the .zip gets corrupted somehow, try downloading in a different browser. (You can peek the download URL in the console)
   */
  const staticTemplateUrl = 'http://dl.stickershop.line.naver.jp/products/0/0/1/[ID]/iphone/stickers@2x.zip';
  const animatedTemplateUrl = 'http://dl.stickershop.line.naver.jp/products/0/0/1/[ID]/iphone/stickerpack@2x.zip';

  // Extract sticker ID and build endpoint for sticker type
  let stickerId;
  const possibleMatch = window.location.href.match(/\/product\/(\d+)/);
  if (possibleMatch) {
    stickerId = possibleMatch[1];
  }
  else {
    console.error('[Line Sticker Downloader] No valid sticker ID found!');
    return;
  }
  const downloadEndpointStatic = staticTemplateUrl.replace(/(\[ID\])/, stickerId);
  const downloadEndpointAnimated = animatedTemplateUrl.replace(/(\[ID\])/, stickerId);

  // Add button to start download process
  const buttonDownload = document.createElement('button');
  buttonDownload.setAttribute('style', 'display:block; padding:15px; margin-bottom:10px; background:#00B84F; color:#FFF; font-weight:bold; font-size:15px; cursor:pointer;');
  buttonDownload.innerHTML = 'Download all stickers';
  buttonDownload.onclick = () => {
    const downloadUrl = `${isAnimated
      ? downloadEndpointAnimated
      : downloadEndpointStatic
    }`;
    console.log(`[Line Sticker Downloader] Attempting to download at ${downloadUrl}`);
    window.open(downloadUrl, '_blank');
  }
  stickerNameContainer.after(buttonDownload);
})();