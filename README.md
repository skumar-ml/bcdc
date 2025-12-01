# BCDC Scripts

This folder contains utility scripts used by BCDC, including checkout customizations, abandoned cart modals, portal management, class listings, and reward system integrations.

## Used File and Description
- `abandoned-cart-modal.js` – Client-side modal logic that detects stale checkout data and nudges members to recover their cart.
- `announcement.js` – Handles announcement display and management within the portal interface.
- `bdc-programs-checkout.css` – Styling for BCDC program checkout pages and components.
- `brief-checkout.js` – Checkout flow for briefs that fetches topic details, handles previews, and processes payments.
- `check-member.js` – Lightweight membership verifier that hits the checkMemberExist API and fills status fields.
- `checkout_summer_bundle.js` – Full checkout experience for summer bundle programs with session selection, location filtering, and Stripe payment integration.
- `class_details_stripe_bundle.js` – Class detail page handler for bundle purchases with Stripe payment processing.
- `class_details_stripe_staging.js` – Staging version of class details page with Stripe integration for testing.
- `class_list.js` – Dynamic class listing that fetches class details from API and renders times, days, and locations on the class list page.
- `credit_points.js` – Credit balance manager that displays member credit balance, transaction history, and credit point details.
- `dd_invoices.js` – Invoice management handler for direct debit invoices and payment processing.
- `instructor-attendance.js` – Instructor-facing attendance tracking system for managing student check-ins.
- `make_up_session.js` – Manages make-up session scheduling and availability for students.
- `millions-coach.js` – Coach-facing interface for managing millions program transactions and data.
- `millions.js` – Renders millions transaction data, displays transaction history, and manages millions program UI.
- `notification-count.js` – Fetches unread notifications and injects the badge count beside the bell icon.
- `notification.js` – Full notification center with filtering, pagination, and read/unread tracking.
- `payment_confirmation_v2.js` – Success-page logic that reads query params, shows supplementary upsells, and resets checkout UI states.
- `payment_history.js` – Displays member payment history with transaction details and status.
- `portal_new_ui.js` – Primary BCDC portal experience that aggregates forms, invoices, briefs, class details, and supplementary data with modern UI.
- `portal_staging.js` – Staging version of the portal for testing new features and updates.
- `portal_upsell_program.js` – Supplementary program carousel/slider that fetches offerings, handles payments, and updates student pricing.
- `portal-briefs.js` – Portal component for managing brief downloads, previews, and subscription upsells from API data.
- `progessbar.css` – Dedicated CSS for the onboarding progress bar widget.
- `progressbarDenver.css` – Denver-specific styling for progress bar components.
- `referrals_modal.js` – Modal handler for referral program interactions and code sharing.
- `referrals.js` – Referral program manager that displays referral codes, tracks referrals, and manages referral rewards.
- `reward-store.js` – Reward store interface that displays millions transactions and redeemable items with filtering and pagination.
- `sidebar.js` – Sidebar navigation component for portal menu and navigation controls.
- `signInActivity.js` – Simple logger that posts member sign-in activity to the backend.
- `trial_class_details.js` – Trial class detail page handler that displays trial class information and handles registration.
- `utils.js` – Utility functions and helper methods used across BCDC scripts.
