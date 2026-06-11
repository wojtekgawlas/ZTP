import json
import pika
from datetime import datetime
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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
        raise HTTPException(status_code=400, detail="Niepoprawny format daty i godziny.")

    godzina = dt.hour
    minuta = dt.minute
    if godzina < 10 or (godzina >= 21 and minuta > 0) or godzina > 21:
        raise HTTPException(status_code=400, detail="Restauracja otwarta 10:00-22:00. Rezerwacja możliwa do 21:00!")

    if minuta % 15 != 0:
        raise HTTPException(status_code=400, detail="Rezerwacja możliwa tylko w blokach co 15 minut!")

    istniejaca_rezerwacja = db.query(RezerwacjaDB).filter(
        RezerwacjaDB.stolik_nr == rezerwacja.stolik_nr,
        RezerwacjaDB.data_godzina == rezerwacja.data_godzina
    ).first()

    if istniejaca_rezerwacja:
        raise HTTPException(status_code=400, detail="Ten stolik jest już zajęty o tej godzinie!")

    nowa_rezerwacja = RezerwacjaDB(
        klient=rezerwacja.klient,
        stolik_nr=rezerwacja.stolik_nr,
        data_godzina=rezerwacja.data_godzina
    )
    db.add(nowa_rezerwacja)
    db.commit()
    db.refresh(nowa_rezerwacja)

    payload_szyny = {
        "id_rezerwacji": nowa_rezerwacja.id,
        "klient": nowa_rezerwacja.klient,
        "stolik_nr": nowa_rezerwacja.stolik_nr,
        "data_godzina": nowa_rezerwacja.data_godzina
    }
    wyslij_na_szyna_rabbitmq(payload_szyny)

    return nowa_rezerwacja
