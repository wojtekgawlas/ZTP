from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy import create_engine, Column, Integer, String
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from pydantic import BaseModel
from datetime import datetime
from fastapi import HTTPException
import os

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://admin:P@$$w0rd@db-restauracja:5432/rezerwacje_db")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class RezerwacjaDB(Base):
    __tablename__ = "rezerwacje"
    id = Column(Integer, primary_key=True, index=True)
    klient = Column(String)
    stolik_nr = Column(Integer)
    data_godzina = Column(String)

Base.metadata.create_all(bind=engine)

class RezerwacjaCreate(BaseModel):
    klient: str
    stolik_nr: int
    data_godzina: str

app = FastAPI()
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  
    allow_credentials=True,
    allow_methods=["*"],                      
    allow_headers=["*"],                      
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/")
def read_root():
    return {"message": "System rezerwacji restauracji działa!"}

@app.post("/rezerwacje")
def create_reservation(rezerwacja: RezerwacjaCreate, db: Session = Depends(get_db)):
    try:
        dt = datetime.fromisoformat(rezerwacja.data_godzina.replace("Z", ""))
    except Exception:
        raise HTTPException(status_code=400, detail="Niepoprawny format daty i godziny.")

    godzina = dt.hour
    minuta = dt.minute

    if godzina < 10 or (godzina >= 21 and minuta > 0) or godzina > 21:
        raise HTTPException(
            status_code=400, 
            detail="Restauracja otwarta 10:00-22:00. Rezerwacja możliwa najpóźniej na 21:00!"
        )
    if minuta % 15 != 0:
      raise HTTPException(
          status_code=400, 
          detail="Rezerwacja możliwa tylko w blokach co 15 minut (np. :00, :15, :30, :45)!"
      )

    istniejaca_rezerwacja = db.query(Rezerwacja).filter(
        Rezerwacja.stolik_nr == rezerwacja.stolik_nr,
        Rezerwacja.data_godzina == rezerwacja.data_godzina
    ).first()

    if istniejaca_rezerwacja:
        raise HTTPException(status_code=400, detail="Ten stolik jest już zajęty o tej godzinie!")

    nowa_rezerwacja = Rezerwacja(
        klient=rezerwacja.klient,
        stolik_nr=rezerwacja.stolik_nr,
        data_godzina=rezerwacja.data_godzina
    )
    db.add(nowa_rezerwacja)
    db.commit()
    db.refresh(nowa_rezerwacja)
    return nowa_rezerwacja

@app.get("/rezerwacje/")
def lista_rezerwacji(db: Session = Depends(get_db)):
    return db.query(RezerwacjaDB).all()
