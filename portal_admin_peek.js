/*
Purpose: Admin portal peek gate for ?testMemberId= — Admin-minted peekToken; stamps token onto portal API calls.

Brief Logic: Exposes window.BdcPortalPeek.canPortalPeek() and installPeekFetch(). When peekToken is in the URL, auto-wraps fetch/bdcFetch so getPortalDetail and friends stop 403ing. Forces path/query memberId to URL testMemberId so Memberstack's logged-in id cannot show the wrong family. Only BDC API hosts get peekToken (never third-party URLs).

dependent-files: window.BDC_API.member, optional bdcFetch, portal_new_ui / portal_staging fetch calls

Webflow embed (dashboard bootstrap — memberId MUST prefer testMemberId):

  const params = new URLSearchParams(window.location.search);
  const testMemberId = params.get("testMemberId");
  const testAccountEmail = params.get("testAccountEmail");
  const testAccountType = params.get("testAccountType");
  const memberId = (window.BdcPortalPeek && window.BdcPortalPeek.resolveMemberId)
    ? window.BdcPortalPeek.resolveMemberId(webflowMemberId)
    : (testMemberId || webflowMemberId);

  if (testMemberId && testAccountEmail && testAccountType) {
    const allowed = await window.BdcPortalPeek.canPortalPeek();
    if (!allowed) {
      window.location.href = window.location.origin + "/portal/login-admit-account";
      return;
    }
  }

  // Pass memberId into Portal / Sidebar / Announcement data — not webflowMemberId alone

Load this file on portal pages BEFORE portal_new_ui / portal_staging.
*/

(function () {
  // Path segments that end with /{memberId} on camp APIs
  var MEMBER_PATH_ENDPOINTS = [
    "getPortalDetail",
    "getMillionsTransactionData",
    "getAnnouncement",
    "getReferralData",
    "getCreditBalance",
    "getMemberDetails",
    "getFamilyMembers",
    "getAllParentDataByMemberId",
    "getMissingStudentDetails",
    "getTrialClassDetails",
    "getClassDetails",
    "getTopicsDetails",
    "getAttendance",
    "getSummerSessionDetails",
    "getNotificationData",
    "getMillionsDetails",
    "getMillionsStoreDetails",
    "signInActivity",
  ];

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

  /** Prefer URL testMemberId so peeks load that family, not the Memberstack session. */
  function resolveMemberId(fallback) {
    var peekId = testMemberIdFromUrl();
    if (peekId) return peekId;
    return fallback == null ? "" : String(fallback);
  }

  /** True only for our API hosts — never stamp analytics/CDN/third-party fetches. */
  function isBdcApiUrl(url) {
    try {
      var absolute = new URL(url, window.location.origin);
      var host = (absolute.hostname || "").toLowerCase();
      if (!host) return false;
      if (host === "api.bergendebate.com" || host === "staging.api.bergendebate.com") {
        return true;
      }
      // Legacy camp execute-api URLs still used by some portal scripts
      if (host.indexOf("execute-api.") !== -1 && host.indexOf("amazonaws.com") !== -1) {
        return true;
      }
      var api = window.BDC_API || {};
      for (var key in api) {
        if (!Object.prototype.hasOwnProperty.call(api, key) || !api[key]) continue;
        try {
          var baseHost = new URL(String(api[key]), window.location.origin).hostname.toLowerCase();
          if (baseHost && host === baseHost) return true;
        } catch (e) {
          /* ignore bad BDC_API entry */
        }
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  /** Swap wrong Memberstack id in path/query for the peeked family's id. */
  function withPeekMemberId(url, peekMemberId) {
    if (!peekMemberId || !url || !isBdcApiUrl(url)) return url;
    try {
      var absolute = new URL(url, window.location.origin);
      var escaped = MEMBER_PATH_ENDPOINTS.map(function (name) {
        return name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      }).join("|");
      // .../getPortalDetail/{anyId} → .../getPortalDetail/{testMemberId}
      absolute.pathname = absolute.pathname.replace(
        new RegExp("/(" + escaped + ")/[^/]+(?=/|$)", "i"),
        "/" + "$1/" + peekMemberId
      );
      if (absolute.searchParams.has("memberId")) {
        absolute.searchParams.set("memberId", peekMemberId);
      }
      return absolute.toString();
    } catch (e) {
      return url;
    }
  }

  /** Append peekToken to a BDC API URL when missing. */
  function withPeekQuery(url, token) {
    if (!token || !url || !isBdcApiUrl(url)) return url;
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

  /** Rewrite memberId then stamp peekToken for one outbound API URL. */
  function applyPeekToUrl(url, token, peekMemberId) {
    var next = withPeekMemberId(url, peekMemberId);
    return withPeekQuery(next, token);
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

  /** Stamp peekToken + correct memberId on portal API fetches. */
  function installPeekFetch() {
    var token = peekTokenFromUrl();
    var peekMemberId = testMemberIdFromUrl();
    if (!token || window.__bdcPeekFetchInstalled) return;
    window.__bdcPeekFetchInstalled = true;

    var wrap = function (original) {
      return function (input, init) {
        var nextInput = input;
        if (typeof input === "string") {
          nextInput = applyPeekToUrl(input, token, peekMemberId);
        } else if (input && typeof Request !== "undefined" && input instanceof Request) {
          nextInput = new Request(applyPeekToUrl(input.url, token, peekMemberId), input);
        }
        return original.call(this, nextInput, init);
      };
    };

    // portal_new_ui uses raw fetch — wrap it when peeking
    if (typeof window.fetch === "function") {
      window.__bdcPeekOriginalFetch = window.fetch.bind(window);
      window.fetch = wrap(window.__bdcPeekOriginalFetch);
    }
    if (typeof window.bdcFetch === "function") {
      window.bdcFetch = wrap(window.bdcFetch);
    }
  }

  /** Mutate shared Webflow data.memberId when peeking (XHR paths use this too). */
  function applyPeekMemberIdToData(data) {
    if (!data || typeof data !== "object") return data;
    var peekId = testMemberIdFromUrl();
    if (peekId) data.memberId = peekId;
    return data;
  }

  window.BdcPortalPeek = {
    canPortalPeek: canPortalPeek,
    installPeekFetch: installPeekFetch,
    peekTokenFromUrl: peekTokenFromUrl,
    testMemberIdFromUrl: testMemberIdFromUrl,
    resolveMemberId: resolveMemberId,
    applyPeekMemberIdToData: applyPeekMemberIdToData,
    withPeekQuery: withPeekQuery,
    withPeekMemberId: withPeekMemberId,
    applyPeekToUrl: applyPeekToUrl,
    isBdcApiUrl: isBdcApiUrl,
  };

  // Auto-install as soon as this file loads so APIs get the peeked family, not Memberstack's
  if (peekTokenFromUrl()) {
    installPeekFetch();
  }
})();
