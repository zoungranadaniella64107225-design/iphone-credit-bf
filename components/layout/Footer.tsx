import Link from "next/link";
import { Smartphone, Phone, Mail, MapPin } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-primary-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Logo + Description */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="bg-primary-500 p-2 rounded-xl">
                <Smartphone className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold">iPhone Credit BF</span>
            </div>
            <p className="text-primary-200 text-sm leading-relaxed">
              Vente d’iPhone reconditionnés américains à crédit au Burkina Faso. 
              Qualité, transparence et confiance.
            </p>
          </div>

          {/* Liens rapides */}
          <div>
            <h3 className="font-semibold text-lg mb-4">Liens rapides</h3>
            <ul className="space-y-2 text-primary-200">
              <li><Link href="/catalogue" className="hover:text-white transition">Catalogue</Link></li>
              <li><Link href="/comment-ca-marche" className="hover:text-white transition">Comment ça marche</Link></li>
              <li><Link href="/garanties" className="hover:text-white transition">Garanties</Link></li>
              <li><Link href="/contact" className="hover:text-white transition">Contact</Link></li>
            </ul>
          </div>

          {/* Informations */}
          <div>
            <h3 className="font-semibold text-lg mb-4">Informations</h3>
            <ul className="space-y-2 text-primary-200">
              <li><Link href="/login" className="hover:text-white transition">Espace client</Link></li>
              <li><Link href="#" className="hover:text-white transition">Conditions générales</Link></li>
              <li><Link href="#" className="hover:text-white transition">Politique de confidentialité</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold text-lg mb-4">Contact</h3>
            <ul className="space-y-3 text-primary-200">
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-accent-400" />
                <span>+226 XX XX XX XX</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-accent-400" />
                <span>contact@iphonecredit.bf</span>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-accent-400 mt-1" />
                <span>Ouagadougou, Burkina Faso</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bas du footer */}
        <div className="border-t border-primary-700 mt-10 pt-6 text-center text-primary-300 text-sm">
          © {new Date().getFullYear()} iPhone Credit BF. Tous droits réservés.
        </div>
      </div>
    </footer>
  );
}