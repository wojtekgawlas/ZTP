import json
import pika
import requests
from datetime import datetime, timedelta
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import Column, Integer, String, create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session

DATABASE_URL = "postgresql://admin:password123@db-restauracja:5432/rezerwacje_db"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

app = FastAPI()


class RezerwacjaDB(Base):
    __tablename__ = "rezerwacje"
    id = Column(Integer, primary_key=True, index=True)
    klient = Column(String, index=True)
    stolik_nr = Column(Integer)
    data_godzina = Column(String)

Base.metadata.create_all(bind=engine)

from pydantic import BaseModel
class RezerwacjaCreate(BaseModel):
    klient: str
    stolik_nr: int
    data_godzina: str

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def wyslij_log_do_seq(poziom: str, komunikat: str, dane_kontekstowe: dict = None):
    try:
        payload = {
            "Events": [{
                "Timestamp": datetime.utcnow().isoformat() + "Z",
                "Level": poziom,
                "MessageTemplate": komunikat,
                "Properties": dane_kontekstowe or {}
            }]
        }
        requests.post("http://seq:80/api/events/raw?clef", json=payload, timeout=2)
    except Exception as e:
        print(f"[Log BŁĄD] Nie udało się wysłać logu do Seq: {e}")

def wyslij_na_szyna_rabbitmq(dane_rezerwacji: dict):
    try:
        connection = pika.BlockingConnection(pika.ConnectionParameters(host='rabbitmq'))
        channel = connection.channel()
        channel.queue_declare(queue='powiadomienia_rezerwacji', durable=True)
        channel.basic_publish(
            exchange='',
            routing_key='powiadomienia_rezerwacji',
            body=json.dumps(dane_rezerwacji),
            properties=pika.BasicProperties(delivery_mode=2)
        )
        connection.close()
        print("[RabbitMQ] Pomyślnie wysłano zdarzenie rezerwacji na szynę!")
    except Exception as e:
        print(f"[RabbitMQ BŁĄD] Nie udało się przekazać wiadomości na szynę: {e}")

@app.get("/rezerwacje/")
def lista_rezerwacji(db: Session = Depends(get_db)):
    return db.query(RezerwacjaDB).all()

@app.post("/rezerwacje/")
@app.post("/rezerwacje")
def create_reservation(rezerwacja: RezerwacjaCreate, db: Session = Depends(get_db)):
    try:
        dt = datetime.fromisoformat(rezerwacja.data_godzina.replace("Z", ""))
    except Exception:
        wyslij_log_do_seq("Error", "Nieudana próba rezerwacji - zły format daty", {"klient": rezerwacja.klient})
        raise HTTPException(status_code=400, detail="Niepoprawny format daty i godziny.")

    godzina = dt.hour
    minuta = dt.minute
    if godzina < 10 or (godzina >= 21 and minuta > 0) or godzina > 21:
        wyslij_log_do_seq("Warning", "Odrzucono rezerwację - restauracja zamknięta", {"godzina": godzina, "klient": rezerwacja.klient})
        raise HTTPException(status_code=400, detail="Restauracja otwarta 10:00-22:00. Rezerwacja możliwa do 21:00!")

    if minuta % 15 != 0:
        raise HTTPException(status_code=400, detail="Rezerwacja możliwa tylko w blokach co 15 minut!")

    # Sprawdzenie 2-godzinnego okna rezerwacji
    czas_konca_rezerwacji = dt + timedelta(hours=2)
    
    # Szukamy wszystkich rezerwacji, które mogą kolidować z naszym 2-godzinnym oknem
    rezerwacje_kolidujace = db.query(RezerwacjaDB).filter(
        RezerwacjaDB.stolik_nr == rezerwacja.stolik_nr
    ).all()
    
    for rez in rezerwacje_kolidujace:
        try:
            rez_start = datetime.fromisoformat(rez.data_godzina.replace("Z", ""))
            rez_koniec = rez_start + timedelta(hours=2)
            
            # Sprawdzamy czy nowa rezerwacja zachodzi na istniejącą
            if not (czas_konca_rezerwacji <= rez_start or dt >= rez_koniec):
                wyslij_log_do_seq("Warning", "Odrzucono rezerwację - stolik zajęty", {"stolik_nr": rezerwacja.stolik_nr, "data": rezerwacja.data_godzina})
                raise HTTPException(status_code=400, detail="Ten stolik jest już zajęty w wybranym przedziale czasowym!")
        except HTTPException:
            raise
        except Exception:
            continue

    nowa_rezerwacja = RezerwacjaDB(
        klient=rezerwacja.klient,
        stolik_nr=rezerwacja.stolik_nr,
        data_godzina=rezerwacja.data_godzina
    )
    db.add(nowa_rezerwacja)
    db.commit()
    db.refresh(nowa_rezerwacja)


    wyslij_log_do_seq("Information", "Nowa rezerwacja stolika zapisana w systemie", {
        "id_rezerwacji": nowa_rezerwacja.id,
        "klient": nowa_rezerwacja.klient,
        "stolik_nr": nowa_rezerwacja.stolik_nr
    })

    payload_szyny = {
        "id_rezerwacji": nowa_rezerwacja.id,
        "klient": nowa_rezerwacja.klient,
        "stolik_nr": nowa_rezerwacja.stolik_nr,
        "data_godzina": nowa_rezerwacja.data_godzina
    }
    wyslij_na_szyna_rabbitmq(payload_szyny)

    return nowa_rezerwacja


@app.get("/dostepnosc-stolikow/")
def dostepnosc_stolikow(data: str, godzina: str = "10:00", db: Session = Depends(get_db)):
    """
    Zwraca dostępność stolików dla konkretnej daty i godziny.
    Bierze pod uwagę 2-godzinne okno rezerwacji.
    
    Parametry:
    - data: format YYYY-MM-DD
    - godzina: format HH:MM (domyślnie 10:00)
    """
    try:
        # Parsowanie daty i godziny
        dt = datetime.fromisoformat(f"{data}T{godzina}:00")
        czas_konca = dt + timedelta(hours=2)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Niepoprawny format daty lub godziny: {str(e)}")
    
    # Pobranie wszystkich rezerwacji na daną datę
    rezerwacje = db.query(RezerwacjaDB).all()
    
    # Domyślnie wszystkie stoliki (1-11) są wolne
    stolik_ids = list(range(1, 12))
    zajete_stoliki = set()
    
    for rez in rezerwacje:
        try:
            rez_start = datetime.fromisoformat(rez.data_godzina.replace("Z", ""))
            rez_koniec = rez_start + timedelta(hours=2)
            
            # Sprawdzamy czy rezerwacja koliduje z naszym przedziałem czasowym
            if not (czas_konca <= rez_start or dt >= rez_koniec):
                zajete_stoliki.add(rez.stolik_nr)
        except Exception:
            continue
    
    # Zwracamy listę stolików z ich statusami
    dostepnosc = {
        "data": data,
        "godzina": godzina,
        "koniec_rezerwacji": czas_konca.strftime("%H:%M"),
        "stoliki": [
            {
                "id": sid,
                "dostepny": sid not in zajete_stoliki
            }
            for sid in stolik_ids
        ]
    }
    
    return dostepnosc
