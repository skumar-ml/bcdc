/*
Purpose: Admin portal peek gate for ?testMemberId= — Admin-minted peekToken; stamps token onto portal API calls.

Brief Logic: Exposes window.BdcPortalPeek.canPortalPeek() and installPeekFetch(). When peekToken is in the URL, auto-wraps fetch/bdcFetch so getPortalDetail and friends stop 403ing. Optional Webflow embed can still gate the page.

dependent-files: window.BDC_API.member, optional bdcFetch, portal_new_ui / portal_staging fetch calls

Webflow embed (optional page gate — keep if you want deny → login-admit):

  if (testMemberId && testAccountEmail && testAccountType) {
    const allowed = await window.BdcPortalPeek.canPortalPeek();
    if (!allowed) {
      window.location.href = window.location.origin + "/portal/login-admit-account";
      return;
    }
  }

Load this file on portal pages BEFORE portal_new_ui / portal_staging.
*/

(function () {
  function peekTokenFromUrl() {
    try {
      return new URLSearchParams(window.location.search).get("peekToken") || "";
    } catch (e) {
      return "";
    }
  }

  function testMemberIdFromUrl() {
    try {
      return new URLSearchParams(window.location.search).get("testMemberId") || "";
    } catch (e) {
      return "";
    }
  }

  /** Append peekToken to a relative or absolute URL when missing. */
  function withPeekQuery(url, token) {
    if (!token || !url) return url;
    try {
      var absolute = new URL(url, window.location.origin);
      if (!absolute.searchParams.get("peekToken")) {
        absolute.searchParams.set("peekToken", token);
      }
      return absolute.toString();
    } catch (e) {
      if (String(url).indexOf("peekToken=") !== -1) return url;
      return url + (url.indexOf("?") >= 0 ? "&" : "?") + "peekToken=" + encodeURIComponent(token);
    }
  }

  /**
   * @returns {Promise<boolean>}
   */
  async function canPortalPeek() {
    var token = peekTokenFromUrl();
    if (!token) return false;

    var base = (window.BDC_API && window.BDC_API.member) || "";
    if (!base) return false;

    var testMemberId = testMemberIdFromUrl();
    var url =
      base.replace(/\/?$/, "/") +
      "canPortalPeek?peekToken=" +
      encodeURIComponent(token);
    if (testMemberId) {
      url += "&testMemberId=" + encodeURIComponent(testMemberId);
    }

    try {
      // Use unwrapped fetch for the gate call if we already patched window.fetch
      var fetchFn = window.__bdcPeekOriginalFetch || window.fetch;
      if (typeof window.bdcFetch === "function" && !window.__bdcPeekFetchInstalled) {
        fetchFn = window.bdcFetch;
      }
      var res = await fetchFn.call(window, url, {
        method: "GET",
        headers: { Accept: "application/json" },
        credentials: "omit",
      });
      if (!res.ok) return false;
      var data = await res.json();
      return !!(data && data.allowed === true);
    } catch (e) {
      console.warn("canPortalPeek failed", e);
      return false;
    }
  }

  /** Stamp peekToken on portal fetches — wrap both fetch and bdcFetch when present. */
  function installPeekFetch() {
    var token = peekTokenFromUrl();
    if (!token || window.__bdcPeekFetchInstalled) return;
    window.__bdcPeekFetchInstalled = true;

    var wrap = function (original) {
      return function (input, init) {
        var nextInput = input;
        if (typeof input === "string") {
          nextInput = withPeekQuery(input, token);
        } else if (input && typeof Request !== "undefined" && input instanceof Request) {
          nextInput = new Request(withPeekQuery(input.url, token), input);
        }
        return original.call(this, nextInput, init);
      };
    };

    // portal_new_ui uses raw fetch — always wrap it when peeking
    if (typeof window.fetch === "function") {
      window.__bdcPeekOriginalFetch = window.fetch.bind(window);
      window.fetch = wrap(window.__bdcPeekOriginalFetch);
    }
    if (typeof window.bdcFetch === "function") {
      window.bdcFetch = wrap(window.bdcFetch);
    }
  }

  window.BdcPortalPeek = {
    canPortalPeek: canPortalPeek,
    installPeekFetch: installPeekFetch,
    peekTokenFromUrl: peekTokenFromUrl,
    withPeekQuery: withPeekQuery,
  };

  // Auto-install as soon as this file loads so APIs get peekToken without waiting on embed
  if (peekTokenFromUrl()) {
    installPeekFetch();
  }
})();
