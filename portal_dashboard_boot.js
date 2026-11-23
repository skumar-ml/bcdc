/*
Purpose: Start the dashboard Portal for Admin peek OR normal Memberstack login.

Brief Logic: Replaces the broken Webflow inline script that required Memberstack and
read local-only testMemberId/globalMemberId (ReferenceError). Memberstack login is
always required; peekToken only switches which family Portal loads.

Sidebar embed is shared across every portal page, so this file also loads on
payment-history / millions / etc. Those pages do not load Portal — exit quietly
and let that page's own boot (e.g. PaymentHistory.bootFromWebflow) own the page.

dependent-files: portal_admin_peek.js (before this), portal_new_ui.js (Portal class),
window.BDC_API.member / communication

Webflow: on dashboard, load AFTER portal_new_ui.js. Safe to leave in the shared
sidebar symbol on other portal pages.

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

  // Save peek URL so Memberstack can return here after login
  function redirectToMemberstackLogin() {
    try {
      localStorage.setItem("redirect_url", window.location.href);
    } catch (e) {
      /* ignore */
    }
    window.location.href = window.location.origin + "/log-in";
  }

  function startPortal(memberId, accountEmail) {
    if (typeof Portal !== "function") {
      // Shared sidebar runs this on non-dashboard pages — not an error
      return;
    }
    if (!memberId) {
      console.error("portal_dashboard_boot: memberId missing");
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
    // Shared sidebar embed: skip entirely when this is not the dashboard page
    if (typeof Portal !== "function") {
      return;
    }

    var testMemberId = qs("testMemberId");
    var testAccountEmail = qs("testAccountEmail");
    var peekToken = qs("peekToken");
    var isPeek = Boolean(testMemberId && peekToken);

    // Never run portal boot on the peek-deny page (avoids Failed to fetch spam)
    if ((window.location.pathname || "").indexOf("login-admit-account") !== -1) {
      return;
    }

    // Client promise: Memberstack login always required (peek only switches family data)
    var ms = memberstackInfo();
    var msId = ms && ms.information && ms.information.id;
    if (!msId) {
      redirectToMemberstackLogin();
      return;
    }

    if (isPeek) {
      if (!window.BdcPortalPeek) {
        console.error("portal_dashboard_boot: portal_admin_peek.js must load first");
        redirectToMemberstackLogin();
        return;
      }
      var allowed = await window.BdcPortalPeek.canPortalPeek();
      if (!allowed) {
        // Real deny (expired/invalid token) — unlock guard then go to login-admit
        console.warn("portal_dashboard_boot: peek denied (expired token or canPortalPeek failed)");
        if (typeof window.BdcPortalPeek.allowDenyRedirect === "function") {
          window.BdcPortalPeek.allowDenyRedirect();
        }
        window.location.href = window.location.origin + "/portal/login-admit-account";
        return;
      }
      window.BdcPortalPeek.installPeekFetch();
      // Logged-in staff session required above; load the peeked family from the URL
      startPortal(testMemberId, testAccountEmail);
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
