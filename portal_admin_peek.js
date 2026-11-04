/*
Purpose: Admin portal peek gate for ?testMemberId= — API allow (Mongo/SSM) or legacy list; never lock out known peeks on API deny during migration.

Brief Logic: Exposes window.BdcPortalPeek.canPortalPeek(loggedInMemberId). Sends Bearer when a Memberstack JWT is present. allowed=true from API opens the peek; otherwise legacy ids keep current production peeks working until Webflow legacy is removed.

dependent-files: window.BDC_API.member, optional bdcFetch, Memberstack cookie/localStorage

Webflow embed change (replace the hardcode-only if):

  if (testMemberId && testAccountEmail && testAccountType) {
    const allowed = await window.BdcPortalPeek.canPortalPeek(webflowMemberId);
    if (!allowed) {
      window.location.href = "https://www.bergendebate.com/portal/login-admit-account";
      return;
    }
  }

Load this file on portal pages before the page bootstrap script.
*/

(function () {
  // Network / pre-deploy fallback only — matches prior Webflow embed + SSM extras
  var LEGACY_PORTAL_PEEK_MEMBER_IDS = [
    "6425ddab8d8aff00027e10b4",
    "68920737da84535585da1714",
    "68d52fd957a0b1d70c05b04c",
    "6892074a0df27d037230cdea",
    "677ee4c0814b6a0002f34431",
    "64fa2b4cf82fef000265f9e0",
    "6a97c778e9992ef6b43368f9",
    "6a8c16ce147fb42632894a61",
  ];

  function legacyAllows(memberId) {
    return LEGACY_PORTAL_PEEK_MEMBER_IDS.indexOf(String(memberId || "")) !== -1;
  }

  function cookieValue(name) {
    var parts = ("; " + document.cookie).split("; " + name + "=");
    if (parts.length < 2) return null;
    return decodeURIComponent(parts.pop().split(";").shift() || "") || null;
  }

  /** Best-effort Memberstack JWT for Authorization — cookie first, then localStorage shapes. */
  function memberstackBearer() {
    var fromCookie = cookieValue("_ms-mid") || cookieValue("ms-mid");
    if (fromCookie && fromCookie.split(".").length === 3) return fromCookie;

    try {
      var raw = localStorage.getItem("memberstack");
      var parsed = raw ? JSON.parse(raw) : null;
      var token =
        (parsed && (parsed.token || parsed.jwt || parsed.accessToken)) ||
        (parsed && parsed.information && (parsed.information.token || parsed.information.jwt));
      if (token && String(token).split(".").length === 3) return String(token);
    } catch (e) {
      /* ignore */
    }

    try {
      for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i) || "";
        if (key.indexOf("_ms-mid") === -1 && key.indexOf("memberstack") === -1) continue;
        var val = localStorage.getItem(key);
        if (val && val.split(".").length === 3) return val;
      }
    } catch (e2) {
      /* ignore */
    }
    return null;
  }

  /**
   * @param {string} loggedInMemberId Memberstack id of the staffer on this browser (legacy fallback only)
   * @returns {Promise<boolean>}
   */
  async function canPortalPeek(loggedInMemberId) {
    var base = (window.BDC_API && window.BDC_API.member) || "";
    if (!base) {
      return legacyAllows(loggedInMemberId);
    }
    var url = base.replace(/\/?$/, "/") + "canPortalPeek";
    var headers = { Accept: "application/json" };
    var bearer = memberstackBearer();
    if (bearer) headers.Authorization = "Bearer " + bearer;

    try {
      var fetchFn = typeof bdcFetch === "function" ? bdcFetch : fetch;
      var res = await fetchFn(url, { method: "GET", headers: headers, credentials: "omit" });
      if (!res.ok) {
        // Keep peeks working if the new Lambda is not live yet
        return legacyAllows(loggedInMemberId);
      }
      var data = await res.json();
      // API allow wins (Mongo or SSM on the server)
      if (data && data.allowed === true) return true;
      // API deny or no token: still honor legacy so a bad/missing JWT cannot lock out
      // current production peeks until every admin is linked in Mongo and legacy is removed
      return legacyAllows(loggedInMemberId);
    } catch (e) {
      console.warn("canPortalPeek failed; using legacy allowlist", e);
      return legacyAllows(loggedInMemberId);
    }
  }

  window.BdcPortalPeek = {
    canPortalPeek: canPortalPeek,
    legacyAllows: legacyAllows,
  };
})();
