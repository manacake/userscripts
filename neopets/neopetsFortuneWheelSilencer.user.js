// ==UserScript==
// @name         Neopets Fortune Wheel Silencer
// @version      1.0.0
// @author       manacake.co
// @namespace    manacake.co
// @description  Automatically mutes all fortune wheels on page load
// @license      CC-BY-NC-4.0
// @website      https://manacake.co
// @updateURL    https://raw.githubusercontent.com/manacake/userscripts/main/neopets/neopetsFortuneWheelSilencer.user.js
// @downloadURL  https://raw.githubusercontent.com/manacake/userscripts/main/neopets/neopetsFortuneWheelSilencer.user.js
// @match        *://*.neopets.com/prehistoric/mediocrity.phtml*
// @match        *://*.neopets.com/faerieland/wheel.phtml*
// @match        *://*.neopets.com/halloween/wheel/index.phtml*
// @match        *://*.neopets.com/medieval/knowledge.phtml*
// @match        *://*.neopets.com/prehistoric/monotony/monotony.phtml*
// @match        *://*.neopets.com/desert/extravagance.phtml*
// @match        *://*.neopets.com/premium/wheel.phtml*
// @match        *://*.neopets.com/mall/wheel/*
// @icon         https://manacake.co/favicon.ico
// @noframes
// ==/UserScript==

(function () {
  'use strict';
  const DEBUG = false;
  const MALL_WHEEL_POLL_MS = 100;
  const MALL_WHEEL_TIMEOUT_MS = 15000;

  const log = (...args) => {
    if (DEBUG) {
      console.log(...args);
    }
  }

  const isMallWheel = () => window.location.pathname.startsWith('/mall/wheel/');

  // The NC Archives wheel is a Phaser canvas with no DOM sound control, so
  // fire the mute sprite's click handler through the page's globals instead
  const muteMallWheel = () => {
    const pageWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
    const { game, soundon } = pageWindow;
    if (!game || !game.sound || !soundon || !soundon.events) {
      return false;
    }

    if (!game.sound.mute) {
      log('[fortune wheel silencer] found nc archives game canvas! attempting mute!');
      soundon.events.onInputDown.dispatch(soundon, game.input.activePointer);
    }
    return true;
  };

  // soundon only exists once the wheel's assets load, and only when a spin is
  // available, so poll for it and give up after a while
  const watchMallWheel = () => {
    const startedAt = Date.now();
    const timer = setInterval(() => {
      const isMuted = muteMallWheel();
      if (isMuted || Date.now() - startedAt > MALL_WHEEL_TIMEOUT_MS) {
        log(`[fortune wheel silencer] ${isMuted ? 'successfully muted' : 'timed out'}`);
        clearInterval(timer);
      }
    }, MALL_WHEEL_POLL_MS);
  };

  const muteWheel = () => {
    const soundControl = document.querySelector('div#wheelSoundControl');
    if (!soundControl) {
      return false;
    }

    soundControl.click();
    return true;
  };

  const onReady = () => {
    if (isMallWheel()) {
      watchMallWheel();
      return;
    }

    if (muteWheel()) {
      return;
    }

    const wheelObserver = new MutationObserver((_mutations, observer) => {
      if (muteWheel()) {
        observer.disconnect();
      }
    });

    wheelObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
  };

  if (document.readyState === 'complete') {
    onReady();
  } else {
    window.addEventListener('load', onReady);
  }
})();
