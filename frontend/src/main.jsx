import React, { useMemo, useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Coffee, Users, CheckCircle2, XCircle, Armchair, Sparkles, Calendar, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './styles.css';

const initialTables = [
  {
    id: 1,
    seats: 2,
    status: 'free',
    x: 13,
    y: 18,
    type: 'round',
    color1: '#00D1FF',
    color2: '#0077FF',
    glow: 'rgba(0, 209, 255, 0.35)'
  },
  {
    id: 2,
    seats: 4,
    status: 'free',
    x: 36,
    y: 16,
    type: 'square',
    color1: '#A855F7',
    color2: '#6D28D9',
    glow: 'rgba(168, 85, 247, 0.35)'
  },
  {
    id: 3,
    seats: 2,
    status: 'free',
    x: 61,
    y: 18,
    type: 'round',
    color1: '#FACC15',
    color2: '#F97316',
    glow: 'rgba(250, 204, 21, 0.35)'
  },
  {
    id: 4,
    seats: 6,
    status: 'free',
    x: 82,
    y: 21,
    type: 'wide',
    color1: '#FB7185',
    color2: '#E11D48',
    glow: 'rgba(251, 113, 133, 0.35)'
  },
  {
    id: 5,
    seats: 4,
    status: 'free',
    x: 18,
    y: 48,
    type: 'square',
    color1: '#34D399',
    color2: '#059669',
    glow: 'rgba(52, 211, 153, 0.35)'
  },
  {
    id: 6,
    seats: 2,
    status: 'free',
    x: 44,
    y: 50,
    type: 'round',
    color1: '#F87171',
    color2: '#DC2626',
    glow: 'rgba(248, 113, 113, 0.35)'
  },
  {
    id: 7,
    seats: 4,
    status: 'free',
    x: 66,
    y: 49,
    type: 'square',
    color1: '#22D3EE',
    color2: '#0891B2',
    glow: 'rgba(34, 211, 238, 0.35)'
  },
  {
    id: 8,
    seats: 8,
    status: 'free',
    x: 86,
    y: 54,
    type: 'wide',
    color1: '#F472B6',
    color2: '#DB2777',
    glow: 'rgba(244, 114, 182, 0.35)'
  },
  {
    id: 9,
    seats: 2,
    status: 'free',
    x: 28,
    y: 80,
    type: 'round',
    color1: '#60A5FA',
    color2: '#2563EB',
    glow: 'rgba(96, 165, 250, 0.35)'
  },
  {
    id: 10,
    seats: 4,
    status: 'free',
    x: 56,
    y: 79,
    type: 'square',
    color1: '#FDBA74',
    color2: '#EA580C',
    glow: 'rgba(253, 186, 116, 0.35)'
  },
  {
    id: 11,
    seats: 2,
    status: 'free',
    x: 78,
    y: 82,
    type: 'round',
    color1: '#C084FC',
    color2: '#9333EA',
    glow: 'rgba(192, 132, 252, 0.35)'
  }
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
      style={{
        left: `${table.x}%`,
        top: `${table.y}%`,
        '--table-color-1': table.color1,
        '--table-color-2': table.color2,
        '--table-glow': table.glow
      }}
      onClick={() => !disabled && onSelect(table)}
      disabled={disabled}
      whileHover={!disabled ? { scale: 1.05} : undefined}
      whileTap={!disabled ? { scale: 0.96 } : undefined}
      aria-label={`Stolik ${table.id}, ${statusText[table.status]}, ${table.seats} miejsca`}
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
  const [currentTab, setCurrentTab] = useState("main");
  const [tables, setTables] = useState(initialTables);
  
  // Nowy state dla selekcji dnia i godziny rezerwacji na żywo
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("10:00");
  const [liveAvailability, setLiveAvailability] = useState(null);
  
  // Pobranie dostępności stolików na żywo
const fetchLiveAvailability = async (date, time) => {
  if (!date) return;
  try {
    const res = await fetch(`http://localhost:5000/dostepnosc-stolikow/?data=${date}&godzina=${time}`);
    if (!res.ok) {
      console.error("Błąd odpowiedzi od gateway:", res.status);
      return;
    }

    const data = await res.json();
    setLiveAvailability(data);

    const updatedTables = initialTables.map(table => {
      const stolikInfo = (data && Array.isArray(data.stoliki)) ? data.stoliki.find(s => s.id === table.id) : null;
      return {
        ...table,
        status: stolikInfo && !stolikInfo.dostepny ? 'busy' : 'free'
      };
    });

    setTables(updatedTables);
  } catch (error) {
    console.error("Błąd pobierania dostępności:", error);
  }
};


  
  // Ustalanie dzisiejszej daty i pierwszego dostępnego dnia (dzisiaj lub jutro)
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setSelectedDate(today);
    fetchLiveAvailability(today, "10:00");
  }, []);
  
  // Aktualizacja dostępności gdy zmieni się data lub godzina
  useEffect(() => {
    if (selectedDate) {
      fetchLiveAvailability(selectedDate, selectedTime);
    }
  }, [selectedDate, selectedTime]);

  const [selectedTable, setSelectedTable] = useState(null);
  const [guestCount, setGuestCount] = useState(2);
  const [clientName, setClientName] = useState("");
  
