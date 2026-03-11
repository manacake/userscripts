// ==UserScript==
// @name         Neopets Shop Stock Pricer
// @version      1.1.0
// @author       manacake.co
// @namespace    manacake.co
// @description  For use on the user's shop stock page: queries the latest price of an item and displays it so the user can adjust their prices accordingly.
// @license      CC-BY-NC-4.0
// @website      https://manacake.co
// @updateURL    https://raw.githubusercontent.com/manacake/userscripts/main/neopetsShopStockPricer.user.js
// @downloadURL  https://raw.githubusercontent.com/manacake/userscripts/main/neopetsShopStockPricer.user.js
// @match        *://*.neopets.com/market.phtml*
// @icon         https://manacake.co/favicon.ico
// @grant        GM_xmlhttpRequest
// @connect      itemdb.com.br
// @noframes
// ==/UserScript==

(async function() {
  'use strict';

  const possibleShopStockPage = document.querySelector('td.content p');
  if (!possibleShopStockPage) return;

  // Helper to fetch item price from itemdb's API using GM_xmlhttpRequest to bypass CORS
  const fetchItemPriceHistory = (names) => {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: "POST",
        url: "https://itemdb.com.br/api/v1/items/many",
        headers: {
          "Content-Type": "application/json"
        },
        data: JSON.stringify({
          name: names
        }),
        onload: function(response) {
          if (response.status >= 200 && response.status < 300) {
            try {
              resolve(JSON.parse(response.responseText));
            } catch (e) {
              reject("Error parsing JSON response");
            }
          } else {
            reject(`[itemdb error] ${response.status} ${response.statusText}`);
          }
        },
        onerror: function(error) {
          console.error('Cannot fetch item prices', error);
          reject(error);
        }
      });
    });
  };

  // Sanity checking if we're on a user's shop stock page
  if (possibleShopStockPage.textContent.includes('When you sell an item, the Neopoints will go into your')) {
    const table = document.querySelector('form table');
    const rows = table.querySelectorAll('tr');
    
    // Some users might have their pin security enabled which will require logic adjustments
    const isPinEnabled = !!table.querySelector('input[name="pin"]');
    const listLengthAdjustment = isPinEnabled ? 3 : 1; 
    const names = [];

    // Add a new column: Price History to the header row
    const headerCell = document.createElement('td');
    headerCell.setAttribute('align', 'center');
    headerCell.setAttribute('bgcolor', '#dddd77');
    headerCell.innerHTML = '<b>Price History</b>';
    rows[0].cells[3].insertAdjacentElement('afterend', headerCell);

    // Grab item names to fetch price check
    for (let i = 1; i < rows.length - listLengthAdjustment; i++) {
      const row = rows[i];
      const itemName = row.cells[0].textContent.trim();
      if (!names.includes(itemName)) names.push(itemName);
    }

    try {
      const data = await fetchItemPriceHistory(names);

      // Update the item rows to include historical pricing
      for (let i = 1; i < rows.length - listLengthAdjustment; i++) {
        const row = rows[i];
        const itemName = row.cells[0].textContent.trim();
        const newCell = document.createElement('td');
        
        const itemData = data[itemName];
        const isInflated = itemData?.price?.inflated;
        const itemPrice = itemData?.price?.value;
        const styleAttr = isInflated ? 'style="color: red;"' : '';
        
        newCell.setAttribute('align', 'center');
        newCell.setAttribute('bgcolor', '#ffffcc');
        newCell.innerHTML = `<span ${styleAttr}><b>${itemPrice ?? '??'}</b></span>`;
        row.cells[3].insertAdjacentElement('afterend', newCell);
      }

      // Fix colspans for the footer rows
      if (isPinEnabled) rows[rows.length - 3].querySelector('td').setAttribute('colspan', '8');
      rows[rows.length - 1].querySelector('td').setAttribute('colspan', '8');

    } catch (error) {
      console.error("Failed to update shop prices:", error);
    }
  }
})();