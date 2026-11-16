/*
Purpose: Admin portal peek gate for ?testMemberId= — requires Admin-minted peekToken; no Memberstack login, no legacy id list.

Brief Logic: Exposes window.BdcPortalPeek.canPortalPeek() and installPeekFetch(). Reads peekToken from the URL, asks canPortalPeek, and stamps peekToken onto portal API calls (query param so CORS stays default).

dependent-files: window.BDC_API.member, optional bdcFetch

Webflow embed change (replace the hardcode-only if):

  if (testMemberId && testAccountEmail && testAccountType) {
    const allowed = await window.BdcPortalPeek.canPortalPeek();
    if (!allowed) {
      window.location.href = "https://www.bergendebate.com/portal/login-admit-account";
      return;
    }
    window.BdcPortalPeek.installPeekFetch();
  }

Load this file on portal pages before the page bootstrap script.
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
      // Relative path without origin context — append manually
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
      var fetchFn = typeof bdcFetch === "function" ? bdcFetch : fetch;
      var res = await fetchFn(url, {
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

  /** Stamp peekToken on subsequent portal fetches for this tab. */
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

    // Prefer wrapping bdcFetch when Webflow injects it; else wrap window.fetch
    if (typeof window.bdcFetch === "function") {
      window.bdcFetch = wrap(window.bdcFetch);
    } else if (typeof window.fetch === "function") {
      window.fetch = wrap(window.fetch);
    }
  }

  window.BdcPortalPeek = {
    canPortalPeek: canPortalPeek,
    installPeekFetch: installPeekFetch,
    peekTokenFromUrl: peekTokenFromUrl,
  };
})();
