/*
Purpose: Admin portal peek gate for ?testMemberId= — prefer Mongo/API, keep legacy ids if the API is down.

Brief Logic: Exposes window.BdcPortalPeek.canPortalPeek(loggedInMemberId). Call it from the Webflow page embed instead of a hardcoded-only allowlist. member-service canPortalPeek checks admin_users.memberstack_member_id (and SSM). Legacy ids are a production safety net only.

dependent-files: window.BDC_API.member, optional bdcFetch, Memberstack localStorage

Webflow embed change (replace the hardcode-only if):

  const testAdminMemberId = [...]; // remove once every peek admin is linked in Admin → Users
  // was: if (testMemberId && ... && !testAdminMemberId.includes(webflowMemberId)) redirect
  if (testMemberId && testAccountEmail && testAccountType) {
    const allowed = await window.BdcPortalPeek.canPortalPeek(webflowMemberId);
    if (!allowed) {
      window.location.href = "https://www.bergendebate.com/portal/login-admit-account";
      return;
    }
  }

Load this file on portal pages before the page bootstrap script (async DOMContentLoaded is fine if bootstrap awaits canPortalPeek).
*/

(function () {
  // Network / pre-deploy fallback only — matches prior Webflow embed + current SSM extras
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

  /**
   * @param {string} loggedInMemberId Memberstack id of the staffer on this browser
   * @returns {Promise<boolean>}
   */
  async function canPortalPeek(loggedInMemberId) {
    var base = (window.BDC_API && window.BDC_API.member) || "";
    if (!base) {
      return legacyAllows(loggedInMemberId);
    }
    var url = base.replace(/\/?$/, "/") + "canPortalPeek";
    var headers = { Accept: "application/json" };

    try {
      var fetchFn = typeof bdcFetch === "function" ? bdcFetch : fetch;
      var res = await fetchFn(url, { method: "GET", headers: headers, credentials: "omit" });
      if (!res.ok) {
        // Keep peeks working if the new Lambda is not live yet
        return legacyAllows(loggedInMemberId);
      }
      var data = await res.json();
      if (data && data.allowed === true) return true;
      // API denied, or no Bearer yet — legacy list covers current production peeks
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
