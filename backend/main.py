from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy import create_engine, Column, Integer, String
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from pydantic import BaseModel
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
def stworz_rezerwacje(req: RezerwacjaCreate, db: Session = Depends(get_db)):
    istniejaca = db.query(RezerwacjaDB).filter(
        RezerwacjaDB.stolik_nr == req.stolik_nr,
        RezerwacjaDB.data_godzina == req.data_godzina
    ).first()

    if istniejaca:
        raise HTTPException(status_code=400, detail="Ten stolik jest już zajęty o tej godzinie!")

    nowa = RezerwacjaDB(klient=req.klient, stolik_nr=req.stolik_nr, data_godzina=req.data_godzina)
    db.add(nowa)
    db.commit()
    db.refresh(nowa)
    return {"status": "Sukces", "id": nowa.id}

@app.get("/rezerwacje")
def lista_rezerwacji(db: Session = Depends(get_db)):
    return db.query(RezerwacjaDB).all()
