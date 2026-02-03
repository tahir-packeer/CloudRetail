import React from 'react';
import { Link } from 'react-router-dom';
import { Package, Mail, Phone, MapPin, Facebook, Twitter, Instagram, Linkedin } from 'lucide-react';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-gray-300 mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div>
            <Link to="/" className="flex items-center gap-2 mb-4">
              <Package className="text-blue-500" size={32} />
              <span className="text-white text-xl font-bold">CloudRetail</span>
            </Link>
            <p className="text-sm text-gray-400 mb-4">
              Your trusted online marketplace for quality products from verified sellers.
            </p>
            <div className="flex gap-4">
              <a href="#" className="text-gray-400 hover:text-blue-500 transition-colors">
                <Facebook size={20} />
              </a>
              <a href="#" className="text-gray-400 hover:text-blue-500 transition-colors">
                <Twitter size={20} />
              </a>
              <a href="https://www.instagram.com/tahirpackeer/" className="text-gray-400 hover:text-blue-500 transition-colors">
                <Instagram size={20} />
              </a>
              <a href="https://www.linkedin.com/in/tahirpackeer/" className="text-gray-400 hover:text-blue-500 transition-colors">
                <Linkedin size={20} />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-sm hover:text-blue-500 transition-colors">
                  Shop
                </Link>
              </li>
              <li>
                <Link to="/seller" className="text-sm hover:text-blue-500 transition-colors">
                  Become a Seller
                </Link>
              </li>
              <li>
                <a href="#" className="text-sm hover:text-blue-500 transition-colors">
                  About Us
                </a>
              </li>
              <li>
                <a href="#" className="text-sm hover:text-blue-500 transition-colors">
                  Contact
                </a>
              </li>
            </ul>
          </div>

          {/* Customer Service */}
          <div>
            <h3 className="text-white font-semibold mb-4">Customer Service</h3>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-sm hover:text-blue-500 transition-colors">
                  Help Center
                </a>
              </li>
              <li>
                <a href="#" className="text-sm hover:text-blue-500 transition-colors">
                  Shipping Info
                </a>
              </li>
              <li>
                <a href="#" className="text-sm hover:text-blue-500 transition-colors">
                  Returns & Refunds
                </a>
              </li>
              <li>
                <a href="#" className="text-sm hover:text-blue-500 transition-colors">
                  Terms & Conditions
                </a>
              </li>
              <li>
                <a href="#" className="text-sm hover:text-blue-500 transition-colors">
                  Privacy Policy
                </a>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-white font-semibold mb-4">Contact Us</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <MapPin size={18} className="text-blue-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm">Raddolugama Housing Scheme</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone size={18} className="text-blue-500 flex-shrink-0" />
                <span className="text-sm">+(94) 73-533-9382</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail size={18} className="text-blue-500 flex-shrink-0" />
                <a href="tahirpackeer.com" className="text-sm hover:text-blue-500 transition-colors">
                  tahirpackeer@gmail.com.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-gray-400">
            © {currentYear} CloudRetail. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm">
            <a href="#" className="hover:text-blue-500 transition-colors">
              Privacy
            </a>
            <a href="#" className="hover:text-blue-500 transition-colors">
              Terms
            </a>
            <a href="#" className="hover:text-blue-500 transition-colors">
              Cookies
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
