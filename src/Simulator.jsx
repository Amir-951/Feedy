import React, { useState, useEffect } from 'react';
import { 
  Home, PlusCircle, User, MapPin, Clock, Search, Utensils, Apple, 
  MessageCircle, Heart, ChevronRight, CheckCircle2, Sparkles, Loader2, 
  X, Inbox, CheckCircle, XCircle, AlertCircle, SlidersHorizontal, Navigation,
  Zap, Flame, Trophy, Gift, Siren, ArrowRight
} from 'lucide-react';

// --- MOCK DATA ---
const INITIAL_DONATIONS = [
  { id: 1, title: 'Lasagnes Maison (Végé)', type: 'plat', description: 'J\'ai cuisiné pour 4 mais nous ne sommes que 2 ce soir ! C\'est tout chaud.', portions: 2, distance: '300m', distKm: 0.3, time: '10 min', timeMins: 10, dietary: ['vegetarien'], image: 'https://images.unsplash.com/photo-1619895092538-128341789043?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', user: 'Sophie M.', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-4.0.3&auto=format&fit=facearea&facepad=2&w=100&h=100&q=80' },
  { id: 2, title: 'Pommes et Bananes', type: 'surplus', description: 'Je pars en week-end ce soir, j\'ai quelques fruits qui vont s\'abîmer.', portions: 'N/A', distance: '1.2km', distKm: 1.2, time: '1h', timeMins: 60, dietary: ['vegetarien', 'vegan', 'halal'], image: 'https://images.unsplash.com/photo-1519999482648-25049ddd37b1?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', user: 'Marc D.', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-4.0.3&auto=format&fit=facearea&facepad=2&w=100&h=100&q=80' },
  { id: 3, title: 'Soupe au Potiron', type: 'plat', description: 'Soupe d\'hiver réconfortante. Idéale pour ce soir.', portions: 3, distance: '800m', distKm: 0.8, time: '2h', timeMins: 120, dietary: ['vegetarien', 'vegan', 'halal'], image: 'https://images.unsplash.com/photo-1547592180-85f173990554?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', user: 'Julie T.', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?ixlib=rb-4.0.3&auto=format&fit=facearea&facepad=2&w=100&h=100&q=80' },
  { id: 4, title: 'Poulet rôti et pommes de terre', type: 'plat', description: 'Il reste une belle cuisse de poulet rôti halal et des pommes de terre.', portions: 1, distance: '2.5km', distKm: 2.5, time: '30 min', timeMins: 30, dietary: ['halal'], image: 'https://images.unsplash.com/photo-1598514982205-f36b96d1e8d4?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', user: 'Karim B.', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=facearea&facepad=2&w=100&h=100&q=80' },
];

const INITIAL_MY_REQUESTS = [
  { id: 101, title: 'Soupe au Potiron', giver: 'Julie T.', status: 'pending', time: 'Aujourd\'hui, 18h30', image: 'https://images.unsplash.com/photo-1547592180-85f173990554?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80' },
  { id: 102, title: 'Yaourts Nature', giver: 'Antoine L.', status: 'accepted', time: 'Aujourd\'hui, 14h00', image: 'https://images.unsplash.com/photo-1555986427-047ce5dfa9a3?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80', exactAddress: '12 Rue des Lilas, Bâtiment B, Franconville' },
];

const callGemini = async (prompt) => {
  return "C'est un excellent don, idéal pour éviter le gaspillage ! N'oubliez pas vos propres contenants.";
};

export default function Simulator() {
  const [activeTab, setActiveTab] = useState('explore');
  const [donations, setDonations] = useState(INITIAL_DONATIONS);
  const [myRequests, setMyRequests] = useState(INITIAL_MY_REQUESTS);
  const [karma, setKarma] = useState(1250);
  
  const [exploreMode, setExploreMode] = useState('list'); 
  const [swipeIndex, setSwipeIndex] = useState(0);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeType, setActiveType] = useState('all');
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [filters, setFilters] = useState({ dietary: [], maxDistance: 10, maxTime: 1440 });

  const [userLocation, setUserLocation] = useState('Franconville');
  const [isLocating, setIsLocating] = useState(false);
  
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState('plat');
  const [newDesc, setNewDesc] = useState('');
  const [newPortions, setNewPortions] = useState('');
  const [newDietary, setNewDietary] = useState([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  
  const [selectedDonation, setSelectedDonation] = useState(null);
  const [requestMessage, setRequestMessage] = useState('');
  const [isEnhancingDesc, setIsEnhancingDesc] = useState(false);

  const showToast = (msg, addKarma = 0) => {
    setToastMsg(msg);
    if (addKarma > 0) setTimeout(() => setKarma(k => k + addKarma), 500);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const filteredDonations = donations.filter(item => {
    const matchSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) || item.description.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchSearch) return false;
    const matchType = activeType === 'all' || item.type === activeType;
    if (!matchType) return false;
    if (filters.dietary.length > 0) {
      const hasAllDietary = filters.dietary.every(d => item.dietary?.includes(d));
      if (!hasAllDietary) return false;
    }
    if (item.distKm > filters.maxDistance) return false;
    if (item.timeMins > filters.maxTime) return false;
    return true;
  });

  const handleAddDonation = (e) => {
    e.preventDefault();
    const newItem = {
      id: Date.now(), title: newTitle, type: newType, description: newDesc, portions: newPortions || 'N/A', distance: 'À 10m', distKm: 0.1, time: 'À l\'instant', timeMins: 0, dietary: newDietary,
      image: newType === 'plat' ? 'https://images.unsplash.com/photo-1498837167922-41cfa6f31027?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80' : 'https://images.unsplash.com/photo-1518843875459-f738682238a6?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
      user: 'Toi (Héros)', avatar: 'https://ui-avatars.com/api/?name=Toi&background=10B981&color=fff'
    };
    setDonations([newItem, ...donations]);
    setShowSuccess(true);
    showToast("+50 Karma ! Merci pour ton geste.", 50);
    
    setNewTitle(''); setNewType('plat'); setNewDesc(''); setNewPortions(''); setNewDietary([]);
    setTimeout(() => { setShowSuccess(false); setActiveTab('profile'); }, 2500);
  };

  const openRequestModal = (item) => {
    setSelectedDonation(item);
    const firstName = item.user.split(' ')[0];
    setRequestMessage(`Salut ${firstName} ! Ce don m'intéresse beaucoup, je peux passer très vite !`);
  };

  const submitRequest = (e) => {
    e.preventDefault();
    const newRequest = { id: Date.now(), title: selectedDonation.title, giver: selectedDonation.user, status: 'pending', time: 'À l\'instant', image: selectedDonation.image };
    setMyRequests([newRequest, ...myRequests]);
    showToast(`🚀 Mission acceptée ! Demande envoyée.`);
    setSelectedDonation(null); setRequestMessage('');
    if(exploreMode === 'swipe') handleSwipeSkip(); 
    else setActiveTab('requests'); 
  };

  const handleEnhanceDescription = async () => {
    if (!newTitle) return showToast("Mets d'abord un titre !");
    setIsEnhancingDesc(true);
    const res = await callGemini("");
    setNewDesc(res);
    setIsEnhancingDesc(false);
  };

  const handleSwipeSkip = () => setSwipeIndex((prev) => prev + 1);

  return (
    <div className="w-full h-full bg-gray-50 overflow-hidden flex flex-col relative text-gray-800 font-sans">
      
      {/* TOAST NOTIFICATION */}
      {toastMsg && (
        <div className="absolute top-10 left-1/2 transform -translate-x-1/2 z-50 bg-gray-900/95 backdrop-blur-md text-white px-4 py-2 rounded-full shadow-2xl text-[10px] font-bold flex items-center gap-2 animate-in slide-in-from-top-5 border border-gray-700">
          {toastMsg.includes('Karma') ? <Flame className="w-3 h-3 text-orange-500" /> : <Zap className="w-3 h-3 text-emerald-400" />}
          {toastMsg}
        </div>
      )}

      {/* HEADER */}
      <header className="bg-white/80 backdrop-blur-xl px-4 pt-8 pb-3 z-30 flex flex-col gap-2 sticky top-0 border-b border-gray-100 shadow-sm shadow-gray-100/50">
        <div className="flex justify-between items-center">
          <div className="flex items-center cursor-pointer active:scale-95 transition-transform" onClick={() => setActiveTab('explore')}>
            <h1 className="text-xl flex items-center font-black tracking-tighter">
              <span className="text-transparent bg-clip-text bg-gradient-to-br from-gray-900 to-gray-600">Assiette</span>
              <span className="mx-1 font-serif italic text-lg text-emerald-400 font-medium">en</span>
              <span className="relative flex items-center justify-center w-[20px] h-[20px] bg-gradient-to-br from-orange-400 to-orange-600 text-white rounded-lg shadow-lg transform rotate-[15deg]">
                 <span className="text-lg font-black leading-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[45%]">+</span>
              </span>
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-full border border-gray-100 shadow-sm">
              <Flame className="w-3 h-3 text-orange-500 fill-orange-500" />
              <span className="font-black text-orange-600 text-[10px]">{karma}</span>
            </div>
            <img src="https://ui-avatars.com/api/?name=Toi&background=10B981&color=fff" alt="Profil" className="w-7 h-7 rounded-full shadow-sm" onClick={() => setActiveTab('profile')} />
          </div>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 overflow-y-auto pb-24 no-scrollbar bg-gray-50/50">
        {activeTab === 'explore' && (
          <div className="p-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="bg-gradient-to-r from-red-500 to-rose-500 text-white p-4 rounded-2xl mb-4 shadow-lg relative overflow-hidden">
              <div className="flex items-center gap-2 mb-1">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                </span>
                <h3 className="font-black uppercase tracking-wider text-[10px]">Mission Sauvetage</h3>
              </div>
              <p className="text-[10px] font-medium leading-tight mb-2 opacity-95"><strong>30 parts de gâteau</strong> d'urgence avant minuit ! (À 2.5km)</p>
              <button className="bg-white/20 backdrop-blur-md text-white border border-white/30 w-full py-2 rounded-lg text-[10px] font-black flex items-center justify-center gap-1 transition-all">
                Je participe <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="flex bg-gray-200/50 p-1 rounded-xl mb-4">
              <button onClick={() => setExploreMode('list')} className={`flex-1 py-1.5 text-[10px] font-black rounded-lg transition-all ${exploreMode === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>Liste</button>
              <button onClick={() => setExploreMode('swipe')} className={`flex-1 py-1.5 text-[10px] font-black rounded-lg transition-all flex items-center justify-center gap-1 ${exploreMode === 'swipe' ? 'bg-emerald-500 text-white shadow-md' : 'text-gray-500'}`}><Zap className="w-3 h-3" /> Éclair</button>
            </div>

            {exploreMode === 'list' ? (
              <div className="space-y-4">
                {filteredDonations.map(item => (
                  <div key={item.id} className="group relative bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100" onClick={() => openRequestModal(item)}>
                    <div className="h-40 w-full relative">
                      <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-gray-900/90 via-transparent to-transparent"></div>
                      <div className="absolute bottom-2 left-3 right-3">
                        <h3 className="font-black text-sm text-white leading-tight mb-1">{item.title}</h3>
                        <div className="flex justify-between items-center">
                          <div className="flex gap-2">
                             <span className="text-[8px] text-gray-300 flex items-center gap-0.5"><MapPin className="w-2 h-2"/> {item.distance}</span>
                             <span className="text-[8px] text-gray-300 flex items-center gap-0.5"><Clock className="w-2 h-2"/> {item.time}</span>
                          </div>
                          {item.portions !== 'N/A' && <span className="bg-white/20 text-white text-[8px] font-black px-1.5 py-0.5 rounded shadow-sm">{item.portions} pers.</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col h-[50vh] relative animate-in zoom-in-95">
                {swipeIndex >= filteredDonations.length ? (
                  <div className="flex-1 bg-white rounded-2xl flex flex-col items-center justify-center p-6 text-center border-2 border-dashed border-gray-200">
                    <CheckCircle2 className="w-10 h-10 text-emerald-300 mb-2" />
                    <h3 className="text-sm font-black mb-1">Tu as tout vu !</h3>
                    <button onClick={() => {setSwipeIndex(0); setExploreMode('list')}} className="mt-4 bg-gray-900 text-white px-4 py-2 rounded-lg text-xs font-bold">Retour</button>
                  </div>
                ) : (
                  <div className="flex-1 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden relative flex flex-col">
                    <div className="h-[50%] relative">
                      <img src={filteredDonations[swipeIndex].image} className="w-full h-full object-cover" alt="food" />
                      <div className="absolute inset-0 bg-gradient-to-t from-gray-900/90 via-transparent to-transparent"></div>
                    </div>
                    <div className="p-4 flex flex-col flex-1">
                      <h2 className="text-sm font-black mb-2">{filteredDonations[swipeIndex].title}</h2>
                      <p className="text-gray-500 text-[10px] flex-1 line-clamp-3">{filteredDonations[swipeIndex].description}</p>
                      <div className="flex gap-2 mt-4">
                        <button onClick={handleSwipeSkip} className="flex-1 bg-gray-100 text-gray-500 py-2 rounded-lg font-black text-[10px] flex justify-center items-center gap-1">Passer</button>
                        <button onClick={() => openRequestModal(filteredDonations[swipeIndex])} className="flex-1 bg-emerald-500 text-white py-2 rounded-lg font-black text-[10px] flex justify-center items-center gap-1 shadow-md shadow-emerald-200">Sauver</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'give' && (
          <div className="p-4">
            <h2 className="text-xl font-black mb-4">Faire un don</h2>
            {showSuccess ? (
              <div className="bg-emerald-50 p-6 rounded-2xl text-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                <h3 className="text-sm font-black text-emerald-900">Don en ligne !</h3>
              </div>
            ) : (
              <form onSubmit={handleAddDonation} className="space-y-4">
                <input required type="text" placeholder="Titre..." className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs font-bold outline-none" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
                <textarea required rows="3" placeholder="Détails..." className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none resize-none" value={newDesc} onChange={(e) => setNewDesc(e.target.value)}></textarea>
                <button type="submit" className="w-full bg-gray-900 text-white font-black text-xs rounded-lg py-3">Publier</button>
              </form>
            )}
          </div>
        )}

        {activeTab === 'requests' && (
          <div className="p-4">
            <h2 className="text-xl font-black mb-4">Missions</h2>
            <div className="space-y-3">
              {myRequests.map(req => (
                <div key={req.id} className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex gap-3">
                  <img src={req.image} alt={req.title} className="w-12 h-12 rounded-lg object-cover" />
                  <div className="flex-1">
                    <h3 className="font-bold text-[10px] leading-tight">{req.title}</h3>
                    <p className="text-[8px] text-gray-500">{req.giver}</p>
                    <span className={`text-[8px] font-black uppercase ${req.status === 'pending' ? 'text-orange-500' : 'text-emerald-500'}`}>{req.status === 'pending' ? 'En attente' : 'Accepté'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="p-4">
            <div className="bg-gray-900 rounded-2xl p-4 text-white shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <img src="https://ui-avatars.com/api/?name=Toi&background=10B981&color=fff&size=100" alt="Profil" className="w-12 h-12 rounded-full border-2 border-emerald-400/50" />
                <div>
                  <h2 className="text-lg font-black leading-tight">Mon Profil</h2>
                  <p className="text-emerald-400 font-bold text-[8px] uppercase">Héros Lvl. 5</p>
                </div>
              </div>
              <div className="bg-white/10 rounded-xl p-3">
                <div className="flex justify-between items-end">
                  <span className="text-gray-400 text-[10px] font-bold">Karma</span>
                  <span className="text-2xl font-black text-orange-400">{karma}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* NAVIGATION */}
      <nav className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[80%] bg-white/90 backdrop-blur-xl border border-gray-100 rounded-full px-6 py-2 flex justify-between items-center shadow-lg z-50">
        <button onClick={() => setActiveTab('explore')} className={`transition-all ${activeTab === 'explore' ? 'text-emerald-500 scale-110' : 'text-gray-400'}`}><Home className="w-5 h-5" /></button>
        <button onClick={() => setActiveTab('give')} className="bg-emerald-500 text-white w-10 h-10 rounded-full flex items-center justify-center -mt-8 shadow-lg shadow-emerald-200 border-4 border-gray-50"><PlusCircle className="w-6 h-6" /></button>
        <button onClick={() => setActiveTab('requests')} className={`transition-all ${activeTab === 'requests' ? 'text-emerald-500 scale-110' : 'text-gray-400'}`}><Inbox className="w-5 h-5" /></button>
      </nav>

      {/* MODAL */}
      {selectedDonation && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-gray-900/40 backdrop-blur-sm p-4" onClick={() => setSelectedDonation(null)}>
          <div className="bg-white w-full rounded-2xl p-4 shadow-2xl relative animate-in slide-in-from-bottom-full" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-black mb-4">Sauver ce plat</h2>
            <textarea required rows="2" className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none mb-4" value={requestMessage} onChange={(e) => setRequestMessage(e.target.value)}></textarea>
            <button onClick={submitRequest} className="w-full bg-emerald-500 text-white font-black text-sm rounded-lg py-3 shadow-lg shadow-emerald-500/20">Envoyer 🚀</button>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
}
