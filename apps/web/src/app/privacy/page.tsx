import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy — Tell Me When',
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16 text-sm text-foreground">
      <h1 className="text-2xl font-bold mb-6">Privacy Policy</h1>
      <p className="text-muted-foreground mb-4">Last updated: 11 March 2026</p>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold mt-6">1. Information We Collect</h2>
        <p>
          When you create an account, we collect your email address and, optionally, your name. We also collect information about the items you choose to track (such as artist names, stock symbols, or city names) to provide you with relevant alerts.
        </p>
        <p>
          If you enable push notifications, we store a device token to deliver notifications to your device. We do not collect precise location data.
        </p>

        <h2 className="text-lg font-semibold mt-6">2. How We Use Your Information</h2>
        <p>We use your information to:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Provide and operate the Tell Me When service</li>
          <li>Send you alerts and push notifications about items you track</li>
          <li>Authenticate your account</li>
          <li>Improve and maintain the service</li>
        </ul>

        <h2 className="text-lg font-semibold mt-6">3. Third-Party Services</h2>
        <p>
          We use the following third-party services to operate Tell Me When:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>Supabase</strong> — authentication and database hosting</li>
          <li><strong>Expo</strong> — push notification delivery</li>
          <li><strong>Vercel</strong> — web application hosting</li>
          <li><strong>Ticketmaster, SerpAPI, iTunes, TMDB, and other APIs</strong> — to fetch event and media data for your tracked items</li>
        </ul>
        <p>
          We do not sell, rent, or share your personal information with third parties for marketing purposes.
        </p>

        <h2 className="text-lg font-semibold mt-6">4. Data Storage and Security</h2>
        <p>
          Your data is stored securely using Supabase, which provides encryption at rest and in transit. We implement row-level security policies to ensure users can only access their own data.
        </p>

        <h2 className="text-lg font-semibold mt-6">5. Data Retention</h2>
        <p>
          We retain your account data for as long as your account is active. You can delete your account and associated data at any time by contacting us.
        </p>

        <h2 className="text-lg font-semibold mt-6">6. Your Rights</h2>
        <p>You have the right to:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Access the personal data we hold about you</li>
          <li>Request correction of inaccurate data</li>
          <li>Request deletion of your data</li>
          <li>Withdraw consent for push notifications at any time via your device settings</li>
        </ul>

        <h2 className="text-lg font-semibold mt-6">7. Children&apos;s Privacy</h2>
        <p>
          Tell Me When is not directed at children under 13. We do not knowingly collect personal information from children under 13.
        </p>

        <h2 className="text-lg font-semibold mt-6">8. Changes to This Policy</h2>
        <p>
          We may update this privacy policy from time to time. We will notify you of any material changes by posting the updated policy within the app or on our website.
        </p>

        <h2 className="text-lg font-semibold mt-6">9. Contact</h2>
        <p>
          If you have any questions about this privacy policy, please contact us at{' '}
          <a href="mailto:robert.sheahan@gmail.com" className="text-primary hover:underline">
            robert.sheahan@gmail.com
          </a>.
        </p>
      </section>
    </div>
  );
}
