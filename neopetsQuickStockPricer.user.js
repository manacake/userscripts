// ==UserScript==
// @name         Neopets Quick Stock Pricer
// @version      3.0.0
// @author       manacake.co
// @namespace    manacake.co
// @description  For use on the user's quick stock page: queries the latest price of an item and displays it
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
  const DEBUG = false; // Set to true if you want to see console logs
  const itemNames = []; // Item names seen so far
  let itemData = {}; // Item data fetched from itemdb's API

  const log = (...args) => {
    if (DEBUG) {
      console.log(...args);
    }
  }

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
        method: 'POST',
        url: 'https://itemdb.com.br/api/v1/items/many',
        headers: {
          'Content-Type': 'application/json'
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

  const gatherItemNames = () => {
    const tbody = document.querySelector('form table.quickstock-table tbody.np-table-tbody');
    const rows = tbody.querySelectorAll('tr');

    for (let i = 0; i < rows.length - 1; i++) {
      const row = rows[i];
      const style = window.getComputedStyle(row);
      const rowBgColor = style.backgroundColor;
      // Exclude certain rows that don't have a NP value
      if (rowBgColor !== 'rgb(253, 230, 138)' // check all row
        && rowBgColor !== 'rgb(167, 243, 208)' // NC item
        && rowBgColor !== 'rgb(209, 250, 229)' // NC item
      ) {
        const itemCell = row.querySelector('td span');
        // Harvests text content from the first span
        const itemName = itemCell.childNodes[0].textContent.trim();
        if (itemName && itemName !== ' ' && !itemNames.includes(itemName)) {
          itemNames.push(itemName);
        }
      }
    }
    log('[quick stock pricer] item names gathered so far', itemNames);
  }

  /**
   * This helper is run assuming the items are static once you enter the quick stock page.
   * If you retroactively add an item to your inventory but don't refresh the quick stock page,
   * you will have stale data! So if you think your item list is stale, refresh the page to
   * get the latest item list.
   */
  const applyItemPricing = async () => {
    try {
      // If it has not been done already <OR> if the itemNames and itemData are mismatched,
      // do the item name scan and fetch pricing otherwise we can assume we have all the
      // items in which we need to fetch data
      if (itemNames.length === 0 || itemNames.length !== Object.keys(itemData).length) {
        gatherItemNames();
        const responseData = await fetchItemPriceHistory(itemNames);
        itemData = { ...itemData, ...responseData };
        log('[quick stock pricer] item data', itemData);
      }
      
      // Since the table rows are constantly erasing item pricing due to organization actions:
      // pagination, stacking, etc. We should apply the item data we have to the new table view
      const tbody = document.querySelector('form table.quickstock-table tbody.np-table-tbody');
      const rows = tbody.querySelectorAll('tr');
      // Target rows without pricing and apply our existing data to those affected rows:
      const rowsWithoutPrice = Array.from(rows).filter(row => !row.querySelector('.item-price'));
      // Bug: sometimes rowsWithoutPrice returns incorrect amount of rows because of race condition
      // the rows get added after a value change with select#qs-per-page-select
      log('[quick stock pricing] apply item pricing', rowsWithoutPrice);

      for (let i = 0; i < rowsWithoutPrice.length - 1; i++) {
        const row = rowsWithoutPrice[i];
        const style = window.getComputedStyle(row);
        const rowBgColor = style.backgroundColor;
        // Exclude certain rows that don't have a NP value
        if (rowBgColor !== 'rgb(253, 230, 138)' // check all row
          && rowBgColor !== 'rgb(167, 243, 208)' // NC item
          && rowBgColor !== 'rgb(209, 250, 229)' // NC item
        ) {
          const itemCell = row.querySelector('td');
          const span = itemCell.querySelector('span');
          const itemName = span.childNodes[0].textContent.trim();

          if (itemName && itemName !== ' ') {
            const isInflated = itemData[itemName]?.price.inflated;
            const itemPrice = itemData[itemName]?.price.value;

            if (itemPrice) {
              itemCell.className += ' flex justify-between';
              const spanPrice = document.createElement('span');
              spanPrice.textContent = itemPrice;
              spanPrice.className = `item-price font-bold ${isInflated ? 'text-red-500' : ''}`;
              itemCell.append(spanPrice);
            }
          }
        }
      }
    } catch (error) {
      console.error('[quick stock pricer] failed to update prices', error);
    }
  }

  const addPriceHistoryHeader = async (selector) => {
    const container = document.querySelector(selector);
    const thead = container.querySelector('thead.np-table-thead.quickstock-thead');
    const tableHeader = thead.querySelector('th');
    tableHeader.className += ' relative';
    const spanTableHeader = document.createElement('span');
    spanTableHeader.textContent = 'Price History';
    spanTableHeader.className = 'absolute right-3';
    tableHeader.append(spanTableHeader);
  }

  // When the NP/NC toggle is clicked, the table will be wiped of price data so we need to reapply pricing
  const npToggle = document.querySelector('.nptoggle');
  npToggle.addEventListener('click', async (_event) => {
    await applyItemPricing();
  });

  /**
   * The sorting toggle A-Z usually won't be needed except when pagination shows multiple pages in
   * which case sorting will erase existing pricing data and will need to be reapplied
   */
  const sortToggle = document.querySelector('.filtertoggle');
  sortToggle.addEventListener('click', async (_event) => {
    await applyItemPricing();
  });

  /**
   * When the stack toggle is clicked, the rows with duplicate item names will either
   * a. collapse and a quantity badge will appear next to the item name or
   * b. there will be extra row(s) with said item quantity
   * Either way, we need to update the missing prices when we go from stacked -> unstacked
   */
  const stackToggle = document.querySelector('.stacktoggle');
  stackToggle.addEventListener('click', async (_event) => {
    await applyItemPricing();
  });

  /**
   * The pagination controls only appear when the amount of items exceed the allowable items per page.
   * Every time the page changes, the table rows will erase price data so we need to reapply pricing
   */
  let paginationAbortController = null;
  const waitForElement = (selector, callback) => {
    let lastSeenElement = null;
    const observer = new MutationObserver((_mutations) => {
      const element = document.querySelector(selector);
      // Since MutationObserver fires for every DOM mutation, we need a guard to prevent duplicate callbacks
      if (element && element !== lastSeenElement) {
        lastSeenElement = element;
        callback(element);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  const select = document.querySelector('#qs-per-page-select');
  select.addEventListener('change', (_event) => {
    log('[quick stock pricer] changed items per page');
    const tbody = document.querySelector('form table.quickstock-table tbody.np-table-tbody');
    // Since the change event will fire before the page's JS has finished re-rendering the rows,
    // we should add a debounced mutation observer on tbody so we know when the DOM settles
    let debounceTimer;
    const observer = new MutationObserver((_mutations) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(async () => {
        observer.disconnect();
        await applyItemPricing();
      }, 50); // 50ms handles cases where the page mutates tbody in multiple batches
    });
    observer.observe(tbody, { childList: true, subtree: true });

    waitForElement('.np-pagination-controls', (paginationControls) => {
      log('[quick stock pricer] found pagination controls');
      // Cancel previous listener if pagination was reinserted
      if (paginationAbortController) {
        paginationAbortController.abort();
      }
      paginationAbortController = new AbortController();

      // Every time pagination controls gets re-inserted, attach new listener
      paginationControls.addEventListener('click', async (_event) => {
        await applyItemPricing();
        // Pass an abort controller signal to this event listener.
        // When .abort() is called on the controller, this listener will be auto removed
        // This helps in preventing duplicate listeners on the same element~
      }, { signal: paginationAbortController.signal });
    });
  });
  // End pagination controls block

  // Run on first page load
  await applyItemPricing();
  addPriceHistoryHeader('.np-table-container');
  addPriceHistoryHeader('.quickstock-thead-clone');
})();
