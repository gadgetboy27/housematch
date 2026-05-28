import { Link } from "wouter";
import { Mail, HelpCircle, FileText, Users } from "lucide-react";

const SUPPORT_EMAIL = "support@housematch.co.nz";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Company Info */}
          <div>
            <h3 className="font-semibold text-lg mb-3">HouseMatch NZ</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              The smarter way to discover and purchase New Zealand properties.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-lg mb-3">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link 
                  href="/help" 
                  className="text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-2"
                  data-testid="link-footer-help"
                >
                  <HelpCircle className="h-4 w-4" />
                  Help & Support
                </Link>
              </li>
              <li>
                <Link 
                  href="/reports" 
                  className="text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-2"
                  data-testid="link-footer-reports"
                >
                  <FileText className="h-4 w-4" />
                  Property Reports
                </Link>
              </li>
              <li>
                <Link 
                  href="/partner/signup" 
                  className="text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-2"
                  data-testid="link-footer-partners"
                >
                  <Users className="h-4 w-4" />
                  Become a Partner
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold text-lg mb-3">Contact Us</h3>
            <div className="space-y-2">
              <a 
                href={`mailto:${SUPPORT_EMAIL}`}
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-2"
                data-testid="link-footer-email"
              >
                <Mail className="h-4 w-4" />
                {SUPPORT_EMAIL}
              </a>
              <p className="text-xs text-gray-500 dark:text-gray-500">
                Response time: 24-48 hours
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-200 dark:border-gray-800 mt-8 pt-6 text-center text-sm text-gray-600 dark:text-gray-400">
          <p>© {currentYear} HouseMatch NZ. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
