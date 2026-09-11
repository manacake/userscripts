// ==UserScript==
// @name         Neopets Shop Stock Pricer
// @version      2.1.0
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
  const DEBUG = false; // Set to true if you want to see console logs

  const possibleShopStockPage = document.querySelector('.mkt-subnav__link.is-active').textContent === 'Shop Stock';
  if (!possibleShopStockPage) return;

  const log = (...args) => {
    if (DEBUG) {
      console.log(...args);
    }
  }

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

  const updateItemRowsWithPricing = (rows) => {
    // Update the item rows to include historical pricing
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const itemName = row.querySelector('.market-your-item__name').textContent.trim();
      const newCell = document.createElement('td');

      const itemData = data[itemName];
      const isInflated = itemData?.price?.inflated;
      const itemPrice = itemData?.price?.value;
      const styleAttr = isInflated ? 'style="color: red;"' : '';

      newCell.setAttribute('class', 'historical-price py-3 px-4 text-left');
      newCell.innerHTML = `<span ${styleAttr}><b>${itemPrice ?? '??'}</b></span>`;
      row.cells[2].insertAdjacentElement('afterend', newCell);
    }
  }

  const table = document.querySelector('form table.market-your-table');
  const rows = table.querySelectorAll('tr');
  const names = [];
  let data = {};

  // Add a new column: Price History to the header row
  const headerCell = document.createElement('th');
  headerCell.setAttribute('class', 'py-3 px-4 market-your__col-history');
  headerCell.setAttribute('style', 'width: auto;');
  headerCell.innerHTML = 'Price History';
  // Insert after "Stock" column
  rows[0].cells[2].insertAdjacentElement('afterend', headerCell);

  // Grab item names to fetch price check
  // i starts at 1 to skip header row
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const itemName = row.querySelector('.market-your-item__name').textContent.trim();
    if (!names.includes(itemName)) names.push(itemName);
  }

  try {
    data = await fetchItemPriceHistory(names);
    updateItemRowsWithPricing(rows);
  }
  catch (error) {
    console.error("Failed to update shop prices:", error);
  }

  /**
   * During form submission, a row may be removed and cause stale data. When
   * row is removed, it doesn't reload the form or replace it in the DOM. The
   * rows get patched in place.
   */
  const rowsObserver = new MutationObserver(() => {
    log('[shop stock pricer] table rows changed, refreshing price column');
    // Guard to prevent triggering rowsObserver from our edits
    rowsObserver.disconnect();
    // Remove the possibly outdated price data (e.g. row was removed, but the pricing cell stays)
    document.querySelectorAll('.historical-price').forEach(cell => cell.remove());
    // Re-add the historical pricing in the correct row cells
    updateItemRowsWithPricing(table.querySelectorAll('tr'));
    rowsObserver.observe(table, { childList: true, subtree: true }); // Re-enable mutation observing
  });
  rowsObserver.observe(table, { childList: true, subtree: true });
})();