/*
Purpose: Admin portal peek gate for ?testMemberId= — Admin-minted peekToken; stamps token onto portal API calls.

Brief Logic: Exposes window.BdcPortalPeek.canPortalPeek() and installPeekFetch(). When peeking, forces every BDC API call (fetch / bdcFetch / XHR) onto URL testMemberId + peekToken so Memberstack's logged-in id cannot show the wrong family. Only BDC API hosts are touched.

dependent-files: window.BDC_API.member, optional bdcFetch, portal_new_ui / portal_staging / sidebar / announcement / payment_history / millions / credit_points / referrals

Webflow embed (dashboard bootstrap — memberId MUST prefer testMemberId):

  const params = new URLSearchParams(window.location.search);
  const testMemberId = params.get("testMemberId");
  const testAccountEmail = params.get("testAccountEmail");
  const testAccountType = params.get("testAccountType");
  const memberId = (window.BdcPortalPeek && window.BdcPortalPeek.resolveMemberId)
    ? window.BdcPortalPeek.resolveMemberId(webflowMemberId)
    : (testMemberId || webflowMemberId);

  if (testMemberId && window.BdcPortalPeek) {
    const allowed = await window.BdcPortalPeek.canPortalPeek();
    if (!allowed) {
      window.location.href = window.location.origin + "/portal/login-admit-account";
      return;
    }
  }

  // Pass memberId (and testAccountEmail) into Portal / Sidebar / Announcement data

Load this file on portal pages BEFORE portal_new_ui / portal_staging / other portal scripts.
Pin scripts by commit SHA in Webflow — do not rely on main merge.
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
    "getSemesterInvoiceDataV2",
    "getAllPreviousStudents",
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

  function testAccountEmailFromUrl() {
    try {
      return new URLSearchParams(window.location.search).get("testAccountEmail") || "";
    } catch (e) {
      return "";
    }
  }

  function testAccountTypeFromUrl() {
    try {
      return new URLSearchParams(window.location.search).get("testAccountType") || "";
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
        "/$1/" + peekMemberId
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

  /** Add peek header so APIs that ignore query still see the session. */
  function withPeekHeaders(init, token) {
    if (!token) return init;
    var next = init ? Object.assign({}, init) : {};
    var headers = next.headers;
    if (typeof Headers !== "undefined" && (headers instanceof Headers || !headers)) {
      var h = headers instanceof Headers ? new Headers(headers) : new Headers();
      if (!h.get("X-BDC-Peek-Token")) h.set("X-BDC-Peek-Token", token);
      next.headers = h;
      return next;
    }
    // Plain object headers
    var plain = {};
    if (headers && typeof headers === "object") {
      for (var k in headers) {
        if (Object.prototype.hasOwnProperty.call(headers, k)) plain[k] = headers[k];
      }
    }
    var hasPeek = Object.keys(plain).some(function (k) {
      return String(k).toLowerCase() === "x-bdc-peek-token";
    });
    if (!hasPeek) plain["X-BDC-Peek-Token"] = token;
    next.headers = plain;
    return next;
  }

  /**
   * @returns {Promise<boolean>}
   */
  async function canPortalPeek() {
    var token = peekTokenFromUrl();
    // Peek gate requires Admin-minted token — no Memberstack fallback here
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
      if (typeof window.bdcFetch === "function" && !window.bdcFetch.__bdcPeekWrapped) {
        fetchFn = window.bdcFetch;
      }
      var res = await fetchFn.call(window, url, {
        method: "GET",
        headers: { Accept: "application/json", "X-BDC-Peek-Token": token },
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

  function wrapFetchFn(original, token, peekMemberId) {
    var wrapped = function (input, init) {
      var nextInput = input;
      var nextInit = init;
      if (typeof input === "string") {
        nextInput = applyPeekToUrl(input, token, peekMemberId);
        nextInit = withPeekHeaders(init, token);
      } else if (input && typeof Request !== "undefined" && input instanceof Request) {
        nextInput = new Request(applyPeekToUrl(input.url, token, peekMemberId), input);
        nextInit = withPeekHeaders(init, token);
      }
      return original.call(this, nextInput, nextInit);
    };
    wrapped.__bdcPeekWrapped = true;
    return wrapped;
  }

  /** Stamp peekToken + correct memberId on fetch, late bdcFetch, and XHR. */
  function installPeekFetch() {
    var token = peekTokenFromUrl();
    var peekMemberId = testMemberIdFromUrl();
    // Require Admin peekToken — never monkey-patch fetch/XHR for normal Memberstack sessions
    if (!token || window.__bdcPeekFetchInstalled) return;
    window.__bdcPeekFetchInstalled = true;

    // portal_new_ui uses raw fetch
    if (typeof window.fetch === "function" && !window.fetch.__bdcPeekWrapped) {
      window.__bdcPeekOriginalFetch = window.fetch.bind(window);
      window.fetch = wrapFetchFn(window.__bdcPeekOriginalFetch, token, peekMemberId);
    }

    // bdcFetch may be assigned by Webflow after this file — wrap now and watch
    function ensureBdcFetchWrapped() {
      if (typeof window.bdcFetch !== "function" || window.bdcFetch.__bdcPeekWrapped) return;
      window.bdcFetch = wrapFetchFn(window.bdcFetch, token, peekMemberId);
    }
    ensureBdcFetchWrapped();
    var tries = 0;
    var timer = setInterval(function () {
      tries += 1;
      ensureBdcFetchWrapped();
      if (tries >= 60 || (typeof window.bdcFetch === "function" && window.bdcFetch.__bdcPeekWrapped)) {
        clearInterval(timer);
      }
    }, 50);

    // Invoice/checkout still use XMLHttpRequest — rewrite URL + stamp peek header
    if (!window.__bdcPeekXhrInstalled && typeof XMLHttpRequest !== "undefined") {
      window.__bdcPeekXhrInstalled = true;
      var originalOpen = XMLHttpRequest.prototype.open;
      var originalSetHeader = XMLHttpRequest.prototype.setRequestHeader;
      var originalSend = XMLHttpRequest.prototype.send;
      XMLHttpRequest.prototype.open = function (method, url) {
        var nextUrl = url;
        if (typeof url === "string") {
          nextUrl = applyPeekToUrl(url, token, peekMemberId);
          this._bdcPeekUrl = nextUrl;
        }
        var args = [method, nextUrl].concat(Array.prototype.slice.call(arguments, 2));
        return originalOpen.apply(this, args);
      };
      XMLHttpRequest.prototype.send = function (body) {
        try {
          if (token && this._bdcPeekUrl && isBdcApiUrl(this._bdcPeekUrl)) {
            originalSetHeader.call(this, "X-BDC-Peek-Token", token);
          }
        } catch (e) {
          /* header may already be set */
        }
        return originalSend.apply(this, arguments);
      };
    }
  }

  /** Mutate shared Webflow data when peeking (covers XHR bodies that read data.memberId). */
  function applyPeekMemberIdToData(data) {
    if (!data || typeof data !== "object") return data;
    var peekId = testMemberIdFromUrl();
    if (peekId) data.memberId = peekId;
    var email = testAccountEmailFromUrl();
    if (email) {
      // Announcement / forms read accountEmail from the embed data object
      data.accountEmail = email;
      if (!data.email) data.email = email;
    }
    var type = testAccountTypeFromUrl();
    if (type) data.accountType = type;
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

  // Only Admin-minted peekToken installs network wraps (normal portal traffic untouched)
  if (peekTokenFromUrl()) {
    installPeekFetch();
  }
})();