const handleReservation = async () => {
  if (!clientName.trim()) {
    alert("Proszę wpisać imię i nazwisko!");
    return;
  }
  if (!selectedDate) {
    alert("Proszę wybrać dzień rezerwacji w sekcji powyżej!");
    return;
  }
  if (!selectedTable) {
    alert("Proszę najpierw wybrać stolik z planu sali!");
    return;
  }

const payload = {
  klient: clientName,
  stolik_nr: Number(selectedTable.id),
  data_godzina: `${selectedDate} ${selectedTime}`
};



  console.log("Wysyłam payload (czysty):", payload);

  try {
  const response = await fetch("http://localhost:5000/rezerwacje/", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload)
});



    const text = await response.text().catch(() => "");
    let json;
    try { json = JSON.parse(text); } catch(e) { json = null; }

    if (!response.ok) {
      console.error("RESPONSE STATUS:", response.status);
      console.error("RESPONSE TEXT:", text);
      if (json) console.error("RESPONSE JSON:", json);
      alert("Błąd rezerwacji: sprawdź konsolę (422 = walidacja).");
      return;
    }

    alert("Rezerwacja utworzona pomyślnie!");
    setClientName("");
    setSelectedTable(null);
    fetchLiveAvailability(selectedDate, selectedTime);
  } catch (err) {
    console.error("Fetch error:", err);
    alert("Błąd połączenia z serwerem.");
  }
};




  const visibleTables = useMemo(() => {

    return tables.filter((table) => table.seats >= guestCount || table.status !== 'free');
  }, [guestCount, tables]); 

  const availableCount = visibleTables.filter((table) => table.status === 'free').length;

  return (
    <main className="app">
      <nav style={{
        display: 'flex',
        justifyContent: 'center',
        gap: "40px",
        padding: "18px 28px",
        background:  "rgba(255, 255, 255, 0.08)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        borderRadius: "18px",
        border: "1px solid rgba(255, 255, 255, 0.15)",
        margin: "20px auto",
        width: "fit-content",
        boxShadow: "0 8px 25px rgba(0,0,0,0.25)",
        position: 'sticky',
        top: 0,
        zIndex: 9999
      }}>
        <button onClick={() => setCurrentTab("main")} style={{ background: 'none', border: 'none', color: currentTab === 'main' ? '#c084fc' : '#9ca3af', fontSize: '1.05rem', fontWeight: '600', cursor: 'pointer', transition: '0.2s' }}>Strona Główna</button>
        <button onClick={() => setCurrentTab("reservation")} style={{ background: 'none', border: 'none', color: currentTab === 'reservation' ? '#c084fc' : '#9ca3af', fontSize: '1.05rem', fontWeight: '600', cursor: 'pointer', transition: '0.2s' }}>Rezerwacja Stolika</button>
        <button onClick={() => setCurrentTab("contact")} style={{ background: 'none', border: 'none', color: currentTab === 'contact' ? '#c084fc' : '#9ca3af', fontSize: '1.05rem', fontWeight: '600', cursor: 'pointer', transition: '0.2s' }}>Kontakt</button>
      </nav>

{currentTab === "main" && (
  <section
    style={{
      minHeight: "calc(100vh - 120px)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      padding: "40px 20px"
    }}
  >
    <div
      style={{
        maxWidth: "900px",
        textAlign: "center",
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        alignItems: "center", 
        // GLASSMORPHISM PANEL
        background: "rgba(255, 255, 255, 0.08)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        borderRadius: "24px",
        border: "1px solid rgba(255, 255, 255, 0.15)",
        padding: "50px 40px",
        boxShadow: "0 10px 35px rgba(0,0,0,0.35)"
      }}
    >
      <h1 
  style={{
    fontSize: "4rem",
    fontWeight: "800",
    color: "#b388ff",
    marginBottom: "20px",
    display: "block",
    width: "100%",
    textAlign: "center",

  }}
>
CAFE LUMIÈRE
</h1>

<h2
  style={{
    fontSize: "2rem",
    fontWeight: "600",
    color: "#b388ff",
    marginBottom: "30px",
    textShadow: "0 4px 18px rgba(0,0,0,0.45)"
  }}
>
  Witamy w Naszej Restauracji
</h2>


      <p
  style={{
    fontSize: "1.25rem",
    lineHeight: "1.7",
    color: "#b388ff",
    marginBottom: "40px",
    textShadow: "0 3px 12px rgba(0,0,0,0.4)"
  }}
>

        Doświadcz wyjątkowej atmosfery i wyśmienitych dań w naszej eleganckiej kawiarni.
        Rezerwuj stolik teraz i ciesz się niezapomnianą kolacją z rodziną lub przyjaciółmi.
      </p>

      <button
        onClick={() => setCurrentTab("reservation")}
        style={{
          padding: "14px 32px",
          fontSize: "1.2rem",
          fontWeight: "600",
          color: "white",
          background: "linear-gradient(135deg, #7b2ff7, #f107a3)",
          border: "none",
          borderRadius: "14px",
          cursor: "pointer",
          boxShadow: "0 8px 25px rgba(0,0,0,0.35)",
          transition: "0.25s"
        }}
      >
        Zarezerwuj Teraz
      </button>
    </div>
  </section>
)}


      {currentTab === "reservation" && (
        <>
          <section className="hero" style={{ marginBottom: '0' }}>
            <div>
              <p className="eyebrow">Cafe Lumière</p>
              <h1>Wybierz stolik w kawiarni</h1>
              <p className="hero__text">
                Kliknij wolny stolik na planie sali, aby wybrać miejsce do rezerwacji.
              </p>
            </div>

            <div className="hero__card">
              <Coffee size={34} />
              <span>Dostępne</span>
              <strong>{availableCount} stolików</strong>
            </div>
          </section>

          <section className="layout">
            <aside className="panel">
              <h2>Parametry</h2>

              {/* Sekcja: Wybór dnia i godziny na żywo */}
              <div style={{ marginBottom: '20px', padding: '15px', background: 'rgba(192, 132, 252, 0.1)', borderRadius: '8px', border: '1px solid rgba(192, 132, 252, 0.3)' }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', color: '#c084fc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Calendar size={16} /> Widok Rezerwacji na Żywo
                </h3>
                
                <div className="control" style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', fontWeight: '600' }}>
                    Dzień (do 7 dni do przodu):
                  </label>
                  <input 
                    type="date" 
                    value={selectedDate}
                    min={new Date().toISOString().split('T')[0]}
                    max={new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: '6px',
                      border: '1px solid #c084fc',
                      background: '#1a1a2e',
                      color: '#e0e0e0',
                      fontSize: '0.9rem',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                
                <div className="control">
                  <label style={{ display: 'flex', marginBottom: '6px', fontSize: '0.9rem', fontWeight: '600', alignItems: 'center', gap: '6px' }}>
                    <Clock size={14} /> Godzina:
                  </label>
                  <select
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: '6px',
                      border: '1px solid #c084fc',
                      background: '#1a1a2e',
                      color: '#e0e0e0',
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      boxSizing: 'border-box'
                    }}
                  >
                    {(() => {
                      const now = new Date();
                      const currentHour = now.getHours();
                      const currentMinute = now.getMinutes();
                      const isToday = selectedDate === new Date().toISOString().split('T')[0];
                      const allTimes = [];
                      
                      for (let h = 10; h <= 21; h++) {
                        for (let m = 0; m < 60; m += 15) {
                          if (h === 21 && m > 0) break;
                          const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                          if (isToday && (h < currentHour || (h === currentHour && m <= currentMinute))) {
                            continue;
                          }
                          allTimes.push(timeStr);
                        }
                      }
                      
                      return allTimes.map(time => <option key={time} value={time}>{time}</option>);
                    })()}
                  </select>
                </div>
                
                {liveAvailability && (
                  <div style={{ marginTop: '12px', padding: '10px', background: 'rgba(52, 211, 153, 0.1)', borderRadius: '6px', fontSize: '0.85rem', color: '#34d399', textAlign: 'center' }}>
                    ⏰ Rezerwacja od {liveAvailability.godzina} do {liveAvailability.koniec_rezerwacji}
                  </div>
                )}
              </div>

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

                    <div className="control" style={{ marginBottom: '15px' }}>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                        Imię i nazwisko klienta:
                      </label>
                      <input 
                        type="text" 
                        placeholder="np. Jan Kowalski" 
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px',
                          borderRadius: '8px',
                          border: '1px solid #ccc',
                          boxSizing: 'border-box',
                          background: '#fff',
                          color: '#333'
                        }}
                      />
                    </div>

                    <div className="control" style={{ marginBottom: '15px', padding: '12px', background: 'rgba(192, 132, 252, 0.05)', borderRadius: '8px', border: '1px solid rgba(192, 132, 252, 0.2)' }}>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '0.95rem' }}>
                        Rezerwacja:
                      </label>
                      <div style={{ fontSize: '0.9rem', color: '#9ca3af' }}>
                        <div>📅 <strong>{selectedDate || 'Wybierz datę powyżej'}</strong></div>
                        {selectedTime && (
                        <div>⏰ <strong>
                        {selectedTime} – {(() => {
                        const [hours, minutes] = selectedTime.split(':');
                        const end = new Date();
                        end.setHours(parseInt(hours) + 2, parseInt(minutes), 0);
                        return `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`;
                        })()}
                        </strong></div>
)}

                        <div style={{ marginTop: '8px', fontSize: '0.85rem', color: '#34d399' }}>
                          ✓ 2-godzinne okno rezerwacji
                        </div>
                      </div>
                    </div>

                    <button onClick={handleReservation} className="primary-button" style={{ marginBottom: '10px' }}>
                      Zarezerwuj
                    </button>

                    <button className="ghost-button" onClick={() => { setSelectedTable(null); setClientName(""); }}>Wyczyść wybór</button>
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
                  <p>Okna, strefa barowa oraz stoliki o różnych kolorach i liczbie miejsc</p>
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
        </>
      )}

