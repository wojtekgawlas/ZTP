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
  free: 'Свободен',
  reserved: 'Забронирован',
  busy: 'Занят'
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
      aria-label={`Столик ${table.id}, ${statusText[table.status]}, ${table.seats} места`}
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
          <h1>Выберите столик в кафе</h1>
          <p className="hero__text">
            Нажмите на свободный столик на плане зала, чтобы выбрать место для бронирования.
          </p>
        </div>
        <div className="hero__card">
          <Coffee size={34} />
          <span>Сегодня доступно</span>
          <strong>{availableCount} столиков</strong>
        </div>
      </section>

      <section className="layout">
        <aside className="panel">
          <h2>Параметры</h2>

          <label className="control">
            Количество гостей
            <select value={guestCount} onChange={(event) => setGuestCount(Number(event.target.value))}>
              <option value="1">1 гость</option>
              <option value="2">2 гостя</option>
              <option value="3">3 гостя</option>
              <option value="4">4 гостя</option>
              <option value="5">5 гостей</option>
              <option value="6">6 гостей</option>
              <option value="8">8 гостей</option>
            </select>
          </label>

          <div className="legend">
            <div><span className="dot dot--free" /> Свободен</div>
            <div><span className="dot dot--reserved" /> Забронирован</div>
            <div><span className="dot dot--busy" /> Занят</div>
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
                <p>Вы выбрали</p>
                <h3>Столик №{selectedTable.id}</h3>
                <div className="selected-card__row">
                  <span>{statusIcon[selectedTable.status]} {statusText[selectedTable.status]}</span>
                  <span><Users size={17} /> {selectedTable.seats} мест</span>
                </div>
                <button className="primary-button">Забронировать</button>
                <button className="ghost-button" onClick={() => setSelectedTable(null)}>Снять выбор</button>
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
                <p>Пока столик не выбран</p>
              </motion.div>
            )}
          </AnimatePresence>
        </aside>

        <section className="floor-card">
          <div className="floor-header">
            <div>
              <h2>План зала</h2>
              <p>Окна, барная зона и столики с разной вместимостью</p>
            </div>
            <span className="badge">Live selection</span>
          </div>

          <div className="floor">
            <div className="windows">Окна</div>
            <div className="bar">Бар</div>
            <div className="entrance">Вход</div>
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
