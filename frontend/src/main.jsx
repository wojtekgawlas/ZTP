import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Coffee, Users, CheckCircle2, XCircle, Armchair, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './styles.css';

const initialTables = [
  { id: 1, seats: 2, status: 'free', x: 13, y: 18, type: 'round' },
  { id: 2, seats: 4, status: 'free', x: 36, y: 16, type: 'square' },
  { id: 3, seats: 2, status: 'reserved', x: 61, y: 18, type: 'round' },
  { id: 4, seats: 6, status: 'busy', x: 82, y: 21, type: 'wide' },
  { id: 5, seats: 4, status: 'free', x: 18, y: 48, type: 'square' },
  { id: 6, seats: 2, status: 'busy', x: 44, y: 50, type: 'round' },
  { id: 7, seats: 4, status: 'free', x: 66, y: 49, type: 'square' },
  { id: 8, seats: 8, status: 'free', x: 86, y: 54, type: 'wide' },
  { id: 9, seats: 2, status: 'free', x: 28, y: 80, type: 'round' },
  { id: 10, seats: 4, status: 'reserved', x: 56, y: 79, type: 'square' },
  { id: 11, seats: 2, status: 'free', x: 78, y: 82, type: 'round' }
];

const statusText = {
  free: 'Wolny',
  reserved: 'Zarezerwowany',
  busy: 'Zajęty'
};

const statusIcon = {
  free: <CheckCircle2 size={18} />,
  reserved: <Sparkles size={18} />,
  busy: <XCircle size={18} />
};

function TableButton({ table, selected, onSelect }) {
  const disabled = table.status !== 'free';

  return (
    <motion.button
      className={`table table--${table.type} table--${table.status} ${selected ? 'table--selected' : ''}`}
      style={{ left: `${table.x}%`, top: `${table.y}%` }}
      onClick={() => !disabled && onSelect(table)}
      disabled={disabled}
      whileHover={!disabled ? { scale: 1.06, y: -2 } : undefined}
      whileTap={!disabled ? { scale: 0.96 } : undefined}
      aria-label={`Stolik ${table.id}, ${statusText[table.status]}, liczba miejsc: ${table.seats}`}
    >
      <span className="table__number">{table.id}</span>

      <span className="table__chairs table__chairs--top">
        {Array.from({ length: Math.min(table.seats, 4) }).map((_, index) => (
          <Armchair key={`top-${index}`} size={13} />
        ))}
      </span>

      <span className="table__seats">
        <Users size={14} /> {table.seats}
      </span>
    </motion.button>
  );
}

function App() {
  const [selectedTable, setSelectedTable] = useState(null);
  const [guestCount, setGuestCount] = useState(2);

  const visibleTables = useMemo(() => {
    return initialTables.filter((table) => table.seats >= guestCount || table.status !== 'free');
  }, [guestCount]);

  const availableCount = visibleTables.filter((table) => table.status === 'free').length;

  return (
    <main className="app">
      <section className="hero">
        <div>
          <p className="eyebrow">Cafe Lumière</p>
          <h1>Wybierz stolik w kawiarni</h1>
          <p className="hero__text">
            Kliknij wolny stolik na planie sali, aby wybrać miejsce do rezerwacji.
          </p>
        </div>

        <div className="hero__card">
          <Coffee size={34} />
          <span>Dzisiaj dostępne</span>
          <strong>{availableCount} stolików</strong>
        </div>
      </section>

      <section className="layout">
        <aside className="panel">
          <h2>Parametry</h2>

          <label className="control">
            Liczba gości
            <select value={guestCount} onChange={(event) => setGuestCount(Number(event.target.value))}>
              <option value="1">1 gość</option>
              <option value="2">2 gości</option>
              <option value="3">3 gości</option>
              <option value="4">4 gości</option>
              <option value="5">5 gości</option>
              <option value="6">6 gości</option>
              <option value="8">8 gości</option>
            </select>
          </label>

          <div className="legend">
            <div><span className="dot dot--free" /> Wolny</div>
            <div><span className="dot dot--reserved" /> Zarezerwowany</div>
            <div><span className="dot dot--busy" /> Zajęty</div>
          </div>

          <AnimatePresence mode="wait">
            {selectedTable ? (
              <motion.div
                key={selectedTable.id}
                className="selected-card"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
              >
                <p>Wybrano</p>
                <h3>Stolik nr {selectedTable.id}</h3>

                <div className="selected-card__row">
                  <span>{statusIcon[selectedTable.status]} {statusText[selectedTable.status]}</span>
                  <span><Users size={17} /> {selectedTable.seats} miejsc</span>
                </div>

                <button className="primary-button">Zarezerwuj</button>
                <button className="ghost-button" onClick={() => setSelectedTable(null)}>
                  Usuń wybór
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                className="empty-card"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Coffee />
                <p>Nie wybrano jeszcze stolika</p>
              </motion.div>
            )}
          </AnimatePresence>
        </aside>

        <section className="floor-card">
          <div className="floor-header">
            <div>
              <h2>Plan sali</h2>
              <p>Okna, strefa barowa oraz stoliki o różnej liczbie miejsc</p>
            </div>
            <span className="badge">Wybór na żywo</span>
          </div>

          <div className="floor">
            <div className="windows">Okna</div>
            <div className="bar">Bar</div>
            <div className="entrance">Wejście</div>
            <div className="plant plant--one" />
            <div className="plant plant--two" />
            <div className="path path--one" />
            <div className="path path--two" />

            {visibleTables.map((table) => (
              <TableButton
                key={table.id}
                table={table}
                selected={selectedTable?.id === table.id}
                onSelect={setSelectedTable}
              />
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);