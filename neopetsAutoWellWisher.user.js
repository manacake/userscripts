// ==UserScript==
// @name         Neopets Auto Well Wisher
// @version      1.0.1
// @author       manacake.co
// @namespace    manacake.co
// @description  Prefills wishing well inputs and submits them automatically up to the max amount of wishes
// @license      CC-BY-NC-4.0
// @website      https://manacake.co
// @updateURL    https://raw.githubusercontent.com/manacake/userscripts/main/neopetsAutoWellWisher.user.js
// @downloadURL  https://raw.githubusercontent.com/manacake/userscripts/main/neopetsAutoWellWisher.user.js
// @match        *://*.neopets.com/wishing.phtml*
// @icon         https://manacake.co/favicon.ico
// @grant        none
// @noframes
// ==/UserScript==

(function() {
  'use strict';
  const DEBUG = false; // Set to true if you want to see console logs
  const ITEM_TO_WISH_FOR = 'Flaming Meerca Stamp'; // Set to item you want to wish for
  const MIN_DONATION_AMOUNT = '21';
  const MAX_WISH_AMOUNT = 7;

  const log = (...args) => {
    if (DEBUG) {
      console.log(...args);
    }
  }

  const displayNotice = (note) => {
    const imgElement = document.querySelector('img[src*="wishingwell.gif"]');
    const notice = document.createElement('p');

    if (imgElement) {
      notice.textContent = note;
      notice.style.fontWeight = 'bold';
      notice.style.color = 'tomato';
      imgElement.insertAdjacentElement('afterend', notice);
    }
  }

  // 7 wishes are valid every 12 hours
  let isMaxWishReached = false;
  let isWishStateOpen = false;
  const possibleWishCountContainers = document.querySelectorAll('center b');

  possibleWishCountContainers.forEach((element, index) => {
    const text = element.textContent.trim();
    
    // If wishing is valid, set values and submit form
    if (text.includes('Wish Count:')) {
      const wishCountValue = parseInt(text.split(':')[1].trim(), 10);
      log(`[auto well wisher] wish count value: ${wishCountValue}`);

      if (wishCountValue <= MAX_WISH_AMOUNT) {
        displayNotice('Processing wish...');
        isWishStateOpen = true;
        // Must donate a minimum of 21 NP for wish to be eligible to be granted.
        document.querySelector('input[name="donation"]').setAttribute('value', MIN_DONATION_AMOUNT);
        // Item you wish for must be of 89 rarity or lower.
        document.querySelector('input[name="wish"]').setAttribute('value', ITEM_TO_WISH_FOR);

        log('[auto well wisher] values filled in. submitting form');
        document.querySelector('input[value="Make a Wish"]').click();
      }
    }
    else {
      isMaxWishReached = true;
    }
  });
  
  if (isMaxWishReached && !isWishStateOpen) {
    log('[auto well wisher] max amount of wishes submitted');
    displayNotice('Max wishes reached');
  }
})();
