/* ============================================================
   PREMIUMPAGE.JS — Nexus "Everything is free" page
   Replaces the old LinkedIn Premium upsell.
   Route still exists so old links don't 404; redirects to feed.
   ============================================================ */
function PremiumPage() {
  // Redirect away — this page no longer exists as a premium upsell
  React.useEffect(() => {
    navigate('feed');
  }, []);
  return null;
}
