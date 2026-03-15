import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms and Conditions — Tell Me When',
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16 text-sm text-foreground">
      <h1 className="text-2xl font-bold mb-6">Terms and Conditions</h1>
      <p className="text-muted-foreground mb-4">Last updated: 11 March 2026</p>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold mt-6">1. Acceptance of Terms</h2>
        <p>
          By using Tell Me When (&quot;the App&quot;), you agree to these terms and conditions. If you do not agree, please do not use the App.
        </p>

        <h2 className="text-lg font-semibold mt-6">2. Description of Service</h2>
        <p>
          Tell Me When is a notification service that allows you to track artists, movies, stocks, cryptocurrencies, weather, and other categories, and receive alerts when relevant events occur. The App retrieves data from third-party sources and delivers it to you via in-app alerts and push notifications.
        </p>

        <h2 className="text-lg font-semibold mt-6">3. Account</h2>
        <p>
          You are responsible for maintaining the security of your account credentials. You must provide accurate information when creating your account. We reserve the right to suspend or terminate accounts that violate these terms.
        </p>

        <h2 className="text-lg font-semibold mt-6">4. Acceptable Use</h2>
        <p>You agree not to:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Use the App for any unlawful purpose</li>
          <li>Attempt to interfere with or disrupt the service</li>
          <li>Reverse engineer, decompile, or disassemble the App</li>
          <li>Use automated means to access the service beyond normal usage</li>
        </ul>

        <h2 className="text-lg font-semibold mt-6">5. Third-Party Data</h2>
        <p>
          The App displays data sourced from third-party services including Ticketmaster, iTunes, TMDB, and others. We do not guarantee the accuracy, completeness, or timeliness of this data. Alert delivery depends on the availability of these third-party services.
        </p>

        <h2 className="text-lg font-semibold mt-6">6. No Financial Advice</h2>
        <p>
          Alerts related to stocks, cryptocurrencies, and currencies are for informational purposes only and do not constitute financial advice. You should not make investment decisions based solely on information provided by the App.
        </p>

        <h2 className="text-lg font-semibold mt-6">7. Availability</h2>
        <p>
          We aim to keep the App available at all times but do not guarantee uninterrupted service. We may modify, suspend, or discontinue any part of the service at any time without notice.
        </p>

        <h2 className="text-lg font-semibold mt-6">8. Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by law, Tell Me When and its developer shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the App, including missed alerts, inaccurate data, or service interruptions.
        </p>

        <h2 className="text-lg font-semibold mt-6">9. Intellectual Property</h2>
        <p>
          All content, design, and code in the App are the property of the developer unless otherwise noted. Third-party trademarks and data belong to their respective owners.
        </p>

        <h2 className="text-lg font-semibold mt-6">10. Changes to Terms</h2>
        <p>
          We may update these terms from time to time. Continued use of the App after changes constitutes acceptance of the updated terms.
        </p>

        <h2 className="text-lg font-semibold mt-6">11. Governing Law</h2>
        <p>
          These terms are governed by the laws of Australia. Any disputes shall be resolved in the courts of Victoria, Australia.
        </p>

        <h2 className="text-lg font-semibold mt-6">12. Contact</h2>
        <p>
          If you have any questions about these terms, please contact us at{' '}
          <a href="mailto:robert.sheahan@gmail.com" className="text-primary hover:underline">
            robert.sheahan@gmail.com
          </a>.
        </p>
      </section>
    </div>
  );
}
