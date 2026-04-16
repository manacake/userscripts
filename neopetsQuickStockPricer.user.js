// ==UserScript==
// @name         Neopets Quick Stock Pricer
// @version      2.0.0
// @author       manacake.co
// @namespace    manacake.co
// @description  For use on the user's quick stock page: queries the latest price of an item and displays it so the user can pick the appropriate action.
// @license      CC-BY-NC-4.0
// @website      https://manacake.co
// @updateURL    https://raw.githubusercontent.com/manacake/userscripts/main/neopetsQuickStockPricer.user.js
// @downloadURL  https://raw.githubusercontent.com/manacake/userscripts/main/neopetsQuickStockPricer.user.js
// @match        *://*.neopets.com/quickstock.phtml*
// @icon         https://manacake.co/favicon.ico
// @grant        GM_xmlhttpRequest
// @connect      itemdb.com.br
// @noframes
// ==/UserScript==

(async function() {
  'use strict';
  /**
   * Helper to fetch item price from itemdb's API
   * Note: When using fetch(), the API is not allowed to return "Access-Control-Allow-Origin: *"
   * but itemdb does and this causes an error in the browser's eyes.
   * Using GM_xmlhttpRequest will run the context of the extension and not neopets.com which will
   * allow it to ignore CORS headers entirely.
   */
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
          console.error('[quick stock pricer] cannot fetch item prices', error);
          reject(error);
        }
      });
    });
  }

  const applyItemPricing = async () => {
    const tbody = document.querySelector('form table.quickstock-table tbody.np-table-tbody');
    const isPricedAlready = !!tbody.querySelector('.item-price');
    // Ignore pages that have pricing already
    if (isPricedAlready) {
      return;
    }

    const rows = tbody.querySelectorAll('tr');
    const names = [];
    // Grab item names to fetch price check
    for (let i = 0; i < rows.length - 1; i++) {
      const row = rows[i];
      const style = window.getComputedStyle(row);
      const rowBgColor = style.backgroundColor;

      if (rowBgColor !== 'rgb(253, 230, 138)' // check all row
        && rowBgColor !== 'rgb(167, 243, 208)' // NC item
        && rowBgColor !== 'rgb(209, 250, 229)' // NC item
      ) {
        const itemCell = row.querySelector('td span');
        const itemName = itemCell.textContent;
        /**
         * There is a possibility that the itemName will not exist because
         * the row is a divider row and it shares a bg color of #FFFFFF
         * with a valid item row so we need to parse out the divider row
         */
        if (itemName !== ' ' && !names.includes(itemName)) {
          names.push(itemName);
        }
      }
    }

    try {
      const data = await fetchItemPriceHistory(names);
      // Update the item rows to include historical pricing
      for (let i = 0; i < rows.length - 1; i++) {
        const row = rows[i];
        const style = window.getComputedStyle(row);
        const rowBgColor = style.backgroundColor;

        if (rowBgColor !== 'rgb(253, 230, 138)' // check all row
          && rowBgColor !== 'rgb(167, 243, 208)' // NC item
          && rowBgColor !== 'rgb(209, 250, 229)' // NC item
        ) {
          const itemCell = row.querySelector('td');
          const itemName = itemCell.querySelector('span').textContent;
          if (itemName !== ' ') {
            const isInflated = data[itemName]?.price.inflated;
            const itemPrice = data[itemName]?.price.value;
            itemCell.className += ' flex justify-between';

            const spanPrice = document.createElement('span');
            spanPrice.textContent = itemPrice;
            spanPrice.className = `item-price font-bold ${isInflated ? 'text-red-500' : ''}`;

            itemCell.append(spanPrice);
          }
        }
      }
    } catch (error) {
      console.error("[quick stock pricer] failed to update shop prices:", error);
    }
  }

  /**
   * Every time the page changes, the table rows also change so we need
   * a way to update the pricing for each row upon page change
   */
  const paginationControls = document.querySelector('.np-pagination-controls');
  paginationControls.addEventListener('click', async function(_event) {
    await applyItemPricing();
  });

  // Run on first page load
  await applyItemPricing();
})();