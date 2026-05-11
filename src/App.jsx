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
  Users,
  Shield,
  Zap,
  Clock,
  History
} from 'lucide-react';

const Feature = ({ icon: Icon, title, description }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    className="p-8 bg-white rounded-[2.5rem] border border-feedy-sand/50 shadow-sm hover:shadow-md transition-shadow group"
  >
    <div className="w-14 h-14 bg-feedy-oat rounded-2xl flex items-center justify-center mb-6 group-hover:bg-feedy-terracotta/10 transition-colors">
      <Icon className="w-7 h-7 text-feedy-forest group-hover:text-feedy-terracotta transition-colors" />
    </div>
    <h3 className="text-xl font-bold mb-3">{title}</h3>
    <p className="text-feedy-forest/60 leading-relaxed">{description}</p>
  </motion.div>
);

export default function App() {
  return (
    <div className="min-h-screen bg-feedy-oat text-feedy-forest selection:bg-feedy-terracotta selection:text-white font-sans">
      {/* NAVIGATION */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-feedy-oat/80 backdrop-blur-xl border-b border-feedy-sand/30">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-feedy-forest p-1.5 rounded-xl rotate-3">
              <img src="/logo_feedy.png" alt="Feedy" className="w-8 h-8 object-contain" />
            </div>
            <span className="text-2xl font-black tracking-tighter uppercase">feedy<span className="text-feedy-terracotta">.</span></span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-bold">
            <a href="#features" className="hover:text-feedy-terracotta transition-colors">Concept</a>
            <a href="#how-it-works" className="hover:text-feedy-terracotta transition-colors">Fonctionnement</a>
            <a href="/feedy.apk" className="px-6 py-3 bg-feedy-forest text-white rounded-full hover:bg-feedy-forest/90 transition-all shadow-lg shadow-feedy-forest/20">
              Télécharger l'APK
            </a>
          </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="pt-40 pb-20 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-20">
          <div className="flex-1 text-center lg:text-left z-10">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 rounded-full mb-8 border border-emerald-500/20"
            >
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-black text-emerald-600 uppercase tracking-widest">Version Finale Disponible (V1.2)</span>
            </motion.div>
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-6xl md:text-8xl font-black leading-[0.9] mb-8 tracking-tighter"
            >
              Partagez plus, <br />
              <span className="text-feedy-terracotta italic font-medium">sauvez tout.</span>
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xl text-feedy-forest/60 mb-12 max-w-xl mx-auto lg:mx-0 leading-relaxed font-medium"
            >
              L'application de quartier qui automatise la solidarité. Donnez en un clic, recevez en temps réel, et sauvez la planète une assiette à la fois.
            </motion.p>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center gap-6 justify-center lg:justify-start"
            >
              <a href="/feedy.apk" className="w-full sm:w-auto px-10 py-5 bg-feedy-forest text-white rounded-full font-black text-xl flex items-center justify-center gap-3 hover:scale-105 transition-all shadow-2xl shadow-feedy-forest/40">
                <Smartphone className="w-7 h-7" /> Installer l'APK
              </a>
              <div className="flex flex-col items-start px-2">
                <div className="flex items-center gap-2 text-feedy-forest/30">
                  <Apple className="w-6 h-6" />
                  <span className="font-bold italic">Bientôt sur iOS</span>
                </div>
              </div>
            </motion.div>
          </div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.9, rotate: 5 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ delay: 0.4, type: "spring", damping: 15 }}
            className="flex-1 relative"
          >
            <div className="relative z-10 w-[340px] h-[700px] mx-auto bg-[#1a1a1a] rounded-[4rem] p-3 shadow-[0_60px_100px_rgba(0,0,0,0.4)] border-[12px] border-[#1a1a1a]">
              {/* Notch */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-[#1a1a1a] rounded-b-3xl z-50" />
              <div className="w-full h-full bg-feedy-oat rounded-[3.2rem] overflow-hidden relative">
                <Simulator />
              </div>
            </div>
            {/* Background Light */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-feedy-terracotta/20 rounded-full blur-[120px] -z-0" />
          </motion.div>
        </div>
      </section>

      {/* CORE INNOVATIONS */}
      <section id="features" className="py-32 px-6 bg-white border-y border-feedy-sand/30">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-16">
            <div className="text-center md:text-left">
              <div className="w-16 h-16 bg-feedy-terracotta text-white rounded-2xl flex items-center justify-center mb-8 mx-auto md:mx-0 shadow-lg shadow-feedy-terracotta/30">
                <Zap className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-black mb-4 uppercase tracking-tight">Stock Intelligent</h3>
              <p className="text-feedy-forest/60 leading-relaxed font-medium">Fini les erreurs. L'application déduit automatiquement les portions de vos dons au fur et à mesure des réservations.</p>
            </div>
            <div className="text-center md:text-left">
              <div className="w-16 h-16 bg-feedy-forest text-white rounded-2xl flex items-center justify-center mb-8 mx-auto md:mx-0 shadow-lg shadow-feedy-forest/30">
                <History className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-black mb-4 uppercase tracking-tight">Cycle 24h Fraîcheur</h3>
              <p className="text-feedy-forest/60 leading-relaxed font-medium">Pour garantir la sécurité alimentaire, les annonces expirent et s'effacent automatiquement après 24 heures.</p>
            </div>
            <div className="text-center md:text-left">
              <div className="w-16 h-16 bg-emerald-500 text-white rounded-2xl flex items-center justify-center mb-8 mx-auto md:mx-0 shadow-lg shadow-emerald-500/30">
                <Shield className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-black mb-4 uppercase tracking-tight">Score Réciprocité</h3>
              <p className="text-feedy-forest/60 leading-relaxed font-medium">Une communauté basée sur la confiance. Visualisez instantanément les statistiques de dons de vos interlocuteurs.</p>
            </div>
          </div>
        </div>
      </section>

      {/* DETAILED FEATURES */}
      <section className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-24">
            <h2 className="text-5xl font-black mb-6 tracking-tighter uppercase">Plus qu'une application,<br/><span className="text-feedy-terracotta">Un mode de vie.</span></h2>
            <div className="w-24 h-1.5 bg-feedy-terracotta mx-auto rounded-full" />
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <Feature 
              icon={Globe}
              title="Impact Local"
              description="Tri automatique par distance pour trouver la nourriture la plus proche et réduire votre empreinte carbone."
            />
            <Feature 
              icon={Smartphone}
              title="Mode Éclair"
              description="Swipez les dons d'urgence autour de vous pour une expérience ludique et ultra-rapide."
            />
            <Feature 
              icon={Clock}
              title="Notifications Pulsées"
              description="Ne ratez jamais un message grâce à notre interface qui pulse lors des nouvelles interactions."
            />
          </div>
        </div>
      </section>

      {/* DOWNLOAD FINAL CALL */}
      <section id="download" className="pb-32 px-6">
        <div className="max-w-6xl mx-auto bg-feedy-forest rounded-[5rem] p-12 md:p-24 text-center text-feedy-oat relative overflow-hidden shadow-[0_40px_80px_rgba(27,60,53,0.3)]">
          <div className="relative z-10">
            <h2 className="text-5xl md:text-7xl font-black mb-8 tracking-tighter">FAITES LE PREMIER PAS.</h2>
            <p className="text-feedy-oat/70 text-xl mb-12 max-w-2xl mx-auto font-medium">
              Téléchargez l'APK finale et rejoignez les milliers de voisins qui ont déjà choisi de ne plus rien gaspiller.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-8 justify-center">
              <a href="/feedy.apk" className="w-full sm:w-auto px-12 py-6 bg-white text-feedy-forest rounded-full font-black text-2xl flex items-center justify-center gap-3 hover:scale-105 transition-all shadow-xl">
                <Download className="w-8 h-8" /> DOWNLOAD APK
              </a>
            </div>
            <div className="mt-12 pt-12 border-t border-feedy-oat/10 flex flex-wrap justify-center gap-12 opacity-50">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5" />
                <span className="text-sm font-bold">Sans Publicité</span>
              </div>
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5" />
                <span className="text-sm font-bold">Optimisé Android</span>
              </div>
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                <span className="text-sm font-bold">Communautaire</span>
              </div>
            </div>
          </div>
          {/* Background decoration */}
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-feedy-terracotta/20 rounded-full blur-[100px]" />
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-20 border-t border-feedy-sand/30">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-12">
          <div className="flex items-center gap-3">
            <div className="bg-feedy-forest p-1.5 rounded-lg">
              <img src="/logoFeedy.png" alt="Feedy" className="w-6 h-6 object-contain" />
            </div>
            <span className="text-xl font-black tracking-tighter uppercase">feedy<span className="text-feedy-terracotta">.</span></span>
          </div>
          <div className="flex gap-10 text-feedy-forest/40 text-sm font-bold uppercase tracking-widest">
            <a href="#" className="hover:text-feedy-terracotta transition-colors">Presse</a>
            <a href="#" className="hover:text-feedy-terracotta transition-colors">Légal</a>
            <a href="#" className="hover:text-feedy-terracotta transition-colors">Support</a>
          </div>
          <div className="text-feedy-forest/30 text-sm font-medium italic">
            © 2026 Assiette en + (Feedy). Tous droits sauvés.
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