{currentTab === "contact" && (
  <section
    style={{
      minHeight: "calc(100vh - 120px)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      padding: "40px 20px"
    }}
  >
    <div
      style={{
        maxWidth: "1100px",
        width: "100%",
        margin: "0 auto",
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "40px",
        background: "rgba(255, 255, 255, 0.08)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        borderRadius: "24px",
        border: "1px solid rgba(255, 255, 255, 0.15)",
        padding: "50px 40px",
        boxShadow: "0 10px 35px rgba(0,0,0,0.35)"
      }}
    >
      {/* LEWA KOLUMNA */}
      <div style={{ color: "#b388ff", fontSize: "1.2rem", lineHeight: "1.7" }}>
        <h1
          style={{
            fontSize: "3rem",
            fontWeight: "800",
            color: "#b388ff",
            marginBottom: "30px",
            textAlign: "center"
          }}
        >
          Kontakt
        </h1>

        <p><strong>Adres</strong><br/>Cafe Lumière<br/>ul. Słoneczna 15<br/>43-300 Bielsko-Biała</p>

        <p style={{ marginTop: "25px" }}>
          <strong>Telefon</strong><br/>
          Rezerwacje: +48 123 456 789<br/>
          Informacje: +48 123 456 790
        </p>

        <p style={{ marginTop: "25px" }}>
          <strong>Email</strong><br/>
          rezerwacje@cafelumiere.pl<br/>
          info@cafelumiere.pl
        </p>

        <p style={{ marginTop: "25px" }}>
          <strong>Godziny Otwarcia</strong><br/>
          Pon–Pt: 10:00–22:00<br/>
          Sobota: 11:00–23:00<br/>
          Niedziela: 11:00–22:00
        </p>
      </div>

      {/* PRAWA KOLUMNA */}
      <div
        style={{
          borderRadius: "18px",
          overflow: "hidden",
          height: "100%",
          minHeight: "350px"
        }}
      >
        <iframe
          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2560.764!2d19.038!3d49.822!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x471420d4e5f8f0d1%3A0x123456789abcdef!2sBielsko-Biała!5e0!3m2!1spl!2spl!4v1710000000000"
          width="100%"
          height="100%"
          style={{ border: 0 }}
          allowFullScreen=""
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        ></iframe>
      </div>
    </div>
  </section>
)}


    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
