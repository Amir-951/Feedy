import React from 'react';
import Simulator from './Simulator';
import { motion } from 'framer-motion';
import { 
  Download, 
  Apple, 
  Smartphone, 
  Heart, 
  Leaf, 
  ShieldCheck, 
  ChevronRight,
  Globe,
  Star,
  Users
} from 'lucide-react';

const Feature = ({ icon: Icon, title, description }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    className="p-8 bg-white rounded-[2.5rem] border border-feedy-sand/50 shadow-sm hover:shadow-md transition-shadow"
  >
    <div className="w-14 h-14 bg-feedy-oat rounded-2xl flex items-center justify-center mb-6">
      <Icon className="w-7 h-7 text-feedy-forest" />
    </div>
    <h3 className="text-xl font-bold mb-3">{title}</h3>
    <p className="text-feedy-forest/60 leading-relaxed">{description}</p>
  </motion.div>
);

export default function App() {
  return (
    <div className="min-h-screen bg-feedy-oat text-feedy-forest selection:bg-feedy-terracotta selection:text-white">
      {/* NAVIGATION */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-feedy-oat/80 backdrop-blur-xl border-b border-feedy-sand/30">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo_feedy.png" alt="Feedy" className="w-10 h-10 rounded-xl" />
            <span className="text-2xl font-bold tracking-tight">feedy.</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium">
            <a href="#features" className="hover:text-feedy-terracotta transition-colors">Concept</a>
            <a href="#download" className="px-6 py-3 bg-feedy-forest text-white rounded-full hover:bg-feedy-forest/90 transition-all shadow-lg shadow-feedy-forest/20">
              Télécharger
            </a>
          </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="pt-40 pb-20 px-6">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
          <div className="flex-1 text-center lg:text-left">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-feedy-terracotta/10 rounded-full mb-8"
            >
              <Sparkles className="w-4 h-4 text-feedy-terracotta" />
              <span className="text-sm font-bold text-feedy-terracotta uppercase tracking-wider">Bientôt sur les stores</span>
            </motion.div>
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-5xl md:text-7xl font-bold leading-[1.1] mb-8"
            >
              Partagez plus, <br />
              <span className="text-feedy-terracotta italic font-medium">gaspillez moins.</span>
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xl text-feedy-forest/60 mb-12 max-w-xl mx-auto lg:mx-0 leading-relaxed"
            >
              Rejoignez la première communauté solidaire qui lutte contre le gaspillage alimentaire à l'échelle du quartier. Donnez ce que vous avez en trop, récupérez ce dont vous avez besoin.
            </motion.p>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start"
            >
              <a href="#download" className="w-full sm:w-auto px-8 py-4 bg-feedy-forest text-white rounded-full font-bold text-lg flex items-center justify-center gap-3 hover:scale-105 transition-transform shadow-xl shadow-feedy-forest/20">
                <Download className="w-6 h-6" /> Obtenir l'APK (Android)
              </a>
              <div className="flex flex-col items-start px-2">
                <div className="flex items-center gap-2 text-feedy-forest/40">
                  <Apple className="w-6 h-6" />
                  <span className="font-medium italic">iOS (TestFlight)</span>
                </div>
                <span className="text-[10px] text-feedy-forest/30 max-w-[150px] leading-tight">
                  L'installation directe n'est pas possible sur iOS. Rejoignez notre bêta via TestFlight.
                </span>
              </div>
            </motion.div>
          </div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="flex-1 relative"
          >
            <div className="relative z-10 w-[380px] h-[780px] mx-auto bg-feedy-forest rounded-[3.5rem] p-4 shadow-[0_40px_80px_rgba(0,0,0,0.3)] border-[10px] border-feedy-forest">
              <div className="w-full h-full bg-feedy-oat rounded-[2.5rem] overflow-hidden relative">
                <Simulator />
              </div>
            </div>
            {/* Decorative Elements */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-feedy-terracotta/10 rounded-full blur-[100px] -z-0" />
          </motion.div>
        </div>
      </section>

      {/* STATS */}
      <section className="py-20 border-y border-feedy-sand/30 bg-white">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-12 text-center">
          <div>
            <div className="text-4xl font-bold mb-2">5k+</div>
            <div className="text-sm text-feedy-forest/50 uppercase tracking-widest font-bold">Utilisateurs</div>
          </div>
          <div>
            <div className="text-4xl font-bold mb-2">12k</div>
            <div className="text-sm text-feedy-forest/50 uppercase tracking-widest font-bold">Plats sauvés</div>
          </div>
          <div>
            <div className="text-4xl font-bold mb-2">4.9/5</div>
            <div className="text-sm text-feedy-forest/50 uppercase tracking-widest font-bold">Note App</div>
          </div>
          <div>
            <div className="text-4xl font-bold mb-2">0€</div>
            <div className="text-sm text-feedy-forest/50 uppercase tracking-widest font-bold">Coût</div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-bold mb-6">Pourquoi choisir <span className="text-feedy-terracotta">Feedy</span> ?</h2>
            <p className="text-feedy-forest/60 max-w-2xl mx-auto">Plus qu'une application, un mouvement pour une consommation responsable et solidaire.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <Feature 
              icon={Leaf}
              title="Impact Écologique"
              description="Réduisez vos déchets alimentaires et participez activement à la protection de l'environnement."
            />
            <Feature 
              icon={Users}
              title="Lien Social"
              description="Rencontrez vos voisins et créez des liens autour de gestes simples et généreux."
            />
            <Feature 
              icon={ShieldCheck}
              title="Sécurité & Confiance"
              description="Un système de notation et de profils vérifiés pour des échanges en toute sérénité."
            />
          </div>
        </div>
      </section>

      {/* DOWNLOAD SECTION */}
      <section id="download" className="py-32 px-6">
        <div className="max-w-4xl mx-auto bg-feedy-forest rounded-[4rem] p-12 md:p-20 text-center text-feedy-oat relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-4xl md:text-5xl font-bold mb-8">Prêt à faire la différence ?</h2>
            <p className="text-feedy-oat/60 text-lg mb-12 max-w-xl mx-auto">
              Téléchargez la version préliminaire pour Android dès maintenant et commencez à partager.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-6 justify-center">
              <button className="w-full sm:w-auto px-10 py-5 bg-feedy-terracotta text-white rounded-full font-bold text-xl flex items-center justify-center gap-3 hover:scale-105 transition-transform">
                <Smartphone className="w-6 h-6" /> Télécharger l'APK
              </button>
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-2 opacity-50">
                  <Apple className="w-6 h-6" />
                  <span className="font-medium italic">iOS (TestFlight)</span>
                </div>
                <p className="text-[10px] opacity-30 mt-1">S'inscrire à la version bêta</p>
              </div>
            </div>
            <p className="mt-8 text-xs text-feedy-oat/30">Version 1.0.0-beta | Build 2026</p>
          </div>
          {/* Background decoration */}
          <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-feedy-terracotta/20 rounded-full blur-[80px]" />
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-20 border-t border-feedy-sand/30">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-12">
          <div className="flex items-center gap-3">
            <img src="/logo_feedy.png" alt="Feedy" className="w-8 h-8 rounded-lg" />
            <span className="text-xl font-bold tracking-tight">feedy.</span>
          </div>
          <div className="flex gap-8 text-feedy-forest/40 text-sm">
            <a href="#" className="hover:text-feedy-forest">Confidentialité</a>
            <a href="#" className="hover:text-feedy-forest">Conditions</a>
            <a href="#" className="hover:text-feedy-forest">Contact</a>
          </div>
          <div className="text-feedy-forest/30 text-sm italic">
            Fait avec amour pour la planète.
          </div>
        </div>
      </footer>
    </div>
  );
}

const Sparkles = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
);
