
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function PrivacyPolicyPage() {
  return (
    <div className="container mx-auto max-w-4xl py-16 md:py-24">
      <Card>
        <CardHeader>
          <CardTitle className="text-4xl md:text-5xl font-extrabold tracking-tight">Privacy Policy</CardTitle>
        </CardHeader>
        <CardContent>
            <div className="prose prose-invert max-w-none">
                <p>Last updated: July 28, 2024</p>

                <p>
                QAgent ("us", "we", or "our") operates the QAgent website (the "Service"). This page informs you of our policies regarding the collection, use, and disclosure of personal data when you use our Service and the choices you have associated with that data.
                </p>

                <h2 className="text-xl font-semibold mb-4">Information Collection And Use</h2>
                <p className="mb-4">
                We collect several different types of information for various purposes to provide and improve our Service to you.
                </p>
                
                <h3 className="text-lg font-semibold mb-2">Types of Data Collected</h3>
                <h4 className="text-md font-medium mb-2">Personal Data</h4>
                <p className="mb-4">
                While using our Service, we may ask you to provide us with certain personally identifiable information that can be used to contact or identify you ("Personal Data").
                </p>
                <ul>
                <li>Email address</li>
                <li>First name and last name</li>
                <li>Data provided to our AI tools (e.g., health data, financial profile, culinary queries)</li>
                <li>Cookies and Usage Data</li>
                </ul>

                <h4>Usage Data</h4>
                <p>
                We may also collect information on how the Service is accessed and used ("Usage Data"). This Usage Data may include information such as your computer's Internet Protocol address (e.g. IP address), browser type, browser version, the pages of our Service that you visit, the time and date of your visit, the time spent on those pages, unique device identifiers and other diagnostic data.
                </p>

                <h2>Use of Data</h2>
                <p>Francis Legacy uses the collected data for various purposes:</p>
                <ul>
                <li>To provide and maintain the Service</li>
                <li>To power and improve our AI features</li>
                <li>To notify you about changes to our Service</li>
                <li>To allow you to participate in interactive features of our Service when you choose to do so</li>
                <li>To provide customer care and support</li>
                <li>To provide analysis or valuable information so that we can improve the Service</li>
                <li>To monitor the usage of the Service</li>
                <li>To detect, prevent and address technical issues</li>
                </ul>

                <h2>Security of Data</h2>
                <p>
                The security of your data is important to us, but remember that no method of transmission over the Internet, or method of electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your Personal Data, we cannot guarantee its absolute security.
                </p>

                <h2>Service Providers</h2>
                <p>
                We may employ third party companies and individuals to facilitate our Service ("Service Providers"), to provide the Service on our behalf, to perform Service-related services or to assist us in analyzing how our Service is used. These third parties have access to your Personal Data only to perform these tasks on our behalf and are obligated not to disclose or use it for any other purpose.
                </p>

                <h2>Links to Other Sites</h2>
                <p>
                Our Service may contain links to other sites that are not operated by us. If you click on a third party link, you will be directed to that third party's site. We strongly advise you to review the Privacy Policy of every site you visit. We have no control over and assume no responsibility for the content, privacy policies or practices of any third party sites or services.
                </p>
                
                <h2>Changes to This Privacy Policy</h2>
                <p>
                We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page. We will let you know via email and/or a prominent notice on our Service, prior to the change becoming effective and update the "last updated" date at the top of this Privacy Policy. You are advised to review this Privacy Policy periodically for any changes. Changes to this Privacy Policy are effective when they are posted on this page.
                </p>

                <h2>Contact Us</h2>
                <p>If you have any questions about this Privacy Policy, please contact us:</p>
                <ul>
                <li>By visiting our contact page: <a href="/contact" className="text-primary hover:underline">Contact Us</a></li>
                </ul>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
