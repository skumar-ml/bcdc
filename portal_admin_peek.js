/*
Purpose: Admin portal peek gate for ?testMemberId= — Admin-minted peekToken; stamps token onto portal API calls.

Brief Logic: Exposes window.BdcPortalPeek.canPortalPeek() and installPeekFetch(). When peeking, forces every BDC API call (fetch / bdcFetch / XHR) onto URL testMemberId + peekToken so Memberstack's logged-in id cannot show the wrong family. Only BDC API hosts are touched. Memberstack website login is still required; peek only switches which family is loaded.

dependent-files: window.BDC_API.member, optional bdcFetch, portal_new_ui / portal_staging / sidebar / announcement / payment_history / millions / credit_points / referrals

Webflow (required):
  1) Load this file, then sidebar/utils, then portal_new_ui.js, then portal_dashboard_boot.js
  2) DELETE the inline script under portal_new_ui that does `if (memberstack) new Portal` / else redirect log-in
  3) In the Sidebar DOMContentLoaded embed, set window.globalMemberId = testMemberId || webflowMemberId
     (locals alone cause ReferenceError in Portal / portal_new_ui)

Pin all of these to the SAME commit SHA via jsDelivr.
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

  /** Prefer URL testMemberId only during a real Admin peek (token required). */
  function resolveMemberId(fallback) {
    var peekId = testMemberIdFromUrl();
    if (peekId && peekTokenFromUrl()) return peekId;
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
    if (!token) {
      console.warn("canPortalPeek: no peekToken in URL");
      return false;
    }

    // Wait briefly for Webflow head embed to define BDC_API
    var base = "";
    for (var i = 0; i < 40; i++) {
      base = (window.BDC_API && window.BDC_API.member) || "";
      if (base) break;
      await new Promise(function (r) {
        setTimeout(r, 50);
      });
    }
    if (!base) {
      console.warn("canPortalPeek: window.BDC_API.member missing");
      return false;
    }

    var testMemberId = testMemberIdFromUrl();
    var url =
      base.replace(/\/?$/, "/") +
      "canPortalPeek?peekToken=" +
      encodeURIComponent(token);
    if (testMemberId) {
      url += "&testMemberId=" + encodeURIComponent(testMemberId);
    }

    try {
      // Query-only gate: API Gateway CORS does not allow X-BDC-Peek-Token, so a
      // custom header here fails preflight and falsely redirects to login-admit.
      var fetchFn = window.__bdcPeekOriginalFetch || window.fetch;
      var res = await fetchFn.call(window, url, {
        method: "GET",
        credentials: "omit",
      });
      if (!res.ok) {
        console.warn("canPortalPeek: HTTP", res.status);
        return false;
      }
      var data = await res.json();
      var ok = !!(data && data.allowed === true);
      if (!ok) console.warn("canPortalPeek: allowed=false (expired token or wrong family)");
      return ok;
    } catch (e) {
      console.warn("canPortalPeek failed", e);
      return false;
    }
  }

  function wrapFetchFn(original, token, peekMemberId) {
    var wrapped = function (input, init) {
      var nextInput = input;
      // Stamp peekToken on the URL only — custom headers trip CORS on camp APIs
      if (typeof input === "string") {
        nextInput = applyPeekToUrl(input, token, peekMemberId);
      } else if (input && typeof Request !== "undefined" && input instanceof Request) {
        nextInput = new Request(applyPeekToUrl(input.url, token, peekMemberId), input);
      }
      return original.call(this, nextInput, init);
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
      // peekToken already on the rewritten URL — do not set X-BDC-Peek-Token (CORS)
      XMLHttpRequest.prototype.send = function (body) {
        return originalSend.apply(this, arguments);
      };
    }
  }

  /**
   * Only blocks a premature bounce to login-admit while peekToken is still validating.
   * Does NOT block /log-in — Memberstack login stays required (matches client promise).
   */
  function installLegacyRedirectGuard() {
    if (!peekTokenFromUrl() || !testMemberIdFromUrl()) return;
    if (window.__bdcPeekRedirectGuard) return;
    window.__bdcPeekRedirectGuard = true;
    window.__bdcPeekDenyRedirectAllowed = false;

    function shouldBlock(url) {
      try {
        var path = new URL(String(url), window.location.origin).pathname.toLowerCase();
        // Keep peek on-screen only against false login-admit races; /log-in must work
        if (path.indexOf("login-admit-account") !== -1) {
          return !window.__bdcPeekDenyRedirectAllowed;
        }
        return false;
      } catch (e) {
        return false;
      }
    }

    function allowOrRun(url, run) {
      if (shouldBlock(url)) {
        console.warn("BdcPortalPeek: blocked legacy redirect during peek", url);
        return;
      }
      return run();
    }

    try {
      var proto = Location.prototype;
      ["assign", "replace"].forEach(function (name) {
        var orig = proto[name];
        if (typeof orig !== "function") return;
        proto[name] = function (url) {
          var ctx = this;
          var args = arguments;
          return allowOrRun(url, function () {
            return orig.apply(ctx, args);
          });
        };
      });
      var desc = Object.getOwnPropertyDescriptor(proto, "href");
      if (desc && desc.set) {
        Object.defineProperty(proto, "href", {
          configurable: true,
          enumerable: desc.enumerable,
          get: desc.get,
          set: function (v) {
            var setter = desc.set;
            var ctx = this;
            allowOrRun(v, function () {
              setter.call(ctx, v);
            });
          },
        });
      }
    } catch (e) {
      console.warn("BdcPortalPeek: redirect guard failed", e);
    }
  }

  function allowDenyRedirect() {
    window.__bdcPeekDenyRedirectAllowed = true;
  }

  /** Mutate shared Webflow data when peeking (covers XHR bodies that read data.memberId). */
  function applyPeekMemberIdToData(data) {
    if (!data || typeof data !== "object") return data;
    // Never override a normal Memberstack session from a stray testMemberId query
    if (!peekTokenFromUrl()) return data;
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
    allowDenyRedirect: allowDenyRedirect,
    peekTokenFromUrl: peekTokenFromUrl,
    testMemberIdFromUrl: testMemberIdFromUrl,
    resolveMemberId: resolveMemberId,
    applyPeekMemberIdToData: applyPeekMemberIdToData,
    withPeekQuery: withPeekQuery,
    withPeekMemberId: withPeekMemberId,
    applyPeekToUrl: applyPeekToUrl,
    isBdcApiUrl: isBdcApiUrl,
  };

  // Publish peek ids on window early so Portal bootstrap / portal_new_ui can read them
  // (Webflow had these as locals inside DOMContentLoaded → ReferenceError)
  (function publishPeekGlobals() {
    // Require peekToken so normal logins are never overwritten by a leftover query param
    var peekId = testMemberIdFromUrl();
    if (!peekId || !peekTokenFromUrl()) return;
    window.testMemberId = peekId;
    window.globalMemberId = peekId;
    var email = testAccountEmailFromUrl();
    if (email) window.globalAccountEmail = email;
    var type = testAccountTypeFromUrl();
    if (type) window.globalAccountType = type;
  })();

  // Block premature login-admit only; Memberstack /log-in redirects stay allowed
  installLegacyRedirectGuard();

  // Only Admin-minted peekToken installs network wraps (normal portal traffic untouched)
  if (peekTokenFromUrl()) {
    installPeekFetch();
  }
})();
