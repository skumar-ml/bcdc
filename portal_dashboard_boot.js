/*
Purpose: Start the dashboard Portal for Admin peek OR normal Memberstack login.

Brief Logic: Replaces the broken Webflow inline script that required Memberstack and
read local-only testMemberId/globalMemberId (ReferenceError). Peek runs without login;
normal members still need Memberstack.

dependent-files: portal_admin_peek.js (before this), portal_new_ui.js (Portal class),
window.BDC_API.member / communication

Webflow: remove the inline script under portal_new_ui.js that does
`if (memberstack) { ... new Portal ... } else { redirect log-in }`.
Load this file instead, AFTER portal_new_ui.js:

  <script src="https://cdn.jsdelivr.net/gh/sk1840939/bcdc@COMMIT/portal_admin_peek.js"></script>
  ... sidebar / utils ...
  <script src="https://cdn.jsdelivr.net/gh/sk1840939/bcdc@COMMIT/portal_new_ui.js"></script>
  <script src="https://cdn.jsdelivr.net/gh/sk1840939/bcdc@COMMIT/portal_dashboard_boot.js"></script>
*/

(function () {
  function qs(name) {
    try {
      return new URLSearchParams(window.location.search).get(name) || "";
    } catch (e) {
      return "";
    }
  }

  function memberstackInfo() {
    try {
      var raw = localStorage.getItem("memberstack");
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      return parsed && parsed.information ? parsed : null;
    } catch (e) {
      return null;
    }
  }

  function startPortal(memberId, accountEmail) {
    if (!memberId || typeof Portal !== "function") {
      console.error("portal_dashboard_boot: Portal class or memberId missing", memberId);
      return;
    }
    if (window.__bdcPortalStarted) return;
    window.__bdcPortalStarted = true;

    // Keep portal_new_ui helpers that read window.globalMemberId working
    window.globalMemberId = memberId;
    if (accountEmail) window.globalAccountEmail = accountEmail;

    var data = {
      accountEmail: accountEmail || "",
      memberId: memberId,
      typeBApiBaseURL: window.BDC_API && window.BDC_API.communication,
      apiBaseURL: window.BDC_API && window.BDC_API.member,
    };
    // Admin peek: force peeked family onto shared data object
    if (window.BdcPortalPeek && typeof window.BdcPortalPeek.applyPeekMemberIdToData === "function") {
      window.BdcPortalPeek.applyPeekMemberIdToData(data);
    }
    new Portal(data);
    if (typeof checkMember === "function") {
      new checkMember(memberId);
    }
    if (window.Utils && typeof Utils.handleBergenCreditsModal === "function") {
      Utils.handleBergenCreditsModal(memberId);
    }
  }

  async function boot() {
    var testMemberId = qs("testMemberId");
    var testAccountEmail = qs("testAccountEmail");
    var peekToken = qs("peekToken");
    var isPeek = Boolean(testMemberId && peekToken);

    if (isPeek) {
      if (!window.BdcPortalPeek) {
        console.error("portal_dashboard_boot: portal_admin_peek.js must load first");
        window.location.href = window.location.origin + "/log-in";
        return;
      }
      var allowed = await window.BdcPortalPeek.canPortalPeek();
      if (!allowed) {
        window.location.href = window.location.origin + "/portal/login-admit-account";
        return;
      }
      window.BdcPortalPeek.installPeekFetch();
      // Peek does not need Memberstack — start Portal on the URL family
      startPortal(testMemberId, testAccountEmail);
      return;
    }

    // Normal portal: Memberstack required
    var ms = memberstackInfo();
    var msId = ms && ms.information && ms.information.id;
    if (!msId) {
      window.location.href = window.location.origin + "/log-in";
      return;
    }
    startPortal(msId, (ms && ms.email) || "");

    var firstName = ms.information["first-name"];
    var lastName = ms.information["last-name"];
    if (firstName && lastName) {
      document.querySelectorAll(".portal-node-title.welcome").forEach(function (elem) {
        elem.textContent = "Welcome, " + firstName + " " + lastName;
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      boot().catch(function (e) {
        console.error("portal_dashboard_boot failed", e);
      });
    });
  } else {
    boot().catch(function (e) {
      console.error("portal_dashboard_boot failed", e);
    });
  }
})();
