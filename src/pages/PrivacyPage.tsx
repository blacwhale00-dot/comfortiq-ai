import Layout from "@/components/Layout";

export default function PrivacyPage() {
  return (
    <Layout>
      <section className="py-16 md:py-24">
        <div className="container max-w-3xl">
          <h1 className="text-3xl md:text-4xl font-display font-extrabold text-foreground mb-2">
            Privacy Policy
          </h1>
          <p className="text-muted-foreground text-sm mb-10">Last updated: March 13, 2026</p>

          <div className="space-y-8 text-muted-foreground leading-relaxed text-sm">
            <div>
              <h2 className="text-lg font-display font-bold text-foreground mb-2">1. Information We Collect</h2>
              <p>When you use ComfortIQ.AI, we may collect the following information:</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li><strong className="text-foreground">Personal Information:</strong> Name, email address, phone number, and home address provided during the comfort assessment.</li>
                <li><strong className="text-foreground">Home &amp; System Data:</strong> HVAC system age, square footage, number of systems, and comfort challenges you select.</li>
                <li><strong className="text-foreground">Photos:</strong> Images of your outdoor AC unit, breaker panel, thermostat, and electric bill uploaded during the missions stage.</li>
                <li><strong className="text-foreground">Usage Data:</strong> Pages visited, time spent, browser type, and device information collected automatically.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-lg font-display font-bold text-foreground mb-2">2. How We Use Your Information</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>To generate your personalized comfort assessment and pricing estimate.</li>
                <li>To calculate and apply photo-based discounts to your estimate.</li>
                <li>To connect you with qualified HVAC professionals in your area.</li>
                <li>To send you your estimate, solar savings report, and follow-up communications.</li>
                <li>To improve our AI models and overall user experience.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-lg font-display font-bold text-foreground mb-2">3. Information Sharing</h2>
              <p>We do not sell your personal information. We may share your data with:</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li><strong className="text-foreground">Service Partners:</strong> Licensed HVAC contractors in your area to fulfill your consultation request.</li>
                <li><strong className="text-foreground">Service Providers:</strong> Third-party tools that help us operate, such as hosting, analytics, and email delivery.</li>
                <li><strong className="text-foreground">Legal Requirements:</strong> When required by law, regulation, or legal process.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-lg font-display font-bold text-foreground mb-2">4. Data Security</h2>
              <p>
                We use industry-standard encryption and security measures to protect your personal information. Your data is stored on secure, encrypted servers and access is limited to authorized personnel only.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-display font-bold text-foreground mb-2">5. Cookies &amp; Tracking</h2>
              <p>
                We use cookies and similar technologies to remember your preferences, track your progress through the assessment, and analyze site usage. You can manage cookie preferences through your browser settings.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-display font-bold text-foreground mb-2">6. Your Rights</h2>
              <p>You have the right to:</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Access, correct, or delete your personal information.</li>
                <li>Opt out of marketing communications at any time.</li>
                <li>Request a copy of the data we hold about you.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-lg font-display font-bold text-foreground mb-2">7. Data Retention</h2>
              <p>
                We retain your personal information for as long as necessary to provide our services and fulfill the purposes described in this policy. Assessment data is retained for up to 24 months after your last interaction.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-display font-bold text-foreground mb-2">8. Children's Privacy</h2>
              <p>
                ComfortIQ.AI is not intended for use by individuals under the age of 18. We do not knowingly collect personal information from children.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-display font-bold text-foreground mb-2">9. Changes to This Policy</h2>
              <p>
                We may update this privacy policy from time to time. We will notify you of any material changes by posting the updated policy on this page with a revised "Last updated" date.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-display font-bold text-foreground mb-2">10. Contact Us</h2>
              <p>
                If you have questions about this privacy policy or your personal data, please contact us at{" "}
                <a href="mailto:privacy@comfortiq.ai" className="text-primary hover:underline">privacy@comfortiq.ai</a>.
              </p>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
