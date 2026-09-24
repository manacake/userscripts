// ==UserScript==
// @name         Neopets Battledome Challenger Sorter
// @version      1.0.0
// @author       manacake.co
// @namespace    manacake.co
// @description  Adds name and difficulty sorting controls to the battledome challenger list
// @license      CC-BY-NC-4.0
// @website      https://manacake.co
// @updateURL    https://raw.githubusercontent.com/manacake/userscripts/main/neopets/neopetsBattledomeSorter.user.js
// @downloadURL  https://raw.githubusercontent.com/manacake/userscripts/main/neopets/neopetsBattledomeSorter.user.js
// @match        *://*.neopets.com/dome/fight.phtml*
// @icon         https://manacake.co/favicon.ico
// @noframes
// ==/UserScript==

(function() {
  'use strict';

  const addSortButton = (header, label, direction, onClick) => {
    const button = document.createElement('button');
    const table = header.closest('table');
    button.type = 'button';
    button.className = 'battledome-sort-button';
    button.textContent = direction === 'ascending' ? '▲' : '▼';
    button.title = `Sort ${label} ${direction}`;
    button.addEventListener('click', () => {
      table.querySelectorAll('.battledome-sort-button.is-active').forEach((activeButton) => {
        activeButton.classList.remove('is-active');
      });
      button.classList.add('is-active');
      onClick();
    });
    header.append(button);
  };

  const sortChallengers = (table, key, direction) => {
    const tbody = table.querySelector('tbody');
    const rows = Array.from(tbody.querySelectorAll('tr.npcRow'));
    const multiplier = direction === 'ascending' ? 1 : -1;

    rows.sort((firstRow, secondRow) => {
      const firstValue = key === 'name'
        ? firstRow.querySelector('td.name').textContent.trim()
        : Number(firstRow.querySelector('td.diff').textContent.replace(/,/g, ''));
      const secondValue = key === 'name'
        ? secondRow.querySelector('td.name').textContent.trim()
        : Number(secondRow.querySelector('td.diff').textContent.replace(/,/g, ''));

      if (key === 'name') {
        return multiplier * firstValue.localeCompare(secondValue);
      }
      return multiplier * (firstValue - secondValue);
    });

    rows.forEach((row) => tbody.append(row));
  };

  const initialize = () => {
    const table = document.querySelector('#npcTable');
    if (!table || table.dataset.battledomeSorterInitialized) return;

    const nameHeader = table.querySelector('th.name');
    const difficultyHeader = table.querySelector('th.diff');
    if (!nameHeader || !difficultyHeader) return;

    table.dataset.battledomeSorterInitialized = 'true';
    const style = document.createElement('style');
    style.textContent = `
      #npcTable .battledome-sort-button {
        background: transparent;
        border: 0;
        color: inherit;
        cursor: pointer;
        font-size: 1.1em;
        line-height: 1;
        margin-left: 0.35em;
        padding: 0 0.15em;
      }
      #npcTable .battledome-sort-button:hover,
      #npcTable .battledome-sort-button:focus {
        color: #F7B32B;
        outline: 1px dotted currentColor;
      }
      #npcTable .battledome-sort-button.is-active {
        color: #B041E3;
      }
    `;
    document.head.append(style);

    addSortButton(nameHeader, 'name', 'ascending', () => {
      sortChallengers(table, 'name', 'ascending');
    });
    addSortButton(nameHeader, 'name', 'descending', () => {
      sortChallengers(table, 'name', 'descending');
    });
    addSortButton(difficultyHeader, 'difficulty', 'ascending', () => {
      sortChallengers(table, 'difficulty', 'ascending');
    });
    addSortButton(difficultyHeader, 'difficulty', 'descending', () => {
      sortChallengers(table, 'difficulty', 'descending');
    });
  };

  initialize();
})();
