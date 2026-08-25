import { AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { AppDataProvider } from './context/AppDataContext';
import { LandingPage } from './components/LandingPage';
import { TrackerView } from './components/TrackerView';

type View = 'landing' | 'tracker';

function App() {
  const [view, setView] = useState<View>('landing');
  const [initialTab, setInitialTab] = useState<'zoya' | 'abuzar'>('zoya');

  const enterTracker = (tab?: 'zoya' | 'abuzar') => {
    if (tab) setInitialTab(tab);
    setView('tracker');
  };

  return (
    <AppDataProvider>
      <AnimatePresence mode="wait">
        {view === 'landing' ? (
          <LandingPage key="landing" onEnter={enterTracker} />
        ) : (
          <TrackerView
            key="tracker"
            onBack={() => setView('landing')}
            initialTab={initialTab}
          />
        )}
      </AnimatePresence>
    </AppDataProvider>
  );
}

export default App;
