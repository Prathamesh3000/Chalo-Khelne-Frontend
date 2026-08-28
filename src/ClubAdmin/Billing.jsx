import BillingPage from "../shared/billing/BillingPage";

// Thin wrapper: the server decides which plans a club sees from its billing
// subject type, so there is nothing club-specific to configure here.
export default function ClubBilling() {
  return <BillingPage title="Plan & Billing" />;
}
