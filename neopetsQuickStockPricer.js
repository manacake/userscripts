// ==UserScript==
// @name         Neopets Quick Stock Pricer
// @version      1.1.0
// @author       manacake.co
// @namespace    manacake.co
// @description  For use on the user's quick stock page: queries the latest price of an item and displays it so the user can pick the appropriate action.
// @license      CC-BY-NC-4.0
// @website      https://manacake.co
// @match        *://*.neopets.com/quickstock.phtml*
// @icon         https://manacake.co/favicon.ico
// @grant        GM_xmlhttpRequest
// @connect      itemdb.com.br
// @noframes
// ==/UserScript==

(async function() {
  'use strict';
  // Helper to fetch item price from itemdb's API
  // Note: When using fetch(), the API is not allowed to return "Access-Control-Allow-Origin: *"
  // but itemdb does and this causes an error in the browser's eyes.
  // Using GM_xmlhttpRequest will run the context of the extension and not neopets.com which will
  // allow it to ignore CORS headers entirely.
  const fetchItemPriceHistory = async (names) => {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: "POST",
        url: "https://itemdb.com.br/api/v1/items/many",
        headers: {
          "Content-Type": "application/json"
        },
        data: JSON.stringify({ name: names }),
        // This bypasses the browser's CORS check
        onload: function(response) {
          if (response.status >= 200 && response.status < 300) {
            resolve(JSON.parse(response.responseText));
          } else {
            reject(`[itemdb error] ${response.status}`);
          }
        },
        onerror: function(error) {
          console.error('Cannot fetch item prices', error);
          reject(error);
        }
      });
    });
  }

  const table = document.querySelector('form[name="quickstock"] table');
  const rows = table.querySelectorAll('tr');
  const names = [];
  // Grab item names to fetch price check
  for (let i = 1; i < rows.length - 3; i++) {
    const row = rows[i];
    const rowBgColor = row.getAttribute('bgColor');
    if (rowBgColor !== '#EEEEBB' // header
      && rowBgColor !== '#ffffff' // divider between NP and NC items
      && rowBgColor !== '#85ffcb' // NC item
    ) {
      const itemCell = row.querySelector('td[align="left"]');
      const itemName = itemCell.textContent;
      if (!names.includes(itemName)) names.push(itemName);
    }
  }

  try {
    const data = await fetchItemPriceHistory(names);

    // Update the item rows to include historical pricing
    for (let i = 1; i < rows.length - 3; i++) {
      const row = rows[i];
      const rowBgColor = row.getAttribute('bgColor');
      if (rowBgColor !== '#EEEEBB' // header
        && rowBgColor !== '#ffffff' // divider between NP and NC items
        && rowBgColor !== '#85ffcb' // NC item
      ) {
        const itemCell = row.querySelector('td[align="left"]');
        const itemName = itemCell.textContent;
        const isInflated = data[itemName]?.price.inflated;
        const itemPrice = data[itemName]?.price.value;
        const styleAttr = isInflated ? 'style="color: red;"' : '';
        itemCell.innerHTML = `
          <div style="display: flex; justify-content: space-between; width: 100%;">
            <span>${itemName}</span>
            <span ${styleAttr}><b>${itemPrice ?? '??'}</b></span>
          </div>
        `;
      }
    }
  } catch (error) {
    console.error("Failed to update shop prices:", error);
  }
})();